import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@teamteamteam/api-client/web";
import type { ActivityEventWithActor, MemberWithUser } from "@teamteamteam/api-client";
import type { Ticket, WorkflowColumn } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { StateCard } from "@/components/ui/state-card";
import {
  useAddTagMutation,
  useAssignTicketMutation,
  useCloseTicketMutation,
  useRemoveTagMutation,
  useReopenTicketMutation,
  useTicketActivityQuery,
  useTicketDetailQuery,
  useUpdateTicketMutation,
} from "@/features/projects/hooks";
import { ticketsForColumn } from "@/features/projects/selectors";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
  projectId: string;
  projectName: string;
  projectPrefix: string;
  columns: WorkflowColumn[];
  tickets: Ticket[];
  members: MemberWithUser[];
  isBoardLoading: boolean;
  boardErrorMessage: string | null;
  isMovePending: boolean;
  isCreatePending: boolean;
  onTicketMove: (ticketId: string, toColumnId: string) => Promise<void>;
  onTicketCreate: (
    toColumnId: string,
    title: string,
    description: string,
    tags: string[],
  ) => Promise<void>;
}

type TicketWithPriority = Ticket & { priority?: string };

function ticketPriority(ticket: Ticket): string | null {
  const value = (ticket as TicketWithPriority).priority;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

function toTicketUpdateMessage(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 404) {
    return "Ticket edit endpoint not found on deployed API. Run `doppler run -- bun run build:edge` and `doppler run -- supabase functions deploy api`.";
  }

  if (
    error instanceof ApiError &&
    error.code === "DB_ERROR" &&
    error.message.toLowerCase().includes("activity_event_type")
  ) {
    return "Database is missing the `ticket_updated` activity migration. Run `doppler run -- supabase db push`.";
  }

  return toMessage(error);
}

function formatActivityText(
  event: ActivityEventWithActor,
  assigneeById: Map<string, string>,
): string {
  switch (event.event_type) {
    case "ticket_created":
      return "created this ticket";
    case "status_changed":
      return "moved this ticket";
    case "assignee_changed": {
      const toAssignee = event.payload.to_assignee_id;
      return toAssignee ? `assigned to ${assigneeById.get(toAssignee) ?? "user"}` : "unassigned ticket";
    }
    case "ticket_updated":
      return "updated ticket details";
    case "tag_added":
      return `added tag ${event.payload.tag}`;
    case "tag_removed":
      return `removed tag ${event.payload.tag}`;
    case "ticket_closed":
      return "closed this ticket";
    case "ticket_reopened":
      return "reopened this ticket";
    default:
      return "updated this ticket";
  }
}

