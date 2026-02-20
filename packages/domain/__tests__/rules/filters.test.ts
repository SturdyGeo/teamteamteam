import { describe, it, expect } from "vitest";
import {
  matchesFilters,
  filterTickets,
  mergeFilters,
} from "../../src/rules/filters.js";
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

const tickets: Ticket[] = [
  makeTicket({
    id: "a0000000-0000-0000-0000-000000000001",
    number: 1,
    title: "Fix login bug",
    description: "Users cannot log in",
    status_column_id: "c0000000-0000-0000-0000-000000000001",
    assignee_id: "d0000000-0000-0000-0000-000000000002",
    tags: ["bug", "urgent"],
  }),
  makeTicket({
    id: "a0000000-0000-0000-0000-000000000002",
    number: 2,
    title: "Add dark mode",
    description: "Implement theme switching",
    status_column_id: "c0000000-0000-0000-0000-000000000002",
    assignee_id: null,
    tags: ["feature"],
  }),
  makeTicket({
    id: "a0000000-0000-0000-0000-000000000003",
    number: 3,
    title: "Update docs",
    description: "Fix the readme",
    status_column_id: "c0000000-0000-0000-0000-000000000001",
    assignee_id: "d0000000-0000-0000-0000-000000000002",
    tags: ["docs"],
  }),
];

describe("matchesFilters", () => {
  it("matches all with empty filters", () => {
    expect(matchesFilters(tickets[0], {})).toBe(true);
  });

  it("filters by status_column_id", () => {
    expect(
      matchesFilters(tickets[0], {
        status_column_id: "c0000000-0000-0000-0000-000000000001",
      }),
    ).toBe(true);
    expect(
      matchesFilters(tickets[1], {
        status_column_id: "c0000000-0000-0000-0000-000000000001",
      }),
    ).toBe(false);
  });

  it("filters by assignee_id", () => {
    expect(
      matchesFilters(tickets[0], {
        assignee_id: "d0000000-0000-0000-0000-000000000002",
      }),
    ).toBe(true);
    expect(
      matchesFilters(tickets[1], {
        assignee_id: "d0000000-0000-0000-0000-000000000002",
      }),
    ).toBe(false);
  });

  it("filters by assignee_id null (unassigned)", () => {
    expect(matchesFilters(tickets[1], { assignee_id: null })).toBe(true);
    expect(matchesFilters(tickets[0], { assignee_id: null })).toBe(false);
  });

  it("filters by tag case-insensitively", () => {
    expect(matchesFilters(tickets[0], { tag: "BUG" })).toBe(true);
    expect(matchesFilters(tickets[1], { tag: "bug" })).toBe(false);
  });

  it("searches title case-insensitively", () => {
    expect(matchesFilters(tickets[0], { search: "LOGIN" })).toBe(true);
    expect(matchesFilters(tickets[1], { search: "login" })).toBe(false);
  });

  it("searches description", () => {
    expect(matchesFilters(tickets[0], { search: "cannot" })).toBe(true);
  });

  it("ignores empty search string", () => {
    expect(matchesFilters(tickets[0], { search: "" })).toBe(true);
  });
});

describe("filterTickets", () => {
  it("returns all tickets with empty filters", () => {
    expect(filterTickets(tickets, {})).toHaveLength(3);
  });

  it("filters by column", () => {
    const result = filterTickets(tickets, {
      status_column_id: "c0000000-0000-0000-0000-000000000001",
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.number)).toEqual([1, 3]);
  });

  it("combines multiple filters", () => {
    const result = filterTickets(tickets, {
      status_column_id: "c0000000-0000-0000-0000-000000000001",
      tag: "bug",
    });
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterTickets(tickets, { tag: "nonexistent" })).toHaveLength(0);
  });
});

describe("mergeFilters", () => {
  it("merges multiple filter objects", () => {
    const result = mergeFilters({ tag: "bug" }, { search: "login" });
    expect(result).toEqual({ tag: "bug", search: "login" });
  });

  it("later values override earlier", () => {
    const result = mergeFilters({ tag: "bug" }, { tag: "feature" });
    expect(result.tag).toBe("feature");
  });

  it("returns empty object for no args", () => {
    expect(mergeFilters()).toEqual({});
  });
});
