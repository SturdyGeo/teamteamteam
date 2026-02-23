import { useEffect, useMemo, useState } from "react";
import type { MemberWithUser } from "@teamteamteam/api-client";
import type { Ticket, WorkflowColumn } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { StateCard } from "@/components/ui/state-card";
import { ticketsForColumn } from "@/features/projects/selectors";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
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

  return "Ticket move failed.";
}

export function ProjectPage({
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
  const [moveError, setMoveError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [composerColumnId, setComposerColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardTags, setNewCardTags] = useState("");

  useEffect(() => {
    setBoardTickets(tickets);
  }, [tickets]);

  const assigneeById = useMemo(
    () => new Map(members.map((member) => [member.user.id, member.user.email])),
    [members],
  );

  const totalTickets = boardTickets.length;

  function parseTags(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function openComposer(columnId: string): void {
    setCreateError(null);
    if (composerColumnId === columnId) {
      setComposerColumnId(null);
      setNewCardTitle("");
      setNewCardTags("");
      return;
    }

    setComposerColumnId(columnId);
    setNewCardTitle("");
    setNewCardTags("");
  }

  async function handleDrop(targetColumnId: string): Promise<void> {
    if (!draggingTicketId) {
      return;
    }

    setMoveError(null);
    const previous = boardTickets;
    const source = previous.find((ticket) => ticket.id === draggingTicketId);
    if (!source || source.status_column_id === targetColumnId) {
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
      setDraggingTicketId(null);
    }
  }

  async function handleCreateCard(
    event: React.FormEvent<HTMLFormElement>,
    columnId: string,
  ): Promise<void> {
    event.preventDefault();
    setCreateError(null);

    const title = newCardTitle.trim();
    if (!title) {
      setCreateError("Card title is required.");
      return;
    }

    try {
      await onTicketCreate(columnId, title, parseTags(newCardTags));
      setComposerColumnId(null);
      setNewCardTitle("");
      setNewCardTags("");
    } catch (error) {
      setCreateError(toMessage(error));
    }
  }

  return (
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

      {createError ? (
        <StateCard
          title="Create card failed"
          description={createError}
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
                )}
                onDragOver={(event) => event.preventDefault()}
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
                      onClick={() => openComposer(column.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-sm leading-none text-zinc-200 transition hover:bg-zinc-800"
                      aria-label={`Add card in ${column.name}`}
                    >
                      +
                    </button>
                  </div>
                </header>

                <div className="space-y-3">
                  {composerColumnId === column.id ? (
                    <form
                      onSubmit={(event) => void handleCreateCard(event, column.id)}
                      className="space-y-2 rounded-2xl border border-zinc-700 bg-zinc-950/80 p-2.5"
                    >
                      <input
                        value={newCardTitle}
                        onChange={(event) => setNewCardTitle(event.target.value)}
                        placeholder="Card title"
                        className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      />
                      <input
                        value={newCardTags}
                        onChange={(event) => setNewCardTags(event.target.value)}
                        placeholder="tags (comma separated)"
                        className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-300 outline-none focus:border-zinc-500"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          onClick={() => openComposer(column.id)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatePending}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {isCreatePending ? "Adding..." : "Add card"}
                        </button>
                      </div>
                    </form>
                  ) : null}

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
                          onDragStart={(event) => {
                            setDraggingTicketId(ticket.id);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", ticket.id);
                          }}
                          onDragEnd={() => setDraggingTicketId(null)}
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
  );
}
