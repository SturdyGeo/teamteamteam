import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../../apps/api/src/app.js";
import { createAdminClient, createTestUser, type TestUser } from "../../helpers/setup.js";
import { truncateAllTables } from "../../helpers/cleanup.js";
import {
  authRequest,
  createOrg,
  createProject,
  createTicket,
} from "../../helpers/fixtures.js";

const app = createApp();

describe("Org CRUD (integration)", () => {
  let user: TestUser;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    user = await createTestUser(admin, "org-crud@test.local");
  });

  it("creates an org", async () => {
    const org = await createOrg(app, user, "Acme Corp");

    expect(org.id).toBeDefined();
    expect(org.name).toBe("Acme Corp");
    expect(org.created_at).toBeDefined();
    expect(org.updated_at).toBeDefined();
  });

  it("lists orgs for the authenticated user", async () => {
    const res = await authRequest(app, "/orgs", user.accessToken);
    expect(res.status).toBe(200);

    const orgs = (await res.json()) as Record<string, unknown>[];
    expect(orgs.length).toBeGreaterThanOrEqual(1);

    const acme = orgs.find((o) => o.name === "Acme Corp");
    expect(acme).toBeDefined();
    expect(acme!.membership_role).toBe("owner");
  });

  it("deletes an org", async () => {
    const org = await createOrg(app, user, "To Delete");

    const deleteRes = await authRequest(
      app,
      `/orgs/${org.id}`,
      user.accessToken,
      { method: "DELETE" },
    );
    expect(deleteRes.status).toBe(200);

    // Verify it no longer appears in the list
    const listRes = await authRequest(app, "/orgs", user.accessToken);
    const orgs = (await listRes.json()) as Record<string, unknown>[];
    const found = orgs.find((o) => o.id === org.id);
    expect(found).toBeUndefined();
  });

  it("cascade-deletes projects and tickets when org is deleted", async () => {
    const org = await createOrg(app, user, "Cascade Test Org");
    const project = await createProject(app, user, org.id as string, "Cascade Project", "CAS");
    await createTicket(app, user, project.id as string, "Ticket in doomed org");

    // Delete org
    const deleteRes = await authRequest(
      app,
      `/orgs/${org.id}`,
      user.accessToken,
      { method: "DELETE" },
    );
    expect(deleteRes.status).toBe(200);

    // Verify project is gone (empty list since org is deleted)
    const projectsRes = await authRequest(
      app,
      `/orgs/${org.id}/projects`,
      user.accessToken,
    );
    const projects = (await projectsRes.json()) as Record<string, unknown>[];
    expect(projects).toHaveLength(0);

    // Verify tickets are gone
    const ticketsRes = await authRequest(
      app,
      `/projects/${project.id}/tickets`,
      user.accessToken,
    );
    const tickets = (await ticketsRes.json()) as Record<string, unknown>[];
    expect(tickets).toHaveLength(0);
  });
});
