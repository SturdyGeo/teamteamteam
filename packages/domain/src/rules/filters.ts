import type { Ticket } from "../entities/ticket.js";
import { hasTag } from "./tags.js";

export interface TicketFilters {
  readonly status_column_id?: string;
  readonly assignee_id?: string | null;
  readonly tag?: string;
  readonly search?: string;
}

export function matchesFilters(ticket: Ticket, filters: TicketFilters): boolean {
  if (
    filters.status_column_id !== undefined &&
    ticket.status_column_id !== filters.status_column_id
  ) {
    return false;
  }

  if (
    filters.assignee_id !== undefined &&
    ticket.assignee_id !== filters.assignee_id
  ) {
    return false;
  }

  if (filters.tag !== undefined && !hasTag(ticket.tags, filters.tag)) {
    return false;
  }

  if (filters.search !== undefined && filters.search !== "") {
    const term = filters.search.toLowerCase();
    const inTitle = ticket.title.toLowerCase().includes(term);
    const inDescription = ticket.description.toLowerCase().includes(term);
    if (!inTitle && !inDescription) {
      return false;
    }
  }

  return true;
}

export function filterTickets(
  tickets: Ticket[],
  filters: TicketFilters,
): Ticket[] {
  return tickets.filter((t) => matchesFilters(t, filters));
}

export function mergeFilters(
  ...filters: TicketFilters[]
): TicketFilters {
  const merged: TicketFilters = {};
  for (const f of filters) {
    Object.assign(merged, f);
  }
  return merged;
}
