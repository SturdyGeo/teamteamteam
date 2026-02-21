import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerTagCommands, registerTicketTagCommands } from "../../src/commands/tag.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/config.js", () => ({
  getDefaultProjectId: vi.fn().mockResolvedValue("proj-1"),
}));

vi.mock("../../src/resolve.js", () => ({
  resolveTicket: vi.fn(),
}));

import { getClient } from "../../src/client.js";
import { resolveTicket } from "../../src/resolve.js";

const mockGetClient = vi.mocked(getClient);
const mockResolveTicket = vi.mocked(resolveTicket);

const sampleTicket = {
  id: "t-1",
  number: 1,
  title: "A ticket",
  tags: ["bug"],
};

describe("tag commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("tags (top-level)", () => {
    it("lists tags as table", async () => {
      const mockClient = {
        getTags: vi.fn().mockResolvedValue([
          { id: "tag-1", name: "bug", project_id: "proj-1", created_at: "2025-01-01T00:00:00Z" },
        ]),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = new Command()
        .option("--json")
        .option("--project <id>")
        .exitOverride();
      registerTagCommands(program);
      await program.parseAsync(["node", "ttteam", "tags"]);

      expect(mockClient.getTags).toHaveBeenCalledWith("proj-1");
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("ticket tag add", () => {
    it("adds a tag to a ticket", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        addTag: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = new Command()
        .option("--json")
        .option("--project <id>")
        .exitOverride();
      const ticket = program.command("ticket");
      registerTicketTagCommands(ticket);
      await program.parseAsync(["node", "ttteam", "ticket", "tag", "add", "TEST-1", "feature"]);

      expect(mockClient.addTag).toHaveBeenCalledWith("t-1", { tag: "feature" });
      expect(logSpy.mock.calls[0][0]).toContain("feature");
    });
  });

  describe("ticket tag remove", () => {
    it("removes a tag from a ticket", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        removeTag: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = new Command()
        .option("--json")
        .option("--project <id>")
        .exitOverride();
      const ticket = program.command("ticket");
      registerTicketTagCommands(ticket);
      await program.parseAsync(["node", "ttteam", "ticket", "tag", "remove", "TEST-1", "bug"]);

      expect(mockClient.removeTag).toHaveBeenCalledWith("t-1", "bug");
      expect(logSpy.mock.calls[0][0]).toContain("bug");
    });
  });
});
