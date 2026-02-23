import type { Ticket, WorkflowColumn } from "@teamteamteam/domain";

export function ticketsForColumn(
  tickets: Ticket[],
  column: WorkflowColumn,
): Ticket[] {
  return tickets.filter((ticket) => ticket.status_column_id === column.id);
}
