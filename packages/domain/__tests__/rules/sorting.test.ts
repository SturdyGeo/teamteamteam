import { describe, it, expect } from "vitest";
import { sortTickets } from "../../src/rules/sorting.js";
import type { Ticket } from "../../src/entities/ticket.js";

const makeTicket = (overrides: Partial<Ticket>): Ticket => ({
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Default ticket",
  description: "",
  status_column_id: "c0000000-0000-0000-0000-000000000001",
  assignee_id: null,
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  tags: [],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
  ...overrides,
});

describe("sortTickets", () => {
  it("sorts by updated_at descending", () => {
    const tickets = [
      makeTicket({
        id: "a0000000-0000-0000-0000-000000000001",
        updated_at: "2024-06-01T12:00:00Z",
      }),
      makeTicket({
        id: "a0000000-0000-0000-0000-000000000002",
        updated_at: "2024-06-03T12:00:00Z",
      }),
      makeTicket({
        id: "a0000000-0000-0000-0000-000000000003",
        updated_at: "2024-06-02T12:00:00Z",
      }),
    ];
    const sorted = sortTickets(tickets);
    expect(sorted.map((t) => t.id)).toEqual([
      "a0000000-0000-0000-0000-000000000002",
      "a0000000-0000-0000-0000-000000000003",
      "a0000000-0000-0000-0000-000000000001",
    ]);
  });

  it("returns new array", () => {
    const tickets = [makeTicket({})];
    const sorted = sortTickets(tickets);
    expect(sorted).not.toBe(tickets);
  });

  it("handles empty array", () => {
    expect(sortTickets([])).toEqual([]);
  });

  it("handles single element", () => {
    const tickets = [makeTicket({})];
    expect(sortTickets(tickets)).toHaveLength(1);
  });
});
