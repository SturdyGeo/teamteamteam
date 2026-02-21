import { describe, it, expect, vi } from "vitest";
import {
  resolveTicket,
  resolveColumn,
  resolveMember,
  resolveProjectByPrefix,
  resolveOrg,
  resolveOrgId,
} from "../src/resolve.js";
import type { TeamteamteamClient } from "@teamteamteam/api-client";

vi.mock("../src/config.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}));

import { loadConfig } from "../src/config.js";

const mockLoadConfig = vi.mocked(loadConfig);

function mockClient(overrides: Partial<TeamteamteamClient> = {}): TeamteamteamClient {
  return overrides as TeamteamteamClient;
}

describe("resolve", () => {
  describe("resolveTicket", () => {
    it("resolves a valid ticket key", async () => {
      const client = mockClient({
        getTickets: vi.fn().mockResolvedValue([
          { id: "t-1", number: 42, title: "Fix bug" },
        ]),
      });
      const ticket = await resolveTicket(client, "proj-1", "PROJ-42");
      expect(ticket).toEqual({ id: "t-1", number: 42, title: "Fix bug" });
    });

    it("throws on invalid key format", async () => {
      const client = mockClient();
      await expect(resolveTicket(client, "proj-1", "invalid")).rejects.toThrow(
        'Invalid ticket key',
      );
    });

    it("throws when ticket not found", async () => {
      const client = mockClient({
        getTickets: vi.fn().mockResolvedValue([]),
      });
      await expect(resolveTicket(client, "proj-1", "PROJ-99")).rejects.toThrow(
        'not found',
      );
    });
  });

  describe("resolveColumn", () => {
    it("resolves column by case-insensitive name", async () => {
      const client = mockClient({
        getColumns: vi.fn().mockResolvedValue([
          { id: "col-1", name: "To Do", position: 0 },
          { id: "col-2", name: "In Progress", position: 1 },
        ]),
      });
      const col = await resolveColumn(client, "proj-1", "to do");
      expect(col.id).toBe("col-1");
    });

    it("throws when column not found and lists available", async () => {
      const client = mockClient({
        getColumns: vi.fn().mockResolvedValue([
          { id: "col-1", name: "To Do", position: 0 },
        ]),
      });
      await expect(resolveColumn(client, "proj-1", "Done")).rejects.toThrow(
        'Available columns: To Do',
      );
    });
  });

  describe("resolveMember", () => {
    it("resolves member by case-insensitive email", async () => {
      const client = mockClient({
        getMembers: vi.fn().mockResolvedValue([
          { user: { id: "u-1", email: "Alice@example.com", display_name: "Alice" } },
        ]),
      });
      const member = await resolveMember(client, "org-1", "alice@example.com");
      expect(member.user.id).toBe("u-1");
    });

    it("throws when member not found", async () => {
      const client = mockClient({
        getMembers: vi.fn().mockResolvedValue([]),
      });
      await expect(resolveMember(client, "org-1", "nobody@x.com")).rejects.toThrow(
        'not found',
      );
    });
  });

  describe("resolveProjectByPrefix", () => {
    it("resolves project by case-insensitive prefix", async () => {
      const client = mockClient({
        getProjects: vi.fn().mockResolvedValue([
          { id: "p-1", prefix: "PROJ", name: "Project" },
        ]),
      });
      const result = await resolveProjectByPrefix(client, "org-1", "proj");
      expect(result).toEqual({ id: "p-1", prefix: "PROJ" });
    });

    it("throws when project not found", async () => {
      const client = mockClient({
        getProjects: vi.fn().mockResolvedValue([]),
      });
      await expect(resolveProjectByPrefix(client, "org-1", "ZZZ")).rejects.toThrow(
        'not found',
      );
    });
  });

  describe("resolveOrg", () => {
    it("resolves org by exact UUID", async () => {
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-uuid-1", name: "Acme", membership_role: "owner" },
        ]),
      });
      const org = await resolveOrg(client, "org-uuid-1");
      expect(org.id).toBe("org-uuid-1");
    });

    it("resolves org by case-insensitive name", async () => {
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-1", name: "Acme Corp", membership_role: "owner" },
        ]),
      });
      const org = await resolveOrg(client, "acme corp");
      expect(org.id).toBe("org-1");
    });

    it("throws when org not found and lists available", async () => {
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-1", name: "Acme", membership_role: "owner" },
          { id: "org-2", name: "Beta", membership_role: "member" },
        ]),
      });
      await expect(resolveOrg(client, "missing")).rejects.toThrow(
        'Available orgs: Acme, Beta',
      );
    });
  });

  describe("resolveOrgId", () => {
    it("resolves flag by name", async () => {
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-1", name: "Acme", membership_role: "owner" },
        ]),
      });
      const id = await resolveOrgId(client, "Acme");
      expect(id).toBe("org-1");
    });

    it("falls back to config orgId", async () => {
      mockLoadConfig.mockResolvedValue({ orgId: "saved-org" });
      const client = mockClient();
      const id = await resolveOrgId(client);
      expect(id).toBe("saved-org");
    });

    it("auto-selects single org", async () => {
      mockLoadConfig.mockResolvedValue({});
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "only-org", name: "Solo", membership_role: "owner" },
        ]),
      });
      const id = await resolveOrgId(client);
      expect(id).toBe("only-org");
    });

    it("throws when no orgs found", async () => {
      mockLoadConfig.mockResolvedValue({});
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([]),
      });
      await expect(resolveOrgId(client)).rejects.toThrow(
        "ttteam org create",
      );
    });

    it("throws when multiple orgs and no default", async () => {
      mockLoadConfig.mockResolvedValue({});
      const client = mockClient({
        getOrgs: vi.fn().mockResolvedValue([
          { id: "org-1", name: "Acme", membership_role: "owner" },
          { id: "org-2", name: "Beta", membership_role: "member" },
        ]),
      });
      await expect(resolveOrgId(client)).rejects.toThrow(
        "ttteam org use",
      );
    });
  });
});
