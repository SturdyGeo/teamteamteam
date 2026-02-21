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

describe("Tag CRUD (integration)", () => {
  let user: TestUser;
  let projectId: string;
  let ticketId: string;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    user = await createTestUser(admin, "tag-crud@test.local");
    const org = await createOrg(app, user, "Tag Test Org");
    const project = await createProject(
      app,
      user,
      org.id as string,
      "Tag Project",
      "TAG",
    );
    projectId = project.id as string;
    const ticket = await createTicket(app, user, projectId, "Tag test ticket");
    ticketId = ticket.id as string;
  });

  it("creates tags implicitly via ticket tagging", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/tags`,
      user.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ tag: "Feature" }),
      },
    );
    expect(res.status).toBe(201);

    // Tag should appear in the project tag list
    const tagsRes = await authRequest(
      app,
      `/projects/${projectId}/tags`,
      user.accessToken,
    );
    const tags = (await tagsRes.json()) as Record<string, unknown>[];
    const featureTag = tags.find((t) => t.name === "feature");
    expect(featureTag).toBeDefined();
  });

  it("normalizes tags (lowercase, trim)", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/tags`,
      user.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ tag: "  BUG  " }),
      },
    );
    expect(res.status).toBe(201);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.tags).toContain("bug");
  });

  it("rejects duplicate tag on same ticket (409)", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/tags`,
      user.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ tag: "bug" }),
      },
    );
    expect(res.status).toBe(409);
  });

  it("removing tag from ticket doesn't delete the project tag", async () => {
    // Remove "feature" tag from ticket
    const removeRes = await authRequest(
      app,
      `/tickets/${ticketId}/tags/feature`,
      user.accessToken,
      { method: "DELETE" },
    );
    expect(removeRes.status).toBe(200);

    // "feature" tag should still exist in project tags
    const tagsRes = await authRequest(
      app,
      `/projects/${projectId}/tags`,
      user.accessToken,
    );
    const tags = (await tagsRes.json()) as Record<string, unknown>[];
    const featureTag = tags.find((t) => t.name === "feature");
    expect(featureTag).toBeDefined();
  });
});
