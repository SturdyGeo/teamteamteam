import { describe, it, expect, beforeAll } from "vitest";
import pg from "pg";
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

describe("Activity Events (integration)", () => {
  let user: TestUser;
  let projectId: string;
  let ticketId: string;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    user = await createTestUser(admin, "activity-events@test.local");
    const org = await createOrg(app, user, "Activity Test Org");
    const project = await createProject(
      app,
      user,
      org.id as string,
      "Activity Project",
      "ACT",
    );
    projectId = project.id as string;
    const ticket = await createTicket(app, user, projectId, "Activity test ticket");
    ticketId = ticket.id as string;
  });

  it("ticket_created event is recorded on creation", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/activity`,
      user.accessToken,
    );
    expect(res.status).toBe(200);

    const events = (await res.json()) as Record<string, unknown>[];
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].event_type).toBe("ticket_created");
    expect(events[0].actor_id).toBe(user.id);
  });

  it("each mutation produces the correct event type", async () => {
    // Move ticket
    const cols = await authRequest(
      app,
      `/projects/${projectId}/columns`,
      user.accessToken,
    );
    const columns = (await cols.json()) as Record<string, unknown>[];
    const todoCol = columns.find((c) => c.name === "To Do")!;

    await authRequest(app, `/tickets/${ticketId}/move`, user.accessToken, {
      method: "PATCH",
      body: JSON.stringify({ to_column_id: todoCol.id }),
    });

    // Assign
    await authRequest(app, `/tickets/${ticketId}/assign`, user.accessToken, {
      method: "PATCH",
      body: JSON.stringify({ assignee_id: user.id }),
    });

    // Close
    await authRequest(app, `/tickets/${ticketId}/close`, user.accessToken, {
      method: "PATCH",
    });

    // Check all events
    const activityRes = await authRequest(
      app,
      `/tickets/${ticketId}/activity`,
      user.accessToken,
    );
    const events = (await activityRes.json()) as Record<string, unknown>[];
    const types = events.map((e) => e.event_type);

    expect(types).toContain("ticket_created");
    expect(types).toContain("status_changed");
    expect(types).toContain("assignee_changed");
    expect(types).toContain("ticket_closed");
  });

  it("events have correct actor_id", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/activity`,
      user.accessToken,
    );
    const events = (await res.json()) as Record<string, unknown>[];

    for (const event of events) {
      expect(event.actor_id).toBe(user.id);
    }
  });

  it("activity events include actor details", async () => {
    const res = await authRequest(
      app,
      `/tickets/${ticketId}/activity`,
      user.accessToken,
    );
    const events = (await res.json()) as Record<string, unknown>[];

    for (const event of events) {
      const actor = event.actor as Record<string, unknown>;
      expect(actor).toBeDefined();
      expect(actor.id).toBe(user.id);
      expect(actor.email).toBe(user.email);
    }
  });

  it("rejects UPDATE on activity_events (append-only trigger)", async () => {
    const databaseUrl =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await expect(
        client.query(
          `UPDATE public.activity_events SET payload = '{}' WHERE ticket_id = $1`,
          [ticketId],
        ),
      ).rejects.toThrow(/append-only/i);
    } finally {
      await client.end();
    }
  });

  it("rejects DELETE on activity_events (append-only trigger)", async () => {
    const databaseUrl =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await expect(
        client.query(
          `DELETE FROM public.activity_events WHERE ticket_id = $1`,
          [ticketId],
        ),
      ).rejects.toThrow(/append-only/i);
    } finally {
      await client.end();
    }
  });

  it("events are cascade-deleted when ticket is deleted", async () => {
    // Create a separate ticket to delete
    const ticket2 = await createTicket(
      app,
      user,
      projectId,
      "Ticket to delete for events test",
    );
    const ticket2Id = ticket2.id as string;

    // Verify it has events
    const beforeRes = await authRequest(
      app,
      `/tickets/${ticket2Id}/activity`,
      user.accessToken,
    );
    const beforeEvents = (await beforeRes.json()) as Record<string, unknown>[];
    expect(beforeEvents.length).toBeGreaterThan(0);

    // Delete via direct Postgres (no API endpoint for ticket delete)
    const databaseUrl =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await client.query("DELETE FROM public.tickets WHERE id = $1", [
        ticket2Id,
      ]);
    } finally {
      await client.end();
    }

    // Events should be gone (ticket not found, so activity returns empty)
    const afterRes = await authRequest(
      app,
      `/tickets/${ticket2Id}/activity`,
      user.accessToken,
    );
    const afterEvents = (await afterRes.json()) as Record<string, unknown>[];
    expect(afterEvents).toHaveLength(0);
  });
});
