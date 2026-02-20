import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";

export interface AssignTicketInput {
  readonly assignee_id: string | null;
  readonly actor_id: string;
  readonly now: string;
}

export function assignTicket(
  ticket: Ticket,
  input: AssignTicketInput,
): CommandResult<Ticket> {
  if (ticket.assignee_id === input.assignee_id) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.SAME_ASSIGNEE,
      "Ticket is already assigned to this user",
    );
  }

  const updated: Ticket = {
    ...ticket,
    assignee_id: input.assignee_id,
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "assignee_changed",
    payload: {
      from_assignee_id: ticket.assignee_id,
      to_assignee_id: input.assignee_id,
    },
  };

  return { data: updated, events: [event] };
}
