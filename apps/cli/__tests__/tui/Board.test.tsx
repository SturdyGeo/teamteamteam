import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import type { WorkflowColumn, Ticket } from "@candoo/domain";
import { Board } from "../../src/tui/Board.js";

const columns: WorkflowColumn[] = [
  {
    id: "col-1",
    project_id: "proj-1",
    name: "To Do",
    position: 0,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-2",
    project_id: "proj-1",
    name: "In Progress",
    position: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const tickets: Ticket[] = [
  {
    id: "t-1",
    project_id: "proj-1",
    number: 1,
    title: "First ticket",
    description: "",
    status_column_id: "col-1",
    assignee_id: "user-1",
    reporter_id: "user-1",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
];

describe("Board", () => {
  it("renders columns", () => {
    const ticketsByColumn = new Map<string, Ticket[]>();
    ticketsByColumn.set("col-1", tickets);
    ticketsByColumn.set("col-2", []);

    const memberMap = new Map<string, string>();
    memberMap.set("user-1", "Alice");

    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={ticketsByColumn}
        memberMap={memberMap}
        prefix="DEMO"
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("In Progress");
  });

  it("renders tickets in their columns", () => {
    const ticketsByColumn = new Map<string, Ticket[]>();
    ticketsByColumn.set("col-1", tickets);
    ticketsByColumn.set("col-2", []);

    const memberMap = new Map<string, string>();
    memberMap.set("user-1", "Alice");

    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={ticketsByColumn}
        memberMap={memberMap}
        prefix="DEMO"
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("First ticket");
    expect(frame).toContain("Alice");
  });

  it("shows placeholder for empty columns", () => {
    const ticketsByColumn = new Map<string, Ticket[]>();
    ticketsByColumn.set("col-1", []);
    ticketsByColumn.set("col-2", []);

    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={ticketsByColumn}
        memberMap={new Map()}
        prefix="DEMO"
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("No tickets");
  });
});
