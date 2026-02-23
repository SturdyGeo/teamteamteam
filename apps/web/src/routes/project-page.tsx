import { useEffect, useMemo, useRef, useState } from "react";
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
  onTicketCreate: (toColumnId: string, title: string, tags: string[]) => Promise<void>;
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
  const [createModalColumnId, setCreateModalColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardTags, setNewCardTags] = useState("");

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const lastDragAtRef = useRef<number>(0);

  const ticketDetailQuery = useTicketDetailQuery(selectedTicketId, Boolean(selectedTicketId));
  const ticketActivityQuery = useTicketActivityQuery(selectedTicketId, Boolean(selectedTicketId));
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
  }, [selectedTicketId, createModalColumnId]);

  const assigneeById = useMemo(
    () => new Map(members.map((member) => [member.user.id, member.user.email])),
    [members],
  );

  const totalTickets = boardTickets.length;

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) {
      return null;
    }

    return ticketDetailQuery.data ?? boardTickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  }, [boardTickets, selectedTicketId, ticketDetailQuery.data]);
  const createModalColumn = useMemo(() => {
    if (!createModalColumnId) {
      return null;
    }

    return columns.find((column) => column.id === createModalColumnId) ?? null;
  }, [columns, createModalColumnId]);
  const isModalOpen = Boolean(selectedTicketId || createModalColumnId);
  const isCreateModal = Boolean(createModalColumnId);

  const modalBusy =
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
    setNewCardTags("");
  }

  function closeModal(): void {
    setSelectedTicketId(null);
    setCreateModalColumnId(null);
    setModalError(null);
    setNewTagInput("");
    setNewCardTitle("");
    setNewCardTags("");
  }

  function handleCardClick(ticketId: string): void {
    if (Date.now() - lastDragAtRef.current < 200) {
      return;
    }

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
      await onTicketCreate(createModalColumnId, title, parseTags(newCardTags));
      closeModal();
    } catch (error) {
      setModalError(toMessage(error));
    }
  }

  async function handleAssign(assigneeId: string | null): Promise<void> {
    if (!selectedTicket) {
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
        <div className="rounded-[2rem] border border-zinc-700 bg-zinc-900/95 p-4 shadow-[0_20px_50px_-35px_rgba(0,0,0,1)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{projectName}</h1>
            <Badge className="rounded-full border border-zinc-600 bg-zinc-800 px-3 text-zinc-200 hover:bg-zinc-800">
              {projectPrefix}
            </Badge>
            <Badge className="rounded-full border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-950">
              {totalTickets} tickets
            </Badge>
            {isMovePending ? (
              <Badge className="rounded-full border border-emerald-700 bg-emerald-900/70 px-3 text-emerald-200 hover:bg-emerald-900/70">
                Saving move...
              </Badge>
            ) : null}
            {isCreatePending ? (
              <Badge className="rounded-full border border-sky-700 bg-sky-900/70 px-3 text-sky-200 hover:bg-sky-900/70">
                Adding card...
              </Badge>
            ) : null}
          </div>
        </div>

        {boardErrorMessage ? (
          <StateCard
            title="Board failed to load"
            description={boardErrorMessage}
            tone="destructive"
            className="rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100"
          />
        ) : null}

        {moveError ? (
          <StateCard
            title="Move failed"
            description={moveError}
            tone="destructive"
            className="rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100"
          />
        ) : null}

        {!boardErrorMessage && isBoardLoading && totalTickets === 0 ? (
          <StateCard
            title="Loading board"
            description="Loading columns and tickets..."
            className="rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100"
          />
        ) : null}

        {!boardErrorMessage && columns.length === 0 ? (
          <StateCard
            title="No workflow columns"
            description="Create project columns from the CLI/API first."
            className="rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100"
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
                    "w-[19rem] shrink-0 snap-start rounded-[1.8rem] border border-zinc-700 bg-zinc-900/95 p-3 shadow-[0_24px_60px_-42px_rgba(0,0,0,1)] backdrop-blur",
                    draggingTicketId ? "ring-1 ring-zinc-500/80" : "",
                    dropTargetColumnId === column.id
                      ? "border-sky-500/80 bg-sky-950/30 ring-2 ring-sky-400/90"
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
                    <h2 className="text-sm font-semibold text-zinc-100">{column.name}</h2>
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-950">
                        {columnTickets.length}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openCreateModal(column.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-sm leading-none text-zinc-200 transition hover:bg-zinc-800"
                        aria-label={`Add card in ${column.name}`}
                      >
                        +
                      </button>
                    </div>
                  </header>

                  <div className="space-y-3">
                    {columnTickets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 p-4 text-center text-xs text-zinc-500">
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
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", ticket.id);
                            }}
                            onDragEnd={() => {
                              lastDragAtRef.current = Date.now();
                              setDropTargetColumnId(null);
                              setDraggingTicketId(null);
                            }}
                            className={cn(
                              "cursor-grab rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 shadow-[0_12px_35px_-26px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-zinc-900 active:cursor-grabbing",
                              draggingTicketId === ticket.id ? "opacity-60" : "",
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-zinc-500">
                                {projectPrefix}-{ticket.number}
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                {formatUpdatedAt(ticket.updated_at)}
                              </span>
                            </div>

                            <p className="mb-3 text-sm font-medium leading-snug">{ticket.title}</p>

                            <div className="flex flex-wrap gap-1.5">
                              {priority ? (
                                <Badge className="rounded-full border border-rose-700 bg-rose-900/80 px-2.5 text-rose-200 hover:bg-rose-900/80">
                                  {priority}
                                </Badge>
                              ) : null}
                              <Badge className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 text-zinc-300 hover:bg-zinc-900">
                                {assignee}
                              </Badge>
                              {ticket.tags.slice(0, 2).map((item) => (
                                <Badge
                                  key={item}
                                  className="rounded-full border border-amber-700 bg-amber-900/80 px-2.5 text-amber-200 hover:bg-amber-900/80"
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
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <section
            className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-zinc-500">
                  {isCreateModal
                    ? `New card${createModalColumn ? ` · ${createModalColumn.name}` : ""}`
                    : (selectedTicket ? `${projectPrefix}-${selectedTicket.number}` : "Ticket")}
                </p>
                <h2 className="text-xl font-semibold">
                  {isCreateModal ? "Create ticket card" : (selectedTicket?.title ?? "Loading ticket...")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
            </header>

            {!isCreateModal && ticketDetailQuery.isPending ? (
              <p className="text-sm text-zinc-500">Loading full ticket...</p>
            ) : null}

            {isCreateModal ? (
              <form
                onSubmit={(event) => void handleCreateCard(event)}
                className="grid gap-5 md:grid-cols-[minmax(0,1fr),280px]"
              >
                <div className="space-y-4">
                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-300">Title</h3>
                    <input
                      value={newCardTitle}
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      placeholder="What needs to be done?"
                      className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    />
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-300">Tags</h3>
                    <input
                      value={newCardTags}
                      onChange={(event) => setNewCardTags(event.target.value)}
                      placeholder="bug, urgent, backend"
                      className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Comma-separated tags. You can edit tags later from the same modal.
                    </p>
                  </section>
                </div>

                <aside className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                  <h3 className="text-sm font-semibold text-zinc-300">Create settings</h3>
                  <label className="block space-y-1 text-xs text-zinc-400">
                    Column
                    <select
                      value={createModalColumnId ?? ""}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none"
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
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isCreatePending ? "Adding..." : "Add card"}
                  </button>
                </aside>
              </form>
            ) : selectedTicket ? (
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr),280px]">
                <div className="space-y-4">
                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-300">Description</h3>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200 whitespace-pre-wrap">
                      {selectedTicket.description?.trim() || "No description."}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-300">Tags</h3>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {selectedTicket.tags.length === 0 ? (
                          <p className="text-xs text-zinc-500">No tags</p>
                        ) : (
                          selectedTicket.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="rounded-full border border-amber-700 bg-amber-900/80 px-2.5 py-0.5 text-xs text-amber-200 hover:bg-amber-800"
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
                          className="h-8 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                        />
                        <button
                          type="submit"
                          disabled={modalBusy}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-300">Activity</h3>
                    <div className="max-h-52 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                      {ticketActivityQuery.isPending ? (
                        <p className="text-xs text-zinc-500">Loading activity...</p>
                      ) : ticketActivityQuery.data && ticketActivityQuery.data.length > 0 ? (
                        <div className="space-y-2">
                          {ticketActivityQuery.data.map((event) => (
                            <article key={event.id} className="text-xs text-zinc-300">
                              <p>
                                <span className="text-zinc-400">{event.actor.email}</span>{" "}
                                {formatActivityText(event, assigneeById)}
                              </p>
                              <p className="text-zinc-500">{formatUpdatedAt(event.created_at)}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">No activity yet.</p>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                  <h3 className="text-sm font-semibold text-zinc-300">Quick edit</h3>

                  <label className="block space-y-1 text-xs text-zinc-400">
                    Status column
                    <select
                      value={selectedTicket.status_column_id}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none"
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

                  <label className="block space-y-1 text-xs text-zinc-400">
                    Assignee
                    <select
                      value={selectedTicket.assignee_id ?? "unassigned"}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none"
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
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={modalBusy}
                    onClick={() => void handleCloseOrReopen()}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {selectedTicket.closed_at ? "Reopen ticket" : "Close ticket"}
                  </button>

                  <div className="text-xs text-zinc-500">
                    <p>Updated: {formatUpdatedAt(selectedTicket.updated_at)}</p>
                    {selectedTicket.closed_at ? <p>Closed: {formatUpdatedAt(selectedTicket.closed_at)}</p> : null}
                  </div>
                </aside>
              </div>
            ) : null}

            {modalError ? <p className="mt-3 text-sm text-rose-400">{modalError}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
