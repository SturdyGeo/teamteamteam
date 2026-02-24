import { describe, it, expect } from "vitest";
import { moveTicket } from "../../src/commands/move-ticket.js";
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
  {
    id: "c0000000-0000-0000-0000-000000000003",
    project_id: "b0000000-0000-0000-0000-000000000001",
    name: "Done",
    position: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
];

const ticket: Ticket = {
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Fix the bug",
  description: "",
  status_column_id: columns[0].id,
  assignee_id: null,
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  tags: [],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

describe("moveTicket", () => {
  it("moves ticket to target column", () => {
    const result = moveTicket(
      ticket,
      {
        to_column_id: columns[1].id,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      },
      columns,
    );
    expect(result.data.status_column_id).toBe(columns[1].id);
    expect(result.data.updated_at).toBe("2024-06-02T12:00:00Z");
  });

  it("produces status_changed event", () => {
    const result = moveTicket(
      ticket,
      {
        to_column_id: columns[1].id,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      },
      columns,
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("status_changed");
    if (result.events[0].event_type === "status_changed") {
      expect(result.events[0].payload.from_column_id).toBe(columns[0].id);
      expect(result.events[0].payload.to_column_id).toBe(columns[1].id);
    }
  });

  it("throws SAME_COLUMN when moving to same column", () => {
    expect(() =>
      moveTicket(
        ticket,
        {
          to_column_id: columns[0].id,
          actor_id: "d0000000-0000-0000-0000-000000000001",
          now: "2024-06-02T12:00:00Z",
        },
        columns,
      ),
    ).toThrow(DomainError);
    try {
      moveTicket(
        ticket,
        {
          to_column_id: columns[0].id,
          actor_id: "d0000000-0000-0000-0000-000000000001",
          now: "2024-06-02T12:00:00Z",
        },
        columns,
      );
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.SAME_COLUMN);
    }
  });

  it("throws COLUMN_NOT_FOUND for unknown column", () => {
    expect(() =>
      moveTicket(
        ticket,
        {
          to_column_id: "c0000000-0000-0000-0000-000000000099",
          actor_id: "d0000000-0000-0000-0000-000000000001",
          now: "2024-06-02T12:00:00Z",
        },
        columns,
      ),
    ).toThrow(DomainError);
    try {
      moveTicket(
        ticket,
        {
          to_column_id: "c0000000-0000-0000-0000-000000000099",
          actor_id: "d0000000-0000-0000-0000-000000000001",
          now: "2024-06-02T12:00:00Z",
        },
        columns,
      );
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.COLUMN_NOT_FOUND);
    }
  });

  it("returns new object", () => {
    const result = moveTicket(
      ticket,
      {
        to_column_id: columns[1].id,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      },
      columns,
    );
    expect(result.data).not.toBe(ticket);
  });

  it("auto-closes when moved into Done", () => {
    const result = moveTicket(
      ticket,
      {
        to_column_id: columns[2].id,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      },
      columns,
    );

    expect(result.data.closed_at).toBe("2024-06-02T12:00:00Z");
    expect(result.events.map((event) => event.event_type)).toEqual([
      "status_changed",
      "ticket_closed",
    ]);
  });

  it("auto-reopens when moved out of Done", () => {
    const closedDoneTicket: Ticket = {
      ...ticket,
      status_column_id: columns[2].id,
      closed_at: "2024-06-01T13:00:00Z",
    };

    const result = moveTicket(
      closedDoneTicket,
      {
        to_column_id: columns[1].id,
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      },
      columns,
    );

    expect(result.data.closed_at).toBeNull();
    expect(result.events.map((event) => event.event_type)).toEqual([
      "status_changed",
      "ticket_reopened",
    ]);
  });
});
