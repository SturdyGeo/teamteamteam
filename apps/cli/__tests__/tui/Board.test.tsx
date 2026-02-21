import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import type { WorkflowColumn, Ticket } from "@teamteamteam/domain";
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
  {
    id: "col-3",
    project_id: "proj-1",
    name: "Done",
    position: 2,
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
  {
    id: "t-2",
    project_id: "proj-1",
    number: 2,
    title: "Second ticket",
    description: "",
    status_column_id: "col-1",
    assignee_id: null,
    reporter_id: "user-1",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
  {
    id: "t-3",
    project_id: "proj-1",
    number: 3,
    title: "Third ticket",
    description: "",
    status_column_id: "col-2",
    assignee_id: "user-1",
    reporter_id: "user-1",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
];

function buildTicketsByColumn(): Map<string, Ticket[]> {
  const map = new Map<string, Ticket[]>();
  map.set(
    "col-1",
    tickets.filter((t) => t.status_column_id === "col-1"),
  );
  map.set(
    "col-2",
    tickets.filter((t) => t.status_column_id === "col-2"),
  );
  map.set("col-3", []);
  return map;
}

const memberMap = new Map<string, string>([["user-1", "Alice"]]);

describe("Board", () => {
  it("renders columns", () => {
    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={buildTicketsByColumn()}
        memberMap={memberMap}
        prefix="DEMO"
        selectedColumnIndex={0}
        selectedTicketIndex={0}
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("In Progress");
    expect(frame).toContain("Done");
  });

  it("renders tickets in their columns", () => {
    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={buildTicketsByColumn()}
        memberMap={memberMap}
        prefix="DEMO"
        selectedColumnIndex={0}
        selectedTicketIndex={0}
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("First ticket");
    expect(frame).toContain("Alice");
  });

  it("shows placeholder for empty columns", () => {
    const emptyMap = new Map<string, Ticket[]>();
    emptyMap.set("col-1", []);
    emptyMap.set("col-2", []);
    emptyMap.set("col-3", []);

    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={emptyMap}
        memberMap={new Map()}
        prefix="DEMO"
        selectedColumnIndex={0}
        selectedTicketIndex={0}
      />,
    );

    const frame = lastFrame()!;
    expect(frame).toContain("No tickets");
  });

  it("highlights active column header", () => {
    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={buildTicketsByColumn()}
        memberMap={memberMap}
        prefix="DEMO"
        selectedColumnIndex={1}
        selectedTicketIndex={0}
      />,
    );

    // The active column (In Progress) should be rendered —
    // we can't directly test color in plain text, but we confirm it renders
    const frame = lastFrame()!;
    expect(frame).toContain("In Progress");
    expect(frame).toContain("DEMO-3");
  });

  it("shows selected ticket with border in active column", () => {
    const { lastFrame } = render(
      <Board
        columns={columns}
        ticketsByColumn={buildTicketsByColumn()}
        memberMap={memberMap}
        prefix="DEMO"
        selectedColumnIndex={0}
        selectedTicketIndex={0}
      />,
    );

    const frame = lastFrame()!;
    // The selected ticket (DEMO-1) should have a round border
    expect(frame).toContain("╭");
    expect(frame).toContain("DEMO-1");
  });
});
