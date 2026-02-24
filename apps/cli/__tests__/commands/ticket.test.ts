import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerTicketCommands } from "../../src/commands/ticket.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/config.js", () => ({
  getDefaultProjectId: vi.fn().mockResolvedValue("proj-1"),
  loadConfig: vi.fn().mockResolvedValue({ projectPrefix: "TEST" }),
}));

vi.mock("../../src/resolve.js", () => ({
  resolveTicket: vi.fn(),
  resolveColumn: vi.fn(),
  resolveMember: vi.fn(),
  resolveOrgId: vi.fn().mockResolvedValue("org-1"),
}));

import { getClient } from "../../src/client.js";
import { resolveTicket, resolveColumn, resolveMember } from "../../src/resolve.js";

const mockGetClient = vi.mocked(getClient);
const mockResolveTicket = vi.mocked(resolveTicket);
const mockResolveColumn = vi.mocked(resolveColumn);
const mockResolveMember = vi.mocked(resolveMember);

function buildProgram(): Command {
  const program = new Command()
    .option("--json")
    .option("--org <id>")
    .option("--project <id>")
    .exitOverride();
  registerTicketCommands(program);
  return program;
}

const sampleTicket = {
  id: "t-1",
  project_id: "proj-1",
  number: 1,
  title: "Fix login bug",
  description: "Details here",
  status_column_id: "col-1",
  assignee_id: null,
  reporter_id: "u-1",
  tags: ["bug"],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  closed_at: null,
};

