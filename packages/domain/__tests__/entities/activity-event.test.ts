import { describe, it, expect } from "vitest";
import { ActivityEventSchema } from "../../src/entities/activity-event.js";

const base = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  ticket_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  actor_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  created_at: "2024-01-01T00:00:00Z",
};

describe("ActivityEventSchema", () => {
  it("accepts ticket_created event", () => {
    const event = { ...base, event_type: "ticket_created", payload: {} };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts status_changed event", () => {
    const event = {
      ...base,
      event_type: "status_changed",
      payload: {
        from_column_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        to_column_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts assignee_changed event", () => {
    const event = {
      ...base,
      event_type: "assignee_changed",
      payload: {
        from_assignee_id: null,
        to_assignee_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts ticket_updated event", () => {
    const event = {
      ...base,
      event_type: "ticket_updated",
      payload: {
        from_title: "Old title",
        to_title: "New title",
        description_changed: true,
      },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts tag_added event", () => {
    const event = {
      ...base,
      event_type: "tag_added",
      payload: { tag: "bug" },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts tag_removed event", () => {
    const event = {
      ...base,
      event_type: "tag_removed",
      payload: { tag: "bug" },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts ticket_closed event", () => {
    const event = { ...base, event_type: "ticket_closed", payload: {} };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("accepts ticket_reopened event", () => {
    const event = {
      ...base,
      event_type: "ticket_reopened",
      payload: { to_column_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
    };
    expect(ActivityEventSchema.parse(event)).toEqual(event);
  });

  it("rejects unknown event_type", () => {
    expect(() =>
      ActivityEventSchema.parse({
        ...base,
        event_type: "unknown",
        payload: {},
      }),
    ).toThrow();
  });

  it("rejects status_changed with missing payload fields", () => {
    expect(() =>
      ActivityEventSchema.parse({
        ...base,
        event_type: "status_changed",
        payload: {},
      }),
    ).toThrow();
  });

  it("rejects missing event_type", () => {
    expect(() =>
      ActivityEventSchema.parse({ ...base, payload: {} }),
    ).toThrow();
  });
});
