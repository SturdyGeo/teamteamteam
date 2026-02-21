import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { TextInput } from "../../src/tui/TextInput.js";

describe("TextInput", () => {
  it("renders label", () => {
    const { lastFrame } = render(
      <TextInput label="New Ticket" value="" />,
    );
    expect(lastFrame()).toContain("New Ticket");
  });

  it("renders value with cursor", () => {
    const { lastFrame } = render(
      <TextInput label="New Ticket" value="Fix login" />,
    );
    expect(lastFrame()).toContain("Fix login_");
  });

  it("renders cursor when value is empty", () => {
    const { lastFrame } = render(
      <TextInput label="New Ticket" value="" />,
    );
    expect(lastFrame()).toContain("_");
  });

  it("shows help text", () => {
    const { lastFrame } = render(
      <TextInput label="New Ticket" value="" />,
    );
    expect(lastFrame()).toContain("type title | enter: create | esc: cancel");
  });

  it("renders custom hint when provided", () => {
    const { lastFrame } = render(
      <TextInput label="Search" value="" hint="type to search | enter: apply | esc: cancel" />,
    );
    expect(lastFrame()).toContain("type to search | enter: apply | esc: cancel");
    expect(lastFrame()).not.toContain("type title");
  });
});
