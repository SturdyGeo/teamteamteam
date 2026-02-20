import type { Ticket } from "../entities/ticket.js";
import type { WorkflowColumn } from "../entities/workflow-column.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";
import { getInitialColumn } from "../rules/columns.js";

export interface CreateTicketInput {
  readonly id: string;
  readonly project_id: string;
  readonly number: number;
  readonly title: string;
  readonly description?: string;
  readonly assignee_id?: string | null;
  readonly reporter_id: string;
  readonly tags?: string[];
  readonly now: string;
}

export function createTicket(
  input: CreateTicketInput,
  columns: WorkflowColumn[],
): CommandResult<Ticket> {
  const title = input.title.trim();
  if (!title) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.INVALID_INPUT,
      "Title must not be empty",
    );
  }

  if (columns.length === 0) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.INVALID_INPUT,
      "At least one workflow column is required",
    );
  }

  const initialColumn = getInitialColumn(columns);

  const ticket: Ticket = {
    id: input.id,
    project_id: input.project_id,
    number: input.number,
    title,
    description: input.description ?? "",
    status_column_id: initialColumn.id,
    assignee_id: input.assignee_id ?? null,
    reporter_id: input.reporter_id,
    tags: input.tags ?? [],
    created_at: input.now,
    updated_at: input.now,
    closed_at: null,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.reporter_id,
    event_type: "ticket_created",
    payload: {},
  };

  return { data: ticket, events: [event] };
}
