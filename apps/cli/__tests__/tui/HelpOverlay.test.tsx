import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { HelpOverlay } from "../../src/tui/HelpOverlay.js";

describe("HelpOverlay", () => {
  it("renders 'Keyboard Shortcuts' title", () => {
    const { lastFrame } = render(<HelpOverlay />);
    expect(lastFrame()).toContain("Keyboard Shortcuts");
  });

  it("renders all shortcut descriptions", () => {
    const { lastFrame } = render(<HelpOverlay />);
    const frame = lastFrame()!;
    expect(frame).toContain("Navigate between columns");
    expect(frame).toContain("Navigate between tickets");
    expect(frame).toContain("Expand ticket detail");
    expect(frame).toContain("Create new ticket");
    expect(frame).toContain("Move ticket to column");
    expect(frame).toContain("Assign ticket");
    expect(frame).toContain("Close ticket");
    expect(frame).toContain("Reopen ticket");
    expect(frame).toContain("Open filter menu");
    expect(frame).toContain("Refresh board");
    expect(frame).toContain("Show this help");
    expect(frame).toContain("Quit");
  });

  it("shows 'Press Esc to close' dismiss hint", () => {
    const { lastFrame } = render(<HelpOverlay />);
    expect(lastFrame()).toContain("Press Esc to close");
  });
});
