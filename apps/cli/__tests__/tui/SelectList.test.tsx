import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { SelectList } from "../../src/tui/SelectList.js";

const items = [
  { label: "To Do", value: "col-1" },
  { label: "In Progress", value: "col-2" },
  { label: "Done", value: "col-3" },
];

describe("SelectList", () => {
  it("renders title", () => {
    const { lastFrame } = render(
      <SelectList title="Move to" items={items} selectedIndex={0} />,
    );
    expect(lastFrame()).toContain("Move to");
  });

  it("renders all items", () => {
    const { lastFrame } = render(
      <SelectList title="Move to" items={items} selectedIndex={0} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("In Progress");
    expect(frame).toContain("Done");
  });

  it("highlights selected item with > prefix", () => {
    const { lastFrame } = render(
      <SelectList title="Move to" items={items} selectedIndex={1} />,
    );
    expect(lastFrame()).toContain("> In Progress");
  });

  it("shows help text", () => {
    const { lastFrame } = render(
      <SelectList title="Move to" items={items} selectedIndex={0} />,
    );
    expect(lastFrame()).toContain("up/down: select | enter: confirm | esc: cancel");
  });
});
