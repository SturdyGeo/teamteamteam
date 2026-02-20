import type { Ticket } from "../entities/ticket.js";

export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
