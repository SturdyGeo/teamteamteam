import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { StatusBar } from "../../src/tui/StatusBar.js";

describe("StatusBar", () => {
  it("renders nothing when message is null", () => {
    const { lastFrame } = render(<StatusBar message={null} />);
    expect(lastFrame()).toBe("");
  });

  it("renders success message in green with checkmark", () => {
    const { lastFrame } = render(
      <StatusBar message={{ text: "Ticket moved", type: "success" }} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("\u2713");
    expect(frame).toContain("Ticket moved");
  });

  it("renders error message in red with X", () => {
    const { lastFrame } = render(
      <StatusBar message={{ text: "Move failed", type: "error" }} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("\u2717");
    expect(frame).toContain("Move failed");
  });
});
