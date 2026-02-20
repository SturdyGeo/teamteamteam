import { describe, it, expect } from "vitest";
import { assignTicket } from "../../src/commands/assign-ticket.js";
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
  tags: [],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

describe("assignTicket", () => {
  it("assigns user to ticket", () => {
    const result = assignTicket(ticket, {
      assignee_id: "d0000000-0000-0000-0000-000000000002",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.assignee_id).toBe(
      "d0000000-0000-0000-0000-000000000002",
    );
    expect(result.data.updated_at).toBe("2024-06-02T12:00:00Z");
  });

  it("unassigns ticket", () => {
    const assigned = { ...ticket, assignee_id: "d0000000-0000-0000-0000-000000000002" };
    const result = assignTicket(assigned, {
      assignee_id: null,
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data.assignee_id).toBeNull();
  });

  it("produces assignee_changed event", () => {
    const result = assignTicket(ticket, {
      assignee_id: "d0000000-0000-0000-0000-000000000002",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("assignee_changed");
    if (result.events[0].event_type === "assignee_changed") {
      expect(result.events[0].payload.from_assignee_id).toBeNull();
      expect(result.events[0].payload.to_assignee_id).toBe(
        "d0000000-0000-0000-0000-000000000002",
      );
    }
  });

  it("throws SAME_ASSIGNEE when assigning same user", () => {
    const assigned = { ...ticket, assignee_id: "d0000000-0000-0000-0000-000000000002" };
    expect(() =>
      assignTicket(assigned, {
        assignee_id: "d0000000-0000-0000-0000-000000000002",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
    try {
      assignTicket(assigned, {
        assignee_id: "d0000000-0000-0000-0000-000000000002",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      });
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.SAME_ASSIGNEE);
    }
  });

  it("throws SAME_ASSIGNEE when unassigning already unassigned", () => {
    expect(() =>
      assignTicket(ticket, {
        assignee_id: null,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
  });

  it("returns new object", () => {
    const result = assignTicket(ticket, {
      assignee_id: "d0000000-0000-0000-0000-000000000002",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });
    expect(result.data).not.toBe(ticket);
  });
});