describe("ticket commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ticket list", () => {
    it("lists tickets as table", async () => {
      const mockClient = {
        getTickets: vi.fn().mockResolvedValue([sampleTicket]),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "list"]);

      expect(mockClient.getTickets).toHaveBeenCalledWith("proj-1", {});
      expect(logSpy).toHaveBeenCalled();
    });

    it("lists tickets as JSON", async () => {
      const tickets = [sampleTicket];
      const mockClient = { getTickets: vi.fn().mockResolvedValue(tickets) };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "ticket", "list"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(tickets, null, 2));
    });
  });

  describe("ticket create", () => {
    it("creates a ticket with defaults", async () => {
      const mockClient = {
        createTicket: vi.fn().mockResolvedValue({ ...sampleTicket, number: 5 }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "create", "New ticket"]);

      expect(mockClient.createTicket).toHaveBeenCalledWith("proj-1", {
        title: "New ticket",
        description: undefined,
        assignee_id: undefined,
        tags: undefined,
      });
      expect(logSpy.mock.calls[0][0]).toContain("TEST-5");
    });

    it("creates a ticket with all options", async () => {
      const mockClient = {
        createTicket: vi.fn().mockResolvedValue({ ...sampleTicket, number: 6 }),
      };
      mockGetClient.mockReturnValue(mockClient as never);
      mockResolveMember.mockResolvedValue({
        user: { id: "u-2", email: "alice@x.com", display_name: "Alice" },
      } as never);

      const program = buildProgram();
      await program.parseAsync([
        "node", "ttteam", "ticket", "create", "Important task",
        "-d", "Something urgent", "-a", "alice@x.com", "-t", "bug",
      ]);

      expect(mockClient.createTicket).toHaveBeenCalledWith("proj-1", {
        title: "Important task",
        description: "Something urgent",
        assignee_id: "u-2",
        tags: ["bug"],
      });
    });
  });

  describe("ticket show", () => {
    it("shows ticket detail view", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        getTicket: vi.fn().mockResolvedValue(sampleTicket),
        getColumns: vi.fn().mockResolvedValue([
          { id: "col-1", name: "To Do", position: 0 },
        ]),
        getActivity: vi.fn().mockResolvedValue([]),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "show", "TEST-1"]);

      expect(mockClient.getTicket).toHaveBeenCalledWith("t-1");
      // Should print key + title, status, etc.
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("TEST-1");
      expect(output).toContain("To Do");
    });

    it("shows ticket as JSON", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        getTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "ticket", "show", "TEST-1"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(sampleTicket, null, 2));
    });
  });

  describe("ticket move", () => {
    it("moves a ticket to a column", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      mockResolveColumn.mockResolvedValue({ id: "col-2", name: "In Progress", position: 1 } as never);
      const mockClient = {
        moveTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "move", "TEST-1", "In Progress"]);

      expect(mockClient.moveTicket).toHaveBeenCalledWith("t-1", { to_column_id: "col-2" });
      expect(logSpy.mock.calls[0][0]).toContain("In Progress");
    });
  });

  describe("ticket update", () => {
    it("updates only title when description is omitted", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        getTicket: vi.fn().mockResolvedValue(sampleTicket),
        updateTicket: vi.fn().mockResolvedValue({
          ...sampleTicket,
          title: "Updated title",
        }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync([
        "node", "ttteam", "ticket", "update", "TEST-1", "--title", "Updated title",
      ]);

      expect(mockClient.updateTicket).toHaveBeenCalledWith("t-1", {
        title: "Updated title",
        description: sampleTicket.description,
      });
      expect(logSpy.mock.calls[0][0]).toContain("Updated TEST-1");
    });

    it("throws when neither title nor description is provided", async () => {
      const mockClient = {};
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync([
        "node", "ttteam", "ticket", "update", "TEST-1",
      ]);

      expect(exitSpy).toHaveBeenCalled();
    });
  });

  describe("ticket assign", () => {
    it("assigns a ticket to a member", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      mockResolveMember.mockResolvedValue({
        user: { id: "u-2", email: "bob@x.com", display_name: "Bob" },
      } as never);
      const mockClient = {
        assignTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "assign", "TEST-1", "bob@x.com"]);

      expect(mockClient.assignTicket).toHaveBeenCalledWith("t-1", { assignee_id: "u-2" });
      expect(logSpy.mock.calls[0][0]).toContain("bob@x.com");
    });
  });

  describe("ticket unassign", () => {
    it("clears the assignee", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        assignTicket: vi.fn().mockResolvedValue({ ...sampleTicket, assignee_id: null }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "unassign", "TEST-1"]);

      expect(mockClient.assignTicket).toHaveBeenCalledWith("t-1", { assignee_id: null });
      expect(logSpy.mock.calls[0][0]).toContain("Unassigned TEST-1");
    });
  });

  describe("ticket close", () => {
    it("closes a ticket", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        closeTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "close", "TEST-1"]);

      expect(mockClient.closeTicket).toHaveBeenCalledWith("t-1");
      expect(logSpy.mock.calls[0][0]).toContain("TEST-1");
    });
  });

  describe("ticket reopen", () => {
    it("reopens a ticket to default column", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        getColumns: vi.fn().mockResolvedValue([
          { id: "col-1", name: "To Do", position: 0 },
          { id: "col-2", name: "Done", position: 2 },
        ]),
        reopenTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "reopen", "TEST-1"]);

      expect(mockClient.reopenTicket).toHaveBeenCalledWith("t-1", { to_column_id: "col-1" });
    });

    it("reopens a ticket to specified column", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      mockResolveColumn.mockResolvedValue({ id: "col-2", name: "In Progress", position: 1 } as never);
      const mockClient = {
        reopenTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "reopen", "TEST-1", "--column", "In Progress"]);

      expect(mockClient.reopenTicket).toHaveBeenCalledWith("t-1", { to_column_id: "col-2" });
    });
  });

  describe("ticket delete", () => {
    it("deletes a ticket", async () => {
      mockResolveTicket.mockResolvedValue(sampleTicket as never);
      const mockClient = {
        deleteTicket: vi.fn().mockResolvedValue(sampleTicket),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "ticket", "delete", "TEST-1"]);

      expect(mockClient.deleteTicket).toHaveBeenCalledWith("t-1");
      expect(logSpy.mock.calls[0][0]).toContain("Deleted TEST-1");
    });
  });
});
