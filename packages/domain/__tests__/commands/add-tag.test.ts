import { describe, it, expect } from "vitest";
import { addTag } from "../../src/commands/add-tag.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../../src/errors/domain-error.js";
import type { Ticket } from "../../src/entities/ticket.js";

const ticket: Ticket = {
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Fix the bug",
  description: "",
  status_column_id: "c0000000-0000-0000-0000-000000000001",
  priority: "P1",
  assignee_id: null,
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  tags: ["bug"],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

describe("addTag", () => {
  it("adds new tag", () => {
    const result = addTag(ticket, {
      tag: "feature",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.tags).toContain("feature");
    expect(result.data.updated_at).toBe("2024-06-02T12:00:00Z");
  });

  it("normalizes tag to lowercase", () => {
    const result = addTag(ticket, {
      tag: "FEATURE",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.tags).toContain("feature");
  });

  it("produces tag_added event with normalized tag", () => {
    const result = addTag(ticket, {
      tag: "FEATURE",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("tag_added");
    if (result.events[0].event_type === "tag_added") {
      expect(result.events[0].payload.tag).toBe("feature");
    }
  });

  it("throws TAG_ALREADY_EXISTS for duplicate tag", () => {
    expect(() =>
      addTag(ticket, {
        tag: "bug",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
    try {
      addTag(ticket, {
        tag: "bug",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      });
    } catch (e) {
      expect((e as DomainError).code).toBe(
        DOMAIN_ERROR_CODES.TAG_ALREADY_EXISTS,
      );
    }
  });

  it("throws TAG_ALREADY_EXISTS for case-different duplicate", () => {
    expect(() =>
      addTag(ticket, {
        tag: "BUG",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
  });

  it("returns new object", () => {
    const result = addTag(ticket, {
      tag: "feature",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data).not.toBe(ticket);
    expect(result.data.tags).not.toBe(ticket.tags);
  });
});
