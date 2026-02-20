import { describe, it, expect } from "vitest";
import { createTicket } from "../../src/commands/create-ticket.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../../src/errors/domain-error.js";
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

const validInput = {
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Fix the bug",
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  now: "2024-06-01T12:00:00Z",
};

describe("createTicket", () => {
  it("creates ticket in initial column", () => {
    const result = createTicket(validInput, columns);
    expect(result.data.status_column_id).toBe(columns[0].id);
  });

  it("sets correct fields", () => {
    const result = createTicket(validInput, columns);
    expect(result.data.id).toBe(validInput.id);
    expect(result.data.title).toBe("Fix the bug");
    expect(result.data.number).toBe(1);
    expect(result.data.reporter_id).toBe(validInput.reporter_id);
    expect(result.data.closed_at).toBeNull();
    expect(result.data.assignee_id).toBeNull();
    expect(result.data.description).toBe("");
    expect(result.data.tags).toEqual([]);
  });

  it("sets timestamps from now", () => {
    const result = createTicket(validInput, columns);
    expect(result.data.created_at).toBe(validInput.now);
    expect(result.data.updated_at).toBe(validInput.now);
  });

  it("produces ticket_created event", () => {
    const result = createTicket(validInput, columns);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("ticket_created");
    expect(result.events[0].ticket_id).toBe(validInput.id);
    expect(result.events[0].actor_id).toBe(validInput.reporter_id);
  });

  it("trims title whitespace", () => {
    const result = createTicket({ ...validInput, title: "  Fix  " }, columns);
    expect(result.data.title).toBe("Fix");
  });

  it("accepts optional fields", () => {
    const result = createTicket(
      {
        ...validInput,
        description: "Details",
        assignee_id: "d0000000-0000-0000-0000-000000000002",
        tags: ["bug"],
      },
      columns,
    );
    expect(result.data.description).toBe("Details");
    expect(result.data.assignee_id).toBe(
      "d0000000-0000-0000-0000-000000000002",
    );
    expect(result.data.tags).toEqual(["bug"]);
  });

  it("throws INVALID_INPUT for empty title", () => {
    expect(() => createTicket({ ...validInput, title: "   " }, columns)).toThrow(
      DomainError,
    );
    try {
      createTicket({ ...validInput, title: "   " }, columns);
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("throws INVALID_INPUT for empty columns", () => {
    expect(() => createTicket(validInput, [])).toThrow(DomainError);
    try {
      createTicket(validInput, []);
    } catch (e) {
      expect((e as DomainError).code).toBe(DOMAIN_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("returns new object (immutability)", () => {
    const result1 = createTicket(validInput, columns);
    const result2 = createTicket(validInput, columns);
    expect(result1.data).not.toBe(result2.data);
    expect(result1.data).toEqual(result2.data);
  });
});
