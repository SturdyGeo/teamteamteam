import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerOrgCommands } from "../../src/commands/org.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/config.js", () => ({
  getDefaultOrgId: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/resolve.js", () => ({
  resolveOrg: vi.fn(),
  resolveOrgId: vi.fn(),
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
import { resolveOrg, resolveOrgId } from "../../src/resolve.js";
import { confirmAction } from "../../src/output.js";

const mockGetClient = vi.mocked(getClient);
const mockSaveConfig = vi.mocked(saveConfig);
const mockResolveOrg = vi.mocked(resolveOrg);
const mockResolveOrgId = vi.mocked(resolveOrgId);
const mockConfirmAction = vi.mocked(confirmAction);

function buildProgram(): Command {
  const program = new Command()
    .option("--json")
    .option("--org <id>")
    .exitOverride();
  registerOrgCommands(program);
  return program;
}

describe("org commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("org list", () => {
    it("lists orgs as table", async () => {
      const mockClient = {
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-1", name: "Acme", membership_role: "owner" },
        ]),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "list"]);

      expect(mockClient.getOrgs).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });

    it("lists orgs as JSON", async () => {
      const orgs = [{ id: "org-1", name: "Acme", membership_role: "owner" }];
      const mockClient = { getOrgs: vi.fn().mockResolvedValue(orgs) };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "org", "list"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(orgs, null, 2));
    });
  });

  describe("org create", () => {
    it("creates an org and prints success", async () => {
      const mockClient = {
        createOrg: vi.fn().mockResolvedValue({ id: "org-2", name: "NewOrg" }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "create", "NewOrg"]);

      expect(mockClient.createOrg).toHaveBeenCalledWith({ name: "NewOrg" });
      expect(logSpy.mock.calls[0][0]).toContain("NewOrg");
    });

    it("creates an org with JSON output", async () => {
      const created = { id: "org-2", name: "NewOrg" };
      const mockClient = { createOrg: vi.fn().mockResolvedValue(created) };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "org", "create", "NewOrg"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(created, null, 2));
    });
  });

  describe("org use", () => {
    it("saves config with resolved org", async () => {
      const mockClient = {};
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrg.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        membership_role: "owner",
      } as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "use", "Acme"]);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-1" }),
      );
      expect(logSpy.mock.calls[0][0]).toContain("Acme");
    });
  });

  describe("org delete", () => {
    it("deletes org with --yes and prints success", async () => {
      const mockClient = {
        deleteOrg: vi.fn().mockResolvedValue({ id: "org-1", name: "Acme" }),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrg.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        membership_role: "owner",
      } as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "delete", "Acme", "--yes"]);

      expect(mockClient.deleteOrg).toHaveBeenCalledWith("org-1");
      expect(logSpy.mock.calls[0][0]).toContain("Acme");
    });

    it("prompts for confirmation when --yes not provided", async () => {
      const mockClient = {
        deleteOrg: vi.fn().mockResolvedValue({ id: "org-1", name: "Acme" }),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrg.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        membership_role: "owner",
      } as never);
      mockConfirmAction.mockResolvedValue(true);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "delete", "Acme"]);

      expect(mockConfirmAction).toHaveBeenCalled();
      expect(mockClient.deleteOrg).toHaveBeenCalledWith("org-1");
    });

    it("aborts when confirmation is declined", async () => {
      const mockClient = {
        deleteOrg: vi.fn(),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrg.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        membership_role: "owner",
      } as never);
      mockConfirmAction.mockResolvedValue(false);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "delete", "Acme"]);

      expect(mockClient.deleteOrg).not.toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain("Aborted");
    });
  });

  describe("org invite", () => {
    it("invites a member with default role", async () => {
      const membership = { id: "mem-1", org_id: "org-1", user_id: "u-1", role: "member", created_at: "2024-01-01T00:00:00Z" };
      const mockClient = {
        inviteMember: vi.fn().mockResolvedValue(membership),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrgId.mockResolvedValue("org-1");

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "invite", "alice@example.com"]);

      expect(mockResolveOrgId).toHaveBeenCalledWith(mockClient, undefined);
      expect(mockClient.inviteMember).toHaveBeenCalledWith("org-1", { email: "alice@example.com", role: "member" });
      expect(logSpy.mock.calls[0][0]).toContain("alice@example.com");
    });

    it("invites a member with --role admin", async () => {
      const membership = { id: "mem-2", org_id: "org-1", user_id: "u-2", role: "admin", created_at: "2024-01-01T00:00:00Z" };
      const mockClient = {
        inviteMember: vi.fn().mockResolvedValue(membership),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrgId.mockResolvedValue("org-1");

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "org", "invite", "bob@example.com", "--role", "admin"]);

      expect(mockClient.inviteMember).toHaveBeenCalledWith("org-1", { email: "bob@example.com", role: "admin" });
      expect(logSpy.mock.calls[0][0]).toContain("bob@example.com");
    });

    it("outputs JSON when --json flag is used", async () => {
      const membership = { id: "mem-1", org_id: "org-1", user_id: "u-1", role: "member", created_at: "2024-01-01T00:00:00Z" };
      const mockClient = {
        inviteMember: vi.fn().mockResolvedValue(membership),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveOrgId.mockResolvedValue("org-1");

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "org", "invite", "alice@example.com"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(membership, null, 2));
    });
  });
});
