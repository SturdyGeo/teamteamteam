import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { TicketCard } from "../../src/tui/TicketCard.js";

describe("TicketCard", () => {
  it("renders ticket key and title", () => {
    const { lastFrame } = render(
      <TicketCard
        ticketKey="DEMO-1"
        title="Fix the login bug"
        assignee="Alice"
        columnWidth={30}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("Fix the login bug");
    expect(frame).toContain("Alice");
  });

  it("shows unassigned when assignee is null", () => {
    const { lastFrame } = render(
      <TicketCard
        ticketKey="DEMO-2"
        title="Add docs"
        assignee={null}
        columnWidth={30}
      />,
    );
    expect(lastFrame()).toContain("unassigned");
  });

  it("truncates long titles", () => {
    const longTitle = "A".repeat(50);
    const { lastFrame } = render(
      <TicketCard
        ticketKey="DEMO-3"
        title={longTitle}
        assignee={null}
        columnWidth={20}
      />,
    );
    const frame = lastFrame()!;
    // Should not contain the full title
    expect(frame).not.toContain(longTitle);
    // Should contain the truncation character
    expect(frame).toContain("\u2026");
  });
});
