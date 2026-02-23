import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";

export interface UpdateTicketInput {
  readonly title: string;
  readonly description: string;
  readonly actor_id: string;
  readonly now: string;
}

export function updateTicket(
  ticket: Ticket,
  input: UpdateTicketInput,
): CommandResult<Ticket> {
  const nextTitle = input.title.trim();
  if (!nextTitle) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.INVALID_INPUT,
      "Title must not be empty",
    );
  }

  const nextDescription = input.description;
  if (
    ticket.title === nextTitle &&
    ticket.description === nextDescription
  ) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.INVALID_INPUT,
      "Ticket details are unchanged",
    );
  }

  const updated: Ticket = {
    ...ticket,
    title: nextTitle,
    description: nextDescription,
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "ticket_updated",
    payload: {
      from_title: ticket.title,
      to_title: nextTitle,
      description_changed: ticket.description !== nextDescription,
    },
  };

  return { data: updated, events: [event] };
}