export function ProjectPage({
  projectId,
  projectName,
  projectPrefix,
  columns,
  tickets,
  members,
  isBoardLoading,
  boardErrorMessage,
  isMovePending,
  isCreatePending,
  onTicketMove,
  onTicketCreate,
}: ProjectPageProps): React.JSX.Element {
  const [boardTickets, setBoardTickets] = useState<Ticket[]>(tickets);
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigneeMenuTicketId, setAssigneeMenuTicketId] = useState<string | null>(null);
  const [assigneeMenuSearch, setAssigneeMenuSearch] = useState("");
  const [createModalColumnId, setCreateModalColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [newCardTags, setNewCardTags] = useState("");

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const lastDragAtRef = useRef<number>(0);
  const initializedTicketIdRef = useRef<string | null>(null);

  const ticketDetailQuery = useTicketDetailQuery(selectedTicketId, Boolean(selectedTicketId));
  const ticketActivityQuery = useTicketActivityQuery(selectedTicketId, Boolean(selectedTicketId));
  const updateMutation = useUpdateTicketMutation(projectId);
  const assignMutation = useAssignTicketMutation(projectId);
  const closeMutation = useCloseTicketMutation(projectId);
  const reopenMutation = useReopenTicketMutation(projectId);
  const addTagMutation = useAddTagMutation(projectId);
  const removeTagMutation = useRemoveTagMutation(projectId);

  useEffect(() => {
    setBoardTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    setModalError(null);
    setNewTagInput("");
    setIsActivityOpen(false);
  }, [selectedTicketId, createModalColumnId]);

  useEffect(() => {
    if (!assigneeMenuTicketId) {
      return;
    }

    function onPointerDown(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.closest("[data-assignee-menu]") || target.closest("[data-assignee-trigger]")) {
        return;
      }

      setAssigneeMenuTicketId(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [assigneeMenuTicketId]);

  const assigneeById = useMemo(
    () => new Map(members.map((member) => [member.user.id, member.user.email])),
    [members],
  );
  const quickAssignMembers = useMemo(() => {
    const query = assigneeMenuSearch.trim().toLowerCase();
    if (!query) {
      return members;
    }

    return members.filter((member) =>
      member.user.email.toLowerCase().includes(query),
    );
  }, [assigneeMenuSearch, members]);

  const totalTickets = boardTickets.length;

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) {
      return null;
    }

    return ticketDetailQuery.data ?? boardTickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  }, [boardTickets, selectedTicketId, ticketDetailQuery.data]);

  useEffect(() => {
    if (selectedTicket && initializedTicketIdRef.current !== selectedTicket.id) {
      setEditTitle(selectedTicket.title);
      setEditDescription(selectedTicket.description ?? "");
      initializedTicketIdRef.current = selectedTicket.id;
      return;
    }

    if (!selectedTicketId) {
      initializedTicketIdRef.current = null;
      setEditTitle("");
      setEditDescription("");
    }
  }, [selectedTicket, selectedTicketId]);

  const createModalColumn = useMemo(() => {
    if (!createModalColumnId) {
      return null;
    }

    return columns.find((column) => column.id === createModalColumnId) ?? null;
  }, [columns, createModalColumnId]);
  const isModalOpen = Boolean(selectedTicketId || createModalColumnId);
  const isCreateModal = Boolean(createModalColumnId);

  const modalBusy =
    updateMutation.isPending ||
    assignMutation.isPending ||
    closeMutation.isPending ||
    reopenMutation.isPending ||
    addTagMutation.isPending ||
    removeTagMutation.isPending ||
    isCreatePending ||
    isMovePending;

  function parseTags(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function openCreateModal(columnId: string): void {
    setSelectedTicketId(null);
    setCreateModalColumnId(columnId);
    setModalError(null);
    setNewCardTitle("");
    setNewCardDescription("");
    setNewCardTags("");
  }

  function closeModal(): void {
    setSelectedTicketId(null);
    setCreateModalColumnId(null);
    setModalError(null);
    setNewTagInput("");
    setNewCardTitle("");
    setNewCardDescription("");
    setNewCardTags("");
    setIsActivityOpen(false);
  }

  function handleCardClick(ticketId: string): void {
    if (Date.now() - lastDragAtRef.current < 200) {
      return;
    }

    setAssigneeMenuTicketId(null);
    setSelectedTicketId(ticketId);
    setModalError(null);
  }

  async function handleDrop(targetColumnId: string): Promise<void> {
    if (!draggingTicketId) {
      return;
    }

    setMoveError(null);
    const previous = boardTickets;
    const source = previous.find((ticket) => ticket.id === draggingTicketId);
    if (!source || source.status_column_id === targetColumnId) {
      setDropTargetColumnId(null);
      setDraggingTicketId(null);
      return;
    }

    setBoardTickets(
      previous.map((ticket) =>
        ticket.id === draggingTicketId
          ? {
              ...ticket,
              status_column_id: targetColumnId,
              updated_at: new Date().toISOString(),
            }
          : ticket,
      ),
    );

    try {
      await onTicketMove(draggingTicketId, targetColumnId);
    } catch (error) {
      setBoardTickets(previous);
      setMoveError(toMessage(error));
    } finally {
      setDropTargetColumnId(null);
      setDraggingTicketId(null);
    }
  }

  async function handleCreateCard(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setModalError(null);

    if (!createModalColumnId) {
      return;
    }

    const title = newCardTitle.trim();
    if (!title) {
      setModalError("Card title is required.");
      return;
    }

    try {
      await onTicketCreate(
        createModalColumnId,
        title,
        newCardDescription,
        parseTags(newCardTags),
      );
      closeModal();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleSaveDetails(): Promise<void> {
    if (!selectedTicket) {
      return;
    }

    setModalError(null);

    const title = editTitle.trim();
    if (!title) {
      setModalError("Title is required.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ticketId: selectedTicket.id,
        input: {
          title,
          description: editDescription,
        },
      });
      await ticketDetailQuery.refetch();
    } catch (error) {
      setModalError(toTicketUpdateMessage(error));
    }
  }

  async function handleQuickAssign(ticketId: string, assigneeId: string | null): Promise<void> {
    setAssignError(null);
    setAssigneeMenuTicketId(null);
    const ticket = boardTickets.find((item) => item.id === ticketId);
    if (ticket && ticket.assignee_id === assigneeId) {
      return;
    }

    try {
      await assignMutation.mutateAsync({
        ticketId,
        assigneeId,
      });
    } catch (error) {
      setAssignError(toMessage(error));
    }
  }

  async function handleAssign(assigneeId: string | null): Promise<void> {
    if (!selectedTicket) {
      return;
    }

    if (selectedTicket.assignee_id === assigneeId) {
      return;
    }

    setModalError(null);

    try {
      await assignMutation.mutateAsync({
        ticketId: selectedTicket.id,
        assigneeId,
      });
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleModalMove(toColumnId: string): Promise<void> {
    if (!selectedTicket || selectedTicket.status_column_id === toColumnId) {
      return;
    }

    setModalError(null);

    try {
      await onTicketMove(selectedTicket.id, toColumnId);
      await ticketDetailQuery.refetch();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleCloseOrReopen(): Promise<void> {
    if (!selectedTicket) {
      return;
    }

    setModalError(null);

    try {
      if (selectedTicket.closed_at) {
        const fallbackColumnId = columns[0]?.id;
        if (!fallbackColumnId) {
          throw new Error("No workflow columns available.");
        }

        await reopenMutation.mutateAsync({
          ticketId: selectedTicket.id,
          toColumnId: fallbackColumnId,
        });
      } else {
        await closeMutation.mutateAsync(selectedTicket.id);
      }

      await ticketDetailQuery.refetch();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleAddTag(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedTicket) {
      return;
    }

    const tag = newTagInput.trim();
    if (!tag) {
      return;
    }

    setModalError(null);

    try {
      await addTagMutation.mutateAsync({
        ticketId: selectedTicket.id,
        tag,
      });
      setNewTagInput("");
      await ticketDetailQuery.refetch();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleRemoveTag(tag: string): Promise<void> {
    if (!selectedTicket) {
      return;
    }

    setModalError(null);

    try {
      await removeTagMutation.mutateAsync({
        ticketId: selectedTicket.id,
        tag,
      });
      await ticketDetailQuery.refetch();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{projectName}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {projectPrefix} · {totalTickets} tickets
            {isMovePending ? " · saving move..." : ""}
            {isCreatePending ? " · adding card..." : ""}
          </p>
        </div>

        {boardErrorMessage ? (
          <StateCard
            title="Board failed to load"
            description={boardErrorMessage}
            tone="destructive"
            className="rounded-[1.75rem] border-border bg-card/95 text-foreground"
          />
        ) : null}

        {moveError ? (
          <StateCard
            title="Move failed"
            description={moveError}
            tone="destructive"
            className="rounded-[1.75rem] border-border bg-card/95 text-foreground"
          />
        ) : null}

        {assignError ? (
          <StateCard
            title="Assign failed"
            description={assignError}
            tone="destructive"
            className="rounded-[1.75rem] border-border bg-card/95 text-foreground"
          />
        ) : null}

        {!boardErrorMessage && isBoardLoading && totalTickets === 0 ? (
          <StateCard
            title="Loading board"
            description="Loading columns and tickets..."
            className="rounded-[1.75rem] border-border bg-card/95 text-foreground"
          />
        ) : null}

        {!boardErrorMessage && columns.length === 0 ? (
          <StateCard
            title="No workflow columns"
            description="Create project columns from the CLI/API first."
            className="rounded-[1.75rem] border-border bg-card/95 text-foreground"
          />
        ) : null}

        {!boardErrorMessage && columns.length > 0 ? (
          <section className="flex snap-x gap-4 overflow-x-auto pb-3">
            {columns.map((column) => {
              const columnTickets = ticketsForColumn(boardTickets, column);
              return (
                <section
                  key={column.id}
                  className={cn(
                    "w-[19rem] shrink-0 snap-start rounded-[1.8rem] border border-border bg-card/95 p-3 shadow-[0_24px_60px_-42px_hsl(var(--background))] backdrop-blur",
                    draggingTicketId ? "ring-1 ring-border/80" : "",
                    dropTargetColumnId === column.id
                      ? "border-primary/80 bg-primary/15 ring-2 ring-primary/80"
                      : "",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggingTicketId && dropTargetColumnId !== column.id) {
                      setDropTargetColumnId(column.id);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(column.id);
                  }}
                >
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-foreground">{column.name}</h2>
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-border bg-background text-foreground hover:bg-background">
                        {columnTickets.length}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openCreateModal(column.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm leading-none text-foreground transition hover:bg-accent"
                        aria-label={`Add card in ${column.name}`}
                      >
                        +
                      </button>
                    </div>
                  </header>

                  <div className="space-y-3">
                    {columnTickets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-center text-xs text-muted-foreground">
                        Drop a ticket here
                      </div>
                    ) : (
                      columnTickets.map((ticket) => {
                        const assignee =
                          ticket.assignee_id === null
                            ? "Unassigned"
                            : (assigneeById.get(ticket.assignee_id) ?? "Unknown assignee");
                        const priority = ticketPriority(ticket);

                        return (
                          <article
                            key={ticket.id}
                            draggable
                            onClick={() => handleCardClick(ticket.id)}
                            onDragStart={(event) => {
                              setDraggingTicketId(ticket.id);
                              setDropTargetColumnId(null);
                              setAssigneeMenuTicketId(null);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", ticket.id);
                            }}
                            onDragEnd={() => {
                              lastDragAtRef.current = Date.now();
                              setDropTargetColumnId(null);
                              setDraggingTicketId(null);
                            }}
                            className={cn(
                              "cursor-grab rounded-2xl border border-border bg-background p-3 text-foreground shadow-[0_12px_35px_-26px_hsl(var(--background))] transition hover:-translate-y-0.5 hover:bg-card active:cursor-grabbing",
                              draggingTicketId === ticket.id ? "opacity-60" : "",
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {projectPrefix}-{ticket.number}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatUpdatedAt(ticket.updated_at)}
                              </span>
                            </div>

                            <p className="mb-3 text-sm font-medium leading-snug">{ticket.title}</p>

                            <div className="flex flex-wrap gap-1.5">
                              {priority ? (
                                <Badge className="rounded-full border border-destructive/60 bg-destructive/20 px-2.5 text-destructive hover:bg-destructive/20">
                                  {priority}
                                </Badge>
                              ) : null}
                              <div className="relative">
                                <button
                                  type="button"
                                  data-assignee-trigger
                                  className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground hover:bg-accent"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setAssigneeMenuTicketId((current) => {
                                      const next = current === ticket.id ? null : ticket.id;
                                      if (next) {
                                        setAssigneeMenuSearch("");
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  {assignee}
                                </button>

                                {assigneeMenuTicketId === ticket.id ? (
                                  <div
                                    data-assignee-menu
                                    className="absolute left-0 top-7 z-30 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <input
                                      value={assigneeMenuSearch}
                                      onChange={(event) => setAssigneeMenuSearch(event.target.value)}
                                      placeholder="Search assignee..."
                                      className="mb-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none focus:border-ring"
                                    />
                                    <button
                                      type="button"
                                      className="mb-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                                      onClick={() => void handleQuickAssign(ticket.id, null)}
                                    >
                                      Nobody
                                    </button>
                                    {quickAssignMembers.map((member) => (
                                      <button
                                        key={member.user.id}
                                        type="button"
                                        className="mb-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                                        onClick={() => void handleQuickAssign(ticket.id, member.user.id)}
                                      >
                                        {member.user.email}
                                      </button>
                                    ))}
                                    {quickAssignMembers.length === 0 ? (
                                      <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No matching members</p>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              {ticket.tags.slice(0, 2).map((item) => (
                                <Badge
                                  key={item}
                                  className="rounded-full border border-secondary bg-secondary/70 px-2.5 text-secondary-foreground hover:bg-secondary/70"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </section>
        ) : null}
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/75 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <section
            className="w-full max-w-3xl rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  {isCreateModal
                    ? `New card${createModalColumn ? ` · ${createModalColumn.name}` : ""}`
                    : (selectedTicket ? `${projectPrefix}-${selectedTicket.number}` : "Ticket")}
                </p>
                <h2 className="text-xl font-semibold">
                  {isCreateModal ? "Create ticket card" : (editTitle || selectedTicket?.title || "Loading ticket...")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
              >
                Close
              </button>
            </header>

            {!isCreateModal && ticketDetailQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading full ticket...</p>
            ) : null}

            {isCreateModal ? (
              <form onSubmit={(event) => void handleCreateCard(event)} className="space-y-4">
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Title</h3>
                  <input
                    value={newCardTitle}
                    onChange={(event) => setNewCardTitle(event.target.value)}
                    placeholder="What needs to be done?"
                    autoFocus
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Description</h3>
                  <textarea
                    value={newCardDescription}
                    onChange={(event) => setNewCardDescription(event.target.value)}
                    placeholder="Add details..."
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Tags</h3>
                  <input
                    value={newCardTags}
                    onChange={(event) => setNewCardTags(event.target.value)}
                    placeholder="bug, urgent, backend"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <label className="block space-y-1 text-xs text-muted-foreground">
                  Column
                  <select
                    value={createModalColumnId ?? ""}
                    className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none"
                    onChange={(event) => setCreateModalColumnId(event.target.value)}
                    disabled={modalBusy}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </label>

                  <button
                    type="submit"
                    disabled={modalBusy}
                    className="h-9 w-full rounded-md border border-primary bg-primary text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isCreatePending ? "Adding..." : "Add card"}
                  </button>
              </form>
            ) : selectedTicket ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveDetails();
                }}
              >
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Title</h3>
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Ticket title"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Description</h3>
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    placeholder="Add details..."
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-1 text-xs text-muted-foreground">
                    Status column
                    <select
                      value={selectedTicket.status_column_id}
                      className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none"
                      onChange={(event) => void handleModalMove(event.target.value)}
                      disabled={modalBusy}
                    >
                      {columns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1 text-xs text-muted-foreground">
                    Assignee
                    <select
                      value={selectedTicket.assignee_id ?? "unassigned"}
                      className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none"
                      onChange={(event) => {
                        const value = event.target.value;
                        void handleAssign(value === "unassigned" ? null : value);
                      }}
                      disabled={modalBusy}
                    >
                      <option value="unassigned">Nobody</option>
                      {members.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.email}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Tags</h3>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedTicket.tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tags</p>
                      ) : (
                        selectedTicket.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="rounded-full border border-secondary bg-secondary/70 px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80"
                            onClick={() => void handleRemoveTag(tag)}
                            disabled={modalBusy}
                          >
                            {tag} x
                          </button>
                        ))
                      )}
                    </div>
                    <form onSubmit={(event) => void handleAddTag(event)} className="flex gap-2">
                      <input
                        value={newTagInput}
                        onChange={(event) => setNewTagInput(event.target.value)}
                        placeholder="add tag"
                        className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-ring"
                      />
                      <button
                        type="submit"
                        disabled={modalBusy}
                        className="rounded-md border border-primary bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </section>

                <section>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs text-foreground hover:bg-accent"
                    onClick={() => setIsActivityOpen((current) => !current)}
                    aria-expanded={isActivityOpen}
                  >
                    <span>{isActivityOpen ? "Hide activity" : "Review activity"}</span>
                    <span aria-hidden>{isActivityOpen ? "▴" : "▾"}</span>
                  </button>
                  {isActivityOpen ? (
                    <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-border bg-background p-3">
                      {ticketActivityQuery.isPending ? (
                        <p className="text-xs text-muted-foreground">Loading activity...</p>
                      ) : ticketActivityQuery.data && ticketActivityQuery.data.length > 0 ? (
                        <div className="space-y-2">
                          {ticketActivityQuery.data.map((event) => (
                            <article key={event.id} className="text-xs text-foreground">
                              <p>
                                <span className="text-muted-foreground">{event.actor.email}</span>{" "}
                                {formatActivityText(event, assigneeById)}
                              </p>
                              <p className="text-muted-foreground">{formatUpdatedAt(event.created_at)}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No activity yet.</p>
                      )}
                    </div>
                  ) : null}
                </section>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={modalBusy}
                    className="h-9 rounded-md border border-primary bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    disabled={modalBusy}
                    onClick={() => void handleCloseOrReopen()}
                    className={cn(
                      "h-9 rounded-md border px-3 text-sm disabled:opacity-50",
                      selectedTicket.closed_at
                        ? "border-primary/60 bg-primary/20 text-primary hover:bg-primary/30"
                        : "border-destructive/60 bg-destructive/20 text-destructive hover:bg-destructive/30",
                    )}
                  >
                    {selectedTicket.closed_at ? "Reopen ticket" : "Close ticket"}
                  </button>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Updated: {formatUpdatedAt(selectedTicket.updated_at)}</p>
                  {selectedTicket.closed_at ? <p>Closed: {formatUpdatedAt(selectedTicket.closed_at)}</p> : null}
                </div>
              </form>
            ) : null}

            {modalError ? <p className="mt-3 text-sm text-destructive">{modalError}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
