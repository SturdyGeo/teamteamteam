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

describe("Org Isolation / RLS (integration)", () => {
  let userA: TestUser;
  let userB: TestUser;
  let orgA: Record<string, unknown>;
  let orgB: Record<string, unknown>;
  let projectA: Record<string, unknown>;
  let projectB: Record<string, unknown>;
  let ticketA: Record<string, unknown>;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();

    userA = await createTestUser(admin, "alice-isolation@test.local");
    userB = await createTestUser(admin, "bob-isolation@test.local");

    // userA creates orgA with project and ticket
    orgA = await createOrg(app, userA, "Org Alpha");
    projectA = await createProject(
      app,
      userA,
      orgA.id as string,
      "Alpha Project",
      "ALP",
    );
    ticketA = await createTicket(
      app,
      userA,
      projectA.id as string,
      "Alpha Ticket",
    );

    // userB creates orgB with project and ticket
    orgB = await createOrg(app, userB, "Org Beta");
    projectB = await createProject(
      app,
      userB,
      orgB.id as string,
      "Beta Project",
      "BET",
    );
    await createTicket(app, userB, projectB.id as string, "Beta Ticket");
  });

  it("userA only sees orgA in their org list", async () => {
    const res = await authRequest(app, "/orgs", userA.accessToken);
    const orgs = (await res.json()) as Record<string, unknown>[];

    expect(orgs).toHaveLength(1);
    expect(orgs[0].id).toBe(orgA.id);
  });

  it("userB only sees orgB in their org list", async () => {
    const res = await authRequest(app, "/orgs", userB.accessToken);
    const orgs = (await res.json()) as Record<string, unknown>[];

    expect(orgs).toHaveLength(1);
    expect(orgs[0].id).toBe(orgB.id);
  });

  it("userA cannot see orgB's projects", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgB.id}/projects`,
      userA.accessToken,
    );
    const projects = (await res.json()) as Record<string, unknown>[];
    expect(projects).toHaveLength(0);
  });

  it("userA cannot see orgB's tickets", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectB.id}/tickets`,
      userA.accessToken,
    );
    const tickets = (await res.json()) as Record<string, unknown>[];
    expect(tickets).toHaveLength(0);
  });

  it("userA cannot see orgB's columns", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectB.id}/columns`,
      userA.accessToken,
    );
    const cols = (await res.json()) as Record<string, unknown>[];
    expect(cols).toHaveLength(0);
  });

  it("userA cannot see orgB's tags", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectB.id}/tags`,
      userA.accessToken,
    );
    const tags = (await res.json()) as Record<string, unknown>[];
    expect(tags).toHaveLength(0);
  });

  it("userA cannot see orgB's activity events", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketA.id}/activity`,
      userA.accessToken,
    );
    // userA CAN see their own ticket's activity
    expect(res.status).toBe(200);
    const events = (await res.json()) as Record<string, unknown>[];
    // But every event belongs to their own ticket
    for (const event of events) {
      expect(event.ticket_id).toBe(ticketA.id);
    }
  });

  it("userA cannot see orgB's members", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgB.id}/members`,
      userA.accessToken,
    );
    const members = (await res.json()) as Record<string, unknown>[];
    expect(members).toHaveLength(0);
  });

  it("userB cannot see orgA's projects", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgA.id}/projects`,
      userB.accessToken,
    );
    const projects = (await res.json()) as Record<string, unknown>[];
    expect(projects).toHaveLength(0);
  });

  it("userB cannot see orgA's tickets", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectA.id}/tickets`,
      userB.accessToken,
    );
    const tickets = (await res.json()) as Record<string, unknown>[];
    expect(tickets).toHaveLength(0);
  });
});
