import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { FilterBar } from "../../src/tui/FilterBar.js";

describe("FilterBar", () => {
  it("renders nothing when no filters are set", () => {
    const { lastFrame } = render(
      <FilterBar filters={{}} memberMap={new Map()} />,
    );
    expect(lastFrame()).toBe("");
  });

  it("renders assignee filter with display name", () => {
    const memberMap = new Map([["user-1", "Alice"]]);
    const { lastFrame } = render(
      <FilterBar filters={{ assignee_id: "user-1" }} memberMap={memberMap} />,
    );
    expect(lastFrame()).toContain("assignee=Alice");
    expect(lastFrame()).toContain("esc to clear");
  });

  it("renders tag filter", () => {
    const { lastFrame } = render(
      <FilterBar filters={{ tag: "bug" }} memberMap={new Map()} />,
    );
    expect(lastFrame()).toContain("tag=bug");
  });

  it("renders search filter with quotes", () => {
    const { lastFrame } = render(
      <FilterBar filters={{ search: "login" }} memberMap={new Map()} />,
    );
    expect(lastFrame()).toContain('search="login"');
  });

  it("renders multiple filters with | separator", () => {
    const memberMap = new Map([["user-1", "Alice"]]);
    const { lastFrame } = render(
      <FilterBar
        filters={{ assignee_id: "user-1", tag: "bug" }}
        memberMap={memberMap}
      />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("assignee=Alice");
    expect(frame).toContain("|");
    expect(frame).toContain("tag=bug");
  });

  it("shows esc to clear hint", () => {
    const { lastFrame } = render(
      <FilterBar filters={{ tag: "bug" }} memberMap={new Map()} />,
    );
    expect(lastFrame()).toContain("esc to clear");
  });
});
