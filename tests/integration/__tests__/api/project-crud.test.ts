import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../../apps/api/src/app.js";
import { createAdminClient, createTestUser, type TestUser } from "../../helpers/setup.js";
import { truncateAllTables } from "../../helpers/cleanup.js";
import {
  authRequest,
  createOrg,
  createProject,
  getColumns,
  createTicket,
} from "../../helpers/fixtures.js";

const app = createApp();

describe("Project CRUD (integration)", () => {
  let user: TestUser;
  let orgId: string;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    user = await createTestUser(admin, "project-crud@test.local");
    const org = await createOrg(app, user, "Project Test Org");
    orgId = org.id as string;
  });

  it("creates a project with 4 default columns", async () => {
    const project = await createProject(app, user, orgId, "Frontend", "FE");

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Frontend");
    expect(project.prefix).toBe("FE");
    expect(project.org_id).toBe(orgId);

    // Verify default columns
    const cols = await getColumns(app, user, project.id as string);
    expect(cols).toHaveLength(4);

    const names = cols.map((c) => c.name);
    expect(names).toEqual(["Backlog", "To Do", "In Progress", "Done"]);
  });

  it("rejects duplicate prefix within the same org (409)", async () => {
    await createProject(app, user, orgId, "Backend", "BE");

    const res = await authRequest(
      app,
      `/orgs/${orgId}/projects`,
      user.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ name: "Backend 2", prefix: "BE" }),
      },
    );
    expect(res.status).toBe(409);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });

  it("lists projects in an org", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgId}/projects`,
      user.accessToken,
    );
    expect(res.status).toBe(200);

    const projects = (await res.json()) as Record<string, unknown>[];
    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects.every((p) => p.org_id === orgId)).toBe(true);
  });

  it("deletes a project with cascade", async () => {
    const project = await createProject(app, user, orgId, "Doomed Project", "DPR");
    await createTicket(app, user, project.id as string, "Doomed ticket");

    const deleteRes = await authRequest(
      app,
      `/orgs/${orgId}/projects/${project.id}`,
      user.accessToken,
      { method: "DELETE" },
    );
    expect(deleteRes.status).toBe(200);

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
