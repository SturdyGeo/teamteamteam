import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";

export interface CloseTicketInput {
  readonly actor_id: string;
  readonly now: string;
}

export function closeTicket(
  ticket: Ticket,
  input: CloseTicketInput,
): CommandResult<Ticket> {
  if (ticket.closed_at !== null) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.TICKET_ALREADY_CLOSED,
      "Ticket is already closed",
    );
  }

  const updated: Ticket = {
    ...ticket,
    closed_at: input.now,
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "ticket_closed",
    payload: {},
  };

  return { data: updated, events: [event] };
}
