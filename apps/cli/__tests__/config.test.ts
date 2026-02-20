import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getDefaultOrgId, getDefaultProjectId } from "../src/config.js";
import * as fs from "node:fs/promises";
import { join } from "node:path";

vi.mock("node:fs/promises");
vi.mock("node:os", () => ({ homedir: vi.fn(() => "/home/testuser") }));

const mockFs = vi.mocked(fs);

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env["XDG_CONFIG_HOME"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("returns parsed config from file", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ orgId: "org-1", projectId: "proj-1" }),
      );
      const config = await loadConfig();
      expect(config).toEqual({ orgId: "org-1", projectId: "proj-1" });
    });

    it("returns empty object on missing file", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it("returns empty object on corrupt JSON", async () => {
      mockFs.readFile.mockResolvedValue("not json");
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it("uses XDG_CONFIG_HOME when set", async () => {
      process.env["XDG_CONFIG_HOME"] = "/custom/config";
      mockFs.readFile.mockResolvedValue("{}");
      await loadConfig();
      expect(mockFs.readFile).toHaveBeenCalledWith(
        "/custom/config/candoo/config.json",
        "utf-8",
      );
    });
  });

  describe("saveConfig", () => {
    it("writes config with restricted permissions", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();
      await saveConfig({ orgId: "org-1" });
      const expectedPath = join("/home/testuser", ".config", "candoo", "config.json");
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        join("/home/testuser", ".config", "candoo"),
        { recursive: true },
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify({ orgId: "org-1" }, null, 2),
        { mode: 0o600 },
      );
    });
  });

  describe("getDefaultOrgId", () => {
    it("returns flag when provided", async () => {
      expect(await getDefaultOrgId("flag-org")).toBe("flag-org");
    });

    it("returns config orgId when no flag", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ orgId: "config-org" }));
      expect(await getDefaultOrgId()).toBe("config-org");
    });

    it("throws when no flag and no config", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
      await expect(getDefaultOrgId()).rejects.toThrow("No org specified");
    });
  });

  describe("getDefaultProjectId", () => {
    it("returns flag when provided", async () => {
      expect(await getDefaultProjectId("flag-proj")).toBe("flag-proj");
    });

    it("returns config projectId when no flag", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ projectId: "config-proj" }));
      expect(await getDefaultProjectId()).toBe("config-proj");
    });

    it("throws when no flag and no config", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
      await expect(getDefaultProjectId()).rejects.toThrow("No project specified");
    });
  });
});
