import { describe, it, expect } from "vitest";
import { reopenTicket } from "../../src/commands/reopen-ticket.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../../src/errors/domain-error.js";
import type { Ticket } from "../../src/entities/ticket.js";
import type { WorkflowColumn } from "../../src/entities/workflow-column.js";

const columns: WorkflowColumn[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    project_id: "b0000000-0000-0000-0000-000000000001",
    name: "To Do",
    position: 0,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    project_id: "b0000000-0000-0000-0000-000000000001",
    name: "In Progress",
    position: 1,
    created_at: "2024-01-01T00:00:00Z",
  },
];

const closedTicket: Ticket = {
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
  closed_at: "2024-06-01T18:00:00Z",
};

const input = {
  to_column_id: columns[0].id,
  actor_id: "d0000000-0000-0000-0000-000000000001",
  now: "2024-06-03T12:00:00Z",
};

describe("reopenTicket", () => {
  it("clears closed_at", () => {
    const result = reopenTicket(closedTicket, input, columns);
    expect(result.data.closed_at).toBeNull();
  });

  it("moves to target column", () => {
    const result = reopenTicket(closedTicket, input, columns);
    expect(result.data.status_column_id).toBe(columns[0].id);
  });

  it("updates updated_at", () => {
    const result = reopenTicket(closedTicket, input, columns);
    expect(result.data.updated_at).toBe(input.now);
  });

  it("produces ticket_reopened event", () => {
    const result = reopenTicket(closedTicket, input, columns);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("ticket_reopened");
    if (result.events[0].event_type === "ticket_reopened") {
      expect(result.events[0].payload.to_column_id).toBe(columns[0].id);
    }
  });

  it("throws TICKET_NOT_CLOSED for open ticket", () => {
    const openTicket = { ...closedTicket, closed_at: null };
    expect(() => reopenTicket(openTicket, input, columns)).toThrow(
      DomainError,
    );
    try {
      reopenTicket(openTicket, input, columns);
    } catch (e) {
      expect((e as DomainError).code).toBe(
        DOMAIN_ERROR_CODES.TICKET_NOT_CLOSED,
      );
    }
  });

  it("throws COLUMN_NOT_FOUND for unknown column", () => {
    expect(() =>
      reopenTicket(
        closedTicket,
        { ...input, to_column_id: "c0000000-0000-0000-0000-000000000099" },
        columns,
      ),
    ).toThrow(DomainError);
    try {
      reopenTicket(
        closedTicket,
        { ...input, to_column_id: "c0000000-0000-0000-0000-000000000099" },
        columns,
      );
    } catch (e) {
      expect((e as DomainError).code).toBe(
        DOMAIN_ERROR_CODES.COLUMN_NOT_FOUND,
      );
    }
  });

  it("returns new object", () => {
    const result = reopenTicket(closedTicket, input, columns);
    expect(result.data).not.toBe(closedTicket);
  });
});
