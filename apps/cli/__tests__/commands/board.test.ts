import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerBoardCommand } from "../../src/commands/board.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(() => ({})),
}));

vi.mock("../../src/config.js", () => ({
  getDefaultProjectId: vi.fn().mockResolvedValue("proj-1"),
  loadConfig: vi.fn().mockResolvedValue({ projectPrefix: "TEST" }),
}));

vi.mock("../../src/resolve.js", () => ({
  resolveOrgId: vi.fn().mockResolvedValue("org-1"),
}));

const mockWaitUntilExit = vi.fn().mockResolvedValue(undefined);

vi.mock("ink", () => ({
  render: vi.fn(() => ({
    waitUntilExit: mockWaitUntilExit,
  })),
}));

vi.mock("react", () => ({
  createElement: vi.fn(() => null),
}));

vi.mock("../../src/tui/App.js", () => ({
  App: vi.fn(),
}));

describe("board command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the board command", () => {
    const program = new Command();
    registerBoardCommand(program);
    const boardCmd = program.commands.find((c) => c.name() === "board");
    expect(boardCmd).toBeDefined();
    expect(boardCmd!.description()).toBe("Open the interactive kanban board (TUI)");
  });

  it("invokes ink render when executed", async () => {
    const program = new Command();
    program.option("--org <id>").option("--project <id>");
    registerBoardCommand(program);

    await program.parseAsync(["node", "test", "board"]);

    const { render } = await import("ink");
    expect(render).toHaveBeenCalled();
    expect(mockWaitUntilExit).toHaveBeenCalled();
  });
});
