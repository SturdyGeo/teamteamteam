import { describe, it, expect } from "vitest";
import { removeTag } from "../../src/commands/remove-tag.js";
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
  tags: ["bug", "urgent"],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

describe("removeTag", () => {
  it("removes existing tag", () => {
    const result = removeTag(ticket, {
      tag: "bug",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.tags).not.toContain("bug");
    expect(result.data.tags).toContain("urgent");
    expect(result.data.updated_at).toBe("2024-06-02T12:00:00Z");
  });

  it("removes tag case-insensitively", () => {
    const result = removeTag(ticket, {
      tag: "BUG",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.tags).not.toContain("bug");
  });

  it("produces tag_removed event with normalized tag", () => {
    const result = removeTag(ticket, {
      tag: "BUG",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("tag_removed");
    if (result.events[0].event_type === "tag_removed") {
      expect(result.events[0].payload.tag).toBe("bug");
    }
  });

  it("throws TAG_NOT_FOUND for missing tag", () => {
    expect(() =>
      removeTag(ticket, {
        tag: "nonexistent",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
    try {
      removeTag(ticket, {
        tag: "nonexistent",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      });
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.TAG_NOT_FOUND);
    }
  });

  it("returns new object", () => {
    const result = removeTag(ticket, {
      tag: "bug",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data).not.toBe(ticket);
    expect(result.data.tags).not.toBe(ticket.tags);
  });
});
