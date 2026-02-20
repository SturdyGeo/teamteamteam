import type { Ticket } from "../entities/ticket.js";
import type { WorkflowColumn } from "../entities/workflow-column.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";
import { findColumn } from "../rules/columns.js";

export interface MoveTicketInput {
  readonly to_column_id: string;
  readonly actor_id: string;
  readonly now: string;
}

export function moveTicket(
  ticket: Ticket,
  input: MoveTicketInput,
  columns: WorkflowColumn[],
): CommandResult<Ticket> {
  if (ticket.status_column_id === input.to_column_id) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.SAME_COLUMN,
      "Ticket is already in this column",
    );
  }

  const targetColumn = findColumn(columns, input.to_column_id);
  if (!targetColumn) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.COLUMN_NOT_FOUND,
      "Target column not found",
    );
  }

  const updated: Ticket = {
    ...ticket,
    status_column_id: input.to_column_id,
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "status_changed",
    payload: {
      from_column_id: ticket.status_column_id,
      to_column_id: input.to_column_id,
    },
  };

  return { data: updated, events: [event] };
}
