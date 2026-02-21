import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import type { Ticket } from "@candoo/domain";
import { TicketDetail } from "../../src/tui/TicketDetail.js";

const baseTicket: Ticket = {
  id: "t-1",
  project_id: "proj-1",
  number: 1,
  title: "Fix the login bug",
  description: "Users cannot log in with email",
  status_column_id: "col-1",
  assignee_id: "user-1",
  reporter_id: "user-1",
  tags: ["bug", "auth"],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
  closed_at: null,
};

describe("TicketDetail", () => {
  it("renders ticket key, title, description, status, assignee, tags, and dates", () => {
    const { lastFrame } = render(
      <TicketDetail
        ticket={baseTicket}
        columnName="To Do"
        assigneeName="Alice"
        prefix="DEMO"
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("Fix the login bug");
    expect(frame).toContain("Users cannot log in with email");
    expect(frame).toContain("To Do");
    expect(frame).toContain("Alice");
    expect(frame).toContain("bug, auth");
    expect(frame).toContain("2025-01-01T00:00:00Z");
    expect(frame).toContain("2025-01-02T00:00:00Z");
  });

  it("shows 'No description' when description is empty", () => {
    const ticket = { ...baseTicket, description: "" };
    const { lastFrame } = render(
      <TicketDetail
        ticket={ticket}
        columnName="To Do"
        assigneeName="Alice"
        prefix="DEMO"
      />,
    );
    expect(lastFrame()).toContain("No description");
  });

  it("shows 'unassigned' when no assignee", () => {
    const ticket = { ...baseTicket, assignee_id: null };
    const { lastFrame } = render(
      <TicketDetail
        ticket={ticket}
        columnName="To Do"
        assigneeName={null}
        prefix="DEMO"
      />,
    );
    expect(lastFrame()).toContain("unassigned");
  });

  it("omits tags line when tags are empty", () => {
    const ticket = { ...baseTicket, tags: [] };
    const { lastFrame } = render(
      <TicketDetail
        ticket={ticket}
        columnName="To Do"
        assigneeName="Alice"
        prefix="DEMO"
      />,
    );
    expect(lastFrame()).not.toContain("Tags:");
  });

  it("omits closed date when null", () => {
    const { lastFrame } = render(
      <TicketDetail
        ticket={baseTicket}
        columnName="To Do"
        assigneeName="Alice"
        prefix="DEMO"
      />,
    );
    expect(lastFrame()).not.toContain("Closed:");
  });

  it("shows closed date when present", () => {
    const ticket = { ...baseTicket, closed_at: "2025-01-03T00:00:00Z" };
    const { lastFrame } = render(
      <TicketDetail
        ticket={ticket}
        columnName="Done"
        assigneeName="Alice"
        prefix="DEMO"
      />,
    );
    expect(lastFrame()).toContain("Closed:");
    expect(lastFrame()).toContain("2025-01-03T00:00:00Z");
  });
});
