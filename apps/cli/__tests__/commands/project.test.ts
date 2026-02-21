import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerProjectCommands } from "../../src/commands/project.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/config.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/resolve.js", () => ({
  resolveProjectByPrefix: vi.fn(),
  resolveOrgId: vi.fn().mockResolvedValue("org-1"),
}));

vi.mock("../../src/output.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/output.js")>();
  return {
    ...actual,
    confirmAction: vi.fn(),
  };
});

import { getClient } from "../../src/client.js";
import { saveConfig } from "../../src/config.js";
import { resolveProjectByPrefix } from "../../src/resolve.js";
import { confirmAction } from "../../src/output.js";

const mockGetClient = vi.mocked(getClient);
const mockSaveConfig = vi.mocked(saveConfig);
const mockResolveProjectByPrefix = vi.mocked(resolveProjectByPrefix);
const mockConfirmAction = vi.mocked(confirmAction);

function buildProgram(): Command {
  const program = new Command()
    .option("--json")
    .option("--org <id>")
    .option("--project <id>")
    .exitOverride();
  registerProjectCommands(program);
  return program;
}

describe("project commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("project list", () => {
    it("lists projects as table", async () => {
      const mockClient = {
        getProjects: vi.fn().mockResolvedValue([
          { id: "p-1", name: "My Project", prefix: "MP", org_id: "org-1" },
        ]),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "list"]);

      expect(mockClient.getProjects).toHaveBeenCalledWith("org-1");
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("project create", () => {
    it("creates a project and prints success", async () => {
      const mockClient = {
        createProject: vi.fn().mockResolvedValue({
          id: "p-2", name: "New Project", prefix: "NP",
        }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "create", "New Project", "np"]);

      expect(mockClient.createProject).toHaveBeenCalledWith("org-1", {
        name: "New Project",
        prefix: "NP",
      });
      expect(logSpy.mock.calls[0][0]).toContain("New Project");
    });
  });

  describe("project use", () => {
    it("saves config with resolved project", async () => {
      const mockClient = {};
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveProjectByPrefix.mockResolvedValue({ id: "p-1", prefix: "MP" });

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "use", "MP"]);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-1",
          projectId: "p-1",
          projectPrefix: "MP",
        }),
      );
      expect(logSpy.mock.calls[0][0]).toContain("MP");
    });
  });

  describe("project delete", () => {
    it("deletes project with --yes and prints success", async () => {
      const mockClient = {
        deleteProject: vi.fn().mockResolvedValue({
          id: "p-1", name: "My Project", prefix: "MP",
        }),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveProjectByPrefix.mockResolvedValue({ id: "p-1", prefix: "MP" });

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "delete", "MP", "--yes"]);

      expect(mockClient.deleteProject).toHaveBeenCalledWith("org-1", "p-1");
      expect(logSpy.mock.calls[0][0]).toContain("MP");
    });

    it("prompts for confirmation when --yes not provided", async () => {
      const mockClient = {
        deleteProject: vi.fn().mockResolvedValue({
          id: "p-1", name: "My Project", prefix: "MP",
        }),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveProjectByPrefix.mockResolvedValue({ id: "p-1", prefix: "MP" });
      mockConfirmAction.mockResolvedValue(true);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "delete", "MP"]);

      expect(mockConfirmAction).toHaveBeenCalled();
      expect(mockClient.deleteProject).toHaveBeenCalledWith("org-1", "p-1");
    });

    it("aborts when confirmation is declined", async () => {
      const mockClient = {
        deleteProject: vi.fn(),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveProjectByPrefix.mockResolvedValue({ id: "p-1", prefix: "MP" });
      mockConfirmAction.mockResolvedValue(false);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "project", "delete", "MP"]);

      expect(mockClient.deleteProject).not.toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain("Aborted");
    });
  });
});
