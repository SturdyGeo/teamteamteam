import { z } from "zod";

const BaseEventSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export const TicketCreatedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("ticket_created"),
  payload: z.object({}),
});

export const StatusChangedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("status_changed"),
  payload: z.object({
    from_column_id: z.string().uuid(),
    to_column_id: z.string().uuid(),
  }),
});

export const AssigneeChangedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("assignee_changed"),
  payload: z.object({
    from_assignee_id: z.string().uuid().nullable(),
    to_assignee_id: z.string().uuid().nullable(),
  }),
});

export const TicketUpdatedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("ticket_updated"),
  payload: z.object({
    from_title: z.string(),
    to_title: z.string(),
    description_changed: z.boolean(),
  }),
});

export const TagAddedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("tag_added"),
  payload: z.object({
    tag: z.string(),
  }),
});

export const TagRemovedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("tag_removed"),
  payload: z.object({
    tag: z.string(),
  }),
});

export const TicketClosedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("ticket_closed"),
  payload: z.object({}),
});

export const TicketReopenedEventSchema = BaseEventSchema.extend({
  event_type: z.literal("ticket_reopened"),
  payload: z.object({
    to_column_id: z.string().uuid(),
  }),
});

export const ActivityEventSchema = z.discriminatedUnion("event_type", [
  TicketCreatedEventSchema,
  StatusChangedEventSchema,
  AssigneeChangedEventSchema,
  TicketUpdatedEventSchema,
  TagAddedEventSchema,
  TagRemovedEventSchema,
  TicketClosedEventSchema,
  TicketReopenedEventSchema,
]);

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type NewActivityEvent = Omit<ActivityEvent, "id" | "created_at">;
