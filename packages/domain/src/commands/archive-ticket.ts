import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";

export interface ArchiveTicketInput {
  readonly actor_id: string;
  readonly now: string;
}

export function archiveTicket(
  ticket: Ticket,
  input: ArchiveTicketInput,
): CommandResult<Ticket> {
  if (ticket.archived_at !== null) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.TICKET_ALREADY_ARCHIVED,
      "Ticket is already archived",
    );
  }

  const updated: Ticket = {
    ...ticket,
    archived_at: input.now,
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "ticket_archived",
    payload: {},
  };

  return { data: updated, events: [event] };
}
