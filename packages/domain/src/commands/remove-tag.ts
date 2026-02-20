import type { Ticket } from "../entities/ticket.js";
import type { NewActivityEvent } from "../entities/activity-event.js";
import type { CommandResult } from "../types/command-result.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../errors/domain-error.js";
import { hasTag, removeTagFromList, normalizeTag } from "../rules/tags.js";

export interface RemoveTagInput {
  readonly tag: string;
  readonly actor_id: string;
  readonly now: string;
}

export function removeTag(
  ticket: Ticket,
  input: RemoveTagInput,
): CommandResult<Ticket> {
  if (!hasTag(ticket.tags, input.tag)) {
    throw new DomainError(
      DOMAIN_ERROR_CODES.TAG_NOT_FOUND,
      "Tag not found on this ticket",
    );
  }

  const normalizedTag = normalizeTag(input.tag);

  const updated: Ticket = {
    ...ticket,
    tags: removeTagFromList(ticket.tags, input.tag),
    updated_at: input.now,
  };

  const event: NewActivityEvent = {
    ticket_id: ticket.id,
    actor_id: input.actor_id,
    event_type: "tag_removed",
    payload: { tag: normalizedTag },
  };

  return { data: updated, events: [event] };
}
