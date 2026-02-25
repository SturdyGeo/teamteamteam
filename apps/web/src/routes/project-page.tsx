import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ApiError } from "@teamteamteam/api-client/web";
import type { ActivityEventWithActor, MemberWithUser } from "@teamteamteam/api-client";
import type { Ticket, WorkflowColumn } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { StateCard } from "@/components/ui/state-card";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddTagMutation,
  useAssignTicketMutation,
  useDeleteTicketMutation,
  useRemoveTagMutation,
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
  const [newCardTagInput, setNewCardTagInput] = useState("");
  const [newCardTagsList, setNewCardTagsList] = useState<string[]>([]);

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
  const deleteMutation = useDeleteTicketMutation(projectId);
  const addTagMutation = useAddTagMutation(projectId);
  const removeTagMutation = useRemoveTagMutation(projectId);

  useEffect(() => {
    setBoardTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    setModalError(null);
    setNewTagInput("");
    setNewCardTagInput("");
    setIsActivityOpen(false);
  }, [selectedTicketId, createModalColumnId]);

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
    deleteMutation.isPending ||
    addTagMutation.isPending ||
    removeTagMutation.isPending ||
    isCreatePending ||
    isMovePending;

  function handleAddNewCardTag(): void {
    const tag = newCardTagInput.trim();
    if (!tag || newCardTagsList.includes(tag)) return;
    setNewCardTagsList((prev) => [...prev, tag]);
    setNewCardTagInput("");
  }

  function handleRemoveNewCardTag(tag: string): void {
    setNewCardTagsList((prev) => prev.filter((t) => t !== tag));
  }

  function openCreateModal(columnId: string): void {
    setSelectedTicketId(null);
    setCreateModalColumnId(columnId);
    setModalError(null);
    setNewCardTitle("");
    setNewCardDescription("");
    setNewCardTagInput("");
    setNewCardTagsList([]);
  }

  function closeModal(): void {
    setSelectedTicketId(null);
    setCreateModalColumnId(null);
    setModalError(null);
    setNewTagInput("");
    setNewCardTitle("");
    setNewCardDescription("");
    setNewCardTagInput("");
    setNewCardTagsList([]);
    setIsActivityOpen(false);
  }

  useHotkey("Escape", () => {
    closeModal();
  }, { enabled: isModalOpen });

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

  async function handleCreateCard(): Promise<void> {
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
        newCardTagsList,
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

    const nextDescription = editDescription;
    const currentDescription = selectedTicket.description ?? "";
    if (title === selectedTicket.title && nextDescription === currentDescription) {
      closeModal();
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ticketId: selectedTicket.id,
        input: {
          title,
          description: nextDescription,
        },
      });
      closeModal();
    } catch (error) {
      if (toMessage(error).toLowerCase().includes("ticket details are unchanged")) {
        closeModal();
        return;
      }

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

  async function handleDeleteTicket(): Promise<void> {
    if (!selectedTicket) {
      return;
    }

    setModalError(null);

    const confirmed = window.confirm(
      `Delete ${projectPrefix}-${selectedTicket.number}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedTicket.id);
      closeModal();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleAddTag(): Promise<void> {
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
                    "w-[19rem] shrink-0 snap-start rounded-[1.8rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--background)/0.94)_100%)] p-3 shadow-[0_24px_58px_-42px_hsl(var(--primary)/0.5)] backdrop-blur",
                    draggingTicketId ? "ring-1 ring-border/80" : "",
                    dropTargetColumnId === column.id
                      ? "border-primary/80 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--background)/0.94)_100%)] ring-2 ring-primary/80"
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
                    <h2 className="flex items-center text-sm font-semibold text-foreground">
                      <span
                        className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
                        aria-hidden
                      />
                      {column.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-border bg-background text-foreground hover:bg-background">
                        {columnTickets.length}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openCreateModal(column.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm leading-none text-foreground transition hover:bg-accent"
                        aria-label={`Add card in ${column.name}`}
                      >
                        +
                      </Button>
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
                              "cursor-grab rounded-2xl border border-border/60 bg-background p-3 text-foreground shadow-[0_10px_22px_-20px_hsl(var(--background)/0.85)] transition hover:-translate-y-0.5 hover:bg-card active:cursor-grabbing",
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
                              <Popover
                                open={assigneeMenuTicketId === ticket.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setAssigneeMenuTicketId(ticket.id);
                                    setAssigneeMenuSearch("");
                                    return;
                                  }

                                  if (assigneeMenuTicketId === ticket.id) {
                                    setAssigneeMenuTicketId(null);
                                    setAssigneeMenuSearch("");
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground hover:bg-accent"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {assignee}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="w-56 p-1.5"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Input
                                    value={assigneeMenuSearch}
                                    onChange={(event) => setAssigneeMenuSearch(event.target.value)}
                                    placeholder="Search assignee..."
                                    className="mb-1 h-8 border-border bg-background px-2.5 text-xs text-foreground"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mb-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                                    onClick={() => void handleQuickAssign(ticket.id, null)}
                                  >
                                    Unassigned
                                  </Button>
                                  {quickAssignMembers.map((member) => (
                                    <Button
                                      key={member.user.id}
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="mb-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                                      onClick={() => void handleQuickAssign(ticket.id, member.user.id)}
                                    >
                                      {member.user.email}
                                    </Button>
                                  ))}
                                  {quickAssignMembers.length === 0 ? (
                                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No matching members</p>
                                  ) : null}
                                </PopoverContent>
                              </Popover>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeModal}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
              >
                Close
              </Button>
            </header>

            {isCreateModal ? (
              <div className="space-y-4">
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Title</h3>
                  <Input
                    value={newCardTitle}
                    onChange={(event) => setNewCardTitle(event.target.value)}
                    placeholder="What needs to be done?"
                    autoFocus
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Description</h3>
                  <Textarea
                    value={newCardDescription}
                    onChange={(event) => setNewCardDescription(event.target.value)}
                    placeholder="Add details..."
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Tags</h3>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {newCardTagsList.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tags</p>
                      ) : (
                        newCardTagsList.map((tag) => (
                          <Button
                            key={tag}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="rounded-full border border-secondary bg-secondary/70 px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80"
                            onClick={() => handleRemoveNewCardTag(tag)}
                          >
                            {tag} x
                          </Button>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newCardTagInput}
                        onChange={(event) => setNewCardTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddNewCardTag();
                          }
                        }}
                        placeholder="add tag"
                        className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-ring"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewCardTag()}
                        className="rounded-md border border-primary bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="block space-y-1 text-xs text-muted-foreground">
                  <Label htmlFor="create-card-column" className="text-xs text-muted-foreground">
                    Column
                  </Label>
                  <Select
                    id="create-card-column"
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
                  </Select>
                </div>

                <Button
                  type="button"
                  disabled={modalBusy}
                  onClick={() => void handleCreateCard()}
                  className="h-9 w-full rounded-md border border-primary bg-primary text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatePending ? "Adding..." : "Add card"}
                </Button>
              </div>
            ) : selectedTicket ? (
              <div className="space-y-4">
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Title</h3>
                  <Input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Ticket title"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Description</h3>
                  <Textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    placeholder="Add details..."
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                </section>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="block space-y-1 text-xs text-muted-foreground">
                    <Label htmlFor="ticket-status-column" className="text-xs text-muted-foreground">
                      Status column
                    </Label>
                    <Select
                      id="ticket-status-column"
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
                    </Select>
                  </div>

                  <div className="block space-y-1 text-xs text-muted-foreground">
                    <Label htmlFor="ticket-assignee" className="text-xs text-muted-foreground">
                      Assignee
                    </Label>
                    <Select
                      id="ticket-assignee"
                      value={selectedTicket.assignee_id ?? "unassigned"}
                      className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none"
                      onChange={(event) => {
                        const value = event.target.value;
                        void handleAssign(value === "unassigned" ? null : value);
                      }}
                      disabled={modalBusy}
                    >
                      <option value="unassigned">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.email}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Tags</h3>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedTicket.tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tags</p>
                      ) : (
                        selectedTicket.tags.map((tag) => (
                          <Button
                            key={tag}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="rounded-full border border-secondary bg-secondary/70 px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80"
                            onClick={() => void handleRemoveTag(tag)}
                            disabled={modalBusy}
                          >
                            {tag} x
                          </Button>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTagInput}
                        onChange={(event) => setNewTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAddTag();
                          }
                        }}
                        placeholder="add tag"
                        className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-ring"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={modalBusy}
                        onClick={() => void handleAddTag()}
                        className="rounded-md border border-primary bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={modalBusy}
                    onClick={() => void handleSaveDetails()}
                    className="h-9 rounded-md border border-primary bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    disabled={modalBusy}
                    onClick={() => void handleDeleteTicket()}
                    className="h-9 rounded-md border border-destructive/70 bg-destructive/20 px-3 text-sm text-destructive hover:bg-destructive/30 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete ticket"}
                  </Button>
                </div>

                <section className="space-y-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    onClick={() => setIsActivityOpen((current) => !current)}
                    aria-expanded={isActivityOpen}
                  >
                    <span>{isActivityOpen ? "Hide activity" : "Review activity"}</span>
                    <span aria-hidden>{isActivityOpen ? "▴" : "▾"}</span>
                  </Button>
                  {isActivityOpen ? (
                    <div className="max-h-52 overflow-auto rounded-lg border border-border bg-background p-3">
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

                <div className="text-xs text-muted-foreground">
                  <p>Updated: {formatUpdatedAt(selectedTicket.updated_at)}</p>
                  {selectedTicket.closed_at ? <p>Closed: {formatUpdatedAt(selectedTicket.closed_at)}</p> : null}
                </div>
              </div>
            ) : null}

            {modalError ? <p className="mt-3 text-sm text-destructive">{modalError}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
