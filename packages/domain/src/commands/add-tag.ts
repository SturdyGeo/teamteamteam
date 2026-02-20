import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";
import { hasTag, addTagToList, normalizeTag } from "../rules/tags.js";

export interface AddTagInput {
  readonly tag: string;
  readonly actor_id: string;
  readonly now: string;
}

export function addTag(
  ticket: Ticket,
  input: AddTagInput,
): CommandResult<Ticket> {
  if (hasTag(ticket.tags, input.tag)) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.TAG_ALREADY_EXISTS,
      "Tag already exists on this ticket",
    );
  }

  const normalizedTag = normalizeTag(input.tag);

  const updated: Ticket = {
    ...ticket,
    tags: addTagToList(ticket.tags, input.tag),
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "tag_added",
    payload: { tag: normalizedTag },
  };

  return { data: updated, events: [event] };
}
