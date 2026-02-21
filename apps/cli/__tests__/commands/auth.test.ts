import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerAuthCommands } from "../../src/commands/auth.js";

vi.mock("../../src/client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("node:readline", () => ({
  createInterface: vi.fn(() => ({
    question: (_prompt: string, cb: (answer: string) => void) => cb("123456"),
    close: vi.fn(),
  })),
}));

import { getClient } from "../../src/client.js";

const mockGetClient = vi.mocked(getClient);

function buildProgram(): Command {
  const program = new Command()
    .option("--json")
    .exitOverride();
  registerAuthCommands(program);
  return program;
}

describe("auth commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("sends login code and verifies OTP", async () => {
      const mockClient = {
        sendMagicLink: vi.fn().mockResolvedValue(undefined),
        verifyOtp: vi.fn().mockResolvedValue(undefined),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "login", "user@test.com"]);

      expect(mockClient.sendMagicLink).toHaveBeenCalledWith("user@test.com");
      expect(mockClient.verifyOtp).toHaveBeenCalledWith("user@test.com", "123456");
    });
  });

  describe("logout", () => {
    it("calls logout on client", async () => {
      const mockClient = { logout: vi.fn().mockResolvedValue(undefined) };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "logout"]);

      expect(mockClient.logout).toHaveBeenCalled();
    });
  });

  describe("whoami", () => {
    it("prints user info when logged in", async () => {
      const mockClient = {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "u-1", email: "user@test.com" },
        }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "whoami"]);

      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("user@test.com");
      expect(output).toContain("u-1");
    });

    it("outputs JSON when --json flag is set", async () => {
      const user = { id: "u-1", email: "user@test.com" };
      const mockClient = {
        getSession: vi.fn().mockResolvedValue({ user }),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "--json", "whoami"]);

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(user, null, 2));
    });

    it("throws error when not logged in", async () => {
      const mockClient = {
        getSession: vi.fn().mockResolvedValue(null),
      };
      mockGetClient.mockReturnValue(mockClient as never);

      const program = buildProgram();
      await program.parseAsync(["node", "ttteam", "whoami"]);

      // Should call process.exit(1) via handleError
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
