import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import type { Ticket } from "@teamteamteam/domain";
import { Column } from "../../src/tui/Column.js";

const baseTicket: Ticket = {
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
};

const ticket2: Ticket = {
  ...baseTicket,
  id: "t-2",
  number: 2,
  title: "Second ticket",
  assignee_id: null,
};

const memberMap = new Map<string, string>([["user-1", "Alice"]]);

describe("Column", () => {
  it("renders column name and ticket count", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("2 tickets");
  });

  it("shows singular '1 ticket' for single ticket", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    expect(lastFrame()).toContain("1 ticket");
    expect(lastFrame()).not.toContain("1 tickets");
  });

  it("shows plural '2 tickets' for multiple tickets", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    expect(lastFrame()).toContain("2 tickets");
  });

  it("shows 'No tickets' for empty column", () => {
    const { lastFrame } = render(
      <Column
        name="Done"
        tickets={[]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("No tickets");
    expect(frame).toContain("0 tickets");
  });

  it("renders ticket keys using prefix", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("DEMO-2");
  });

  it("renders separator line", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    // Separator is made of ─ characters
    expect(lastFrame()).toContain("─");
  });

  it("highlights selected ticket in active column", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
        isActive={true}
        selectedTicketIndex={0}
      />,
    );
    const frame = lastFrame()!;
    // Selected ticket gets a round border
    expect(frame).toContain("╭");
    expect(frame).toContain("DEMO-1");
  });

  it("does not highlight any ticket in inactive column", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
        isActive={false}
        selectedTicketIndex={0}
      />,
    );
    const frame = lastFrame()!;
    // No round border when inactive
    expect(frame).not.toContain("╭");
  });

  it("resolves assignee names from memberMap", () => {
    const { lastFrame } = render(
      <Column
        name="To Do"
        tickets={[baseTicket, ticket2]}
        prefix="DEMO"
        memberMap={memberMap}
        columnWidth={30}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Alice");
    expect(frame).toContain("unassigned");
  });
});
