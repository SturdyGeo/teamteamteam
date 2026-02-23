import type { MemberWithUser } from "@teamteamteam/api-client";
import type { Tag, Ticket, WorkflowColumn } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StateCard } from "@/components/ui/state-card";
import { ticketsForColumn } from "@/features/projects/selectors";
import { cn } from "@/lib/utils";

interface StatusOption {
  id: string;
  name: string;
}

interface ProjectPageProps {
  projectName: string;
  projectPrefix: string;
  columns: WorkflowColumn[];
  tickets: Ticket[];
  tags: Tag[];
  members: MemberWithUser[];
  selectedTicket: Ticket | null;
  totalTickets: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  query: string;
  tag: string;
  assigneeId: string;
  statusColumnId: string;
  sort: "priority" | "updated_desc" | "updated_asc" | "title_asc";
  isBoardLoading: boolean;
  boardErrorMessage: string | null;
  isTicketLoading: boolean;
  ticketErrorMessage: string | null;
  statusOptions: StatusOption[];
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: "priority" | "updated_desc" | "updated_asc" | "title_asc") => void;
  onPageSizeChange: (value: number) => void;
  onTicketSelect: (ticketId: string) => void;
  onTicketClose: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

type TicketWithPriority = Ticket & { priority?: string };

function ticketPriority(ticket: Ticket): string | null {
  const value = (ticket as TicketWithPriority).priority;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProjectPage({
  projectName,
  projectPrefix,
  columns,
  tickets,
  tags,
  members,
  selectedTicket,
  totalTickets,
  totalPages,
  currentPage,
  pageSize,
  query,
  tag,
  assigneeId,
  statusColumnId,
  sort,
  isBoardLoading,
  boardErrorMessage,
  isTicketLoading,
  ticketErrorMessage,
  statusOptions,
  onQueryChange,
  onTagChange,
  onAssigneeChange,
  onStatusChange,
  onSortChange,
  onPageSizeChange,
  onTicketSelect,
  onTicketClose,
  onPrevPage,
  onNextPage,
}: ProjectPageProps): React.JSX.Element {
  const assigneeById = new Map(members.map((member) => [member.user.id, member.user.email]));
  const columnById = new Map(columns.map((column) => [column.id, column.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{projectName}</h1>
        <Badge variant="outline">{projectPrefix}</Badge>
        <Badge variant="secondary">{totalTickets} tickets</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Board filters</CardTitle>
          <CardDescription>
            URL-backed filters, sorting, and pagination for project board state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1 xl:col-span-2">
            <Label htmlFor="ticket-query">Search</Label>
            <Input
              id="ticket-query"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Filter by title or description"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-tag">Tag</Label>
            <select
              id="ticket-tag"
              value={tag}
              onChange={(event) => onTagChange(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All tags</option>
              {tags.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-assignee">Assignee</Label>
            <select
              id="ticket-assignee"
              value={assigneeId}
              onChange={(event) => onAssigneeChange(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.user.id}>
                  {member.user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-status">Status</Label>
            <select
              id="ticket-status"
              value={statusColumnId}
              onChange={(event) => onStatusChange(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All columns</option>
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-sort">Sort</Label>
            <select
              id="ticket-sort"
              value={sort}
              onChange={(event) =>
                onSortChange(
                  event.target.value as "priority" | "updated_desc" | "updated_asc" | "title_asc",
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="priority">Domain (default)</option>
              <option value="updated_desc">Updated (newest)</option>
              <option value="updated_asc">Updated (oldest)</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project tags</CardTitle>
          <CardDescription>Normalized tags from the shared domain/API client.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          ) : (
            tags.map((item) => (
              <Badge key={item.id} variant="secondary">
                {item.name}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          {boardErrorMessage ? (
            <StateCard
              title="Board failed to load"
              description={boardErrorMessage}
              tone="destructive"
            />
          ) : null}

          {!boardErrorMessage && isBoardLoading && totalTickets === 0 ? (
            <StateCard title="Loading board" description="Refreshing columns and tickets..." />
          ) : null}

          {!boardErrorMessage && columns.length === 0 ? (
            <StateCard
              title="No workflow columns"
              description="This project has no columns yet. Add columns from the API/CLI first."
            />
          ) : null}

          {!boardErrorMessage && columns.length > 0 && totalTickets === 0 ? (
            <StateCard
              title="No tickets match current filters"
              description="Clear one or more filters to broaden the board view."
            />
          ) : null}

          {!boardErrorMessage && columns.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((column) => {
                const columnTickets = ticketsForColumn(tickets, column);
                return (
                  <Card key={column.id} className="min-h-[16rem]">
                    <CardHeader>
                      <CardTitle className="text-base">{column.name}</CardTitle>
                      <CardDescription>{columnTickets.length} tickets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {columnTickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tickets in this column.</p>
                      ) : (
                        columnTickets.map((ticket) => {
                          const isSelected = selectedTicket?.id === ticket.id;
                          const priority = ticketPriority(ticket);
                          const assignee =
                            ticket.assignee_id !== null
                              ? (assigneeById.get(ticket.assignee_id) ?? "Unknown assignee")
                              : "Unassigned";

                          return (
                            <button
                              key={ticket.id}
                              type="button"
                              className={cn(
                                "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                                isSelected ? "border-primary bg-accent/60" : "",
                              )}
                              onClick={() => onTicketSelect(ticket.id)}
                            >
                              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono">{projectPrefix}-{ticket.number}</span>
                                <Badge variant="outline">{formatUpdatedAt(ticket.updated_at)}</Badge>
                              </div>

                              <p className="mb-2 text-sm font-medium leading-snug">{ticket.title}</p>

                              <div className="flex flex-wrap gap-1">
                                {priority ? (
                                  <Badge variant="secondary">{priority}</Badge>
                                ) : null}
                                <Badge variant="outline">{assignee}</Badge>
                                {ticket.tags.slice(0, 2).map((item) => (
                                  <Badge key={item} variant="secondary">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} · {pageSize} per page
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="ticket-page-size" className="text-xs text-muted-foreground">
                Page size
              </Label>
              <select
                id="ticket-page-size"
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={onPrevPage}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={onNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        <aside className="xl:sticky xl:top-6">
          {isTicketLoading ? (
            <StateCard title="Loading ticket" description="Fetching latest ticket details..." />
          ) : null}

          {!isTicketLoading && ticketErrorMessage ? (
            <StateCard
              title="Ticket failed to load"
              description={ticketErrorMessage}
              tone="destructive"
              action={
                <Button type="button" size="sm" variant="outline" onClick={onTicketClose}>
                  Close panel
                </Button>
              }
            />
          ) : null}

          {!isTicketLoading && !ticketErrorMessage && !selectedTicket ? (
            <StateCard
              title="Ticket detail"
              description="Select a ticket card to open details and project actions."
            />
          ) : null}

          {!isTicketLoading && !ticketErrorMessage && selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{selectedTicket.title}</CardTitle>
                    <CardDescription className="font-mono">
                      {projectPrefix}-{selectedTicket.number}
                    </CardDescription>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={onTicketClose}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {columnById.get(selectedTicket.status_column_id) ?? "Unknown status"}
                  </Badge>
                  <Badge variant="secondary">
                    {selectedTicket.assignee_id === null
                      ? "Unassigned"
                      : (assigneeById.get(selectedTicket.assignee_id) ?? "Unknown assignee")}
                  </Badge>
                  {ticketPriority(selectedTicket) ? (
                    <Badge variant="secondary">{ticketPriority(selectedTicket)}</Badge>
                  ) : null}
                  {selectedTicket.closed_at ? <Badge variant="secondary">Closed</Badge> : null}
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedTicket.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Updated: {formatUpdatedAt(selectedTicket.updated_at)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTicket.tags.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tags</p>
                    ) : (
                      selectedTicket.tags.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Actions (Phase 6)</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled>
                      Move
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled>
                      Assign
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled>
                      Priority
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled>
                      Close/Reopen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
