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

describe("Ticket Lifecycle (integration)", () => {
  let user: TestUser;
  let projectId: string;
  let columns: Record<string, unknown>[];
  let backlogColumnId: string;
  let todoColumnId: string;
  let firstTicketId: string;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    user = await createTestUser(admin, "ticket-lifecycle@test.local");
    const org = await createOrg(app, user, "Ticket Test Org");
    const project = await createProject(
      app,
      user,
      org.id as string,
      "Main Project",
      "MAIN",
    );
    projectId = project.id as string;
    columns = await getColumns(app, user, projectId);
    backlogColumnId = columns.find((c) => c.name === "Backlog")!.id as string;
    todoColumnId = columns.find((c) => c.name === "To Do")!.id as string;
  });

  it("creates a ticket with number=1 in the first column", async () => {
    const ticket = await createTicket(app, user, projectId, "First ticket");

    expect(ticket.number).toBe(1);
    expect(ticket.title).toBe("First ticket");
    expect(ticket.status_column_id).toBe(backlogColumnId);
    expect(ticket.reporter_id).toBe(user.id);
    expect(ticket.assignee_id).toBeNull();
    expect(ticket.closed_at).toBeNull();

    firstTicketId = ticket.id as string;
  });

  it("creates a second ticket with number=2 (advisory lock)", async () => {
    const ticket = await createTicket(app, user, projectId, "Second ticket");

    expect(ticket.number).toBe(2);
  });

  it("moves a ticket to a different column", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/move`,
      user.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ to_column_id: todoColumnId }),
      },
    );
    expect(res.status).toBe(200);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.status_column_id).toBe(todoColumnId);
  });

  it("assigns a ticket", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/assign`,
      user.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ assignee_id: user.id }),
      },
    );
    expect(res.status).toBe(200);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.assignee_id).toBe(user.id);
  });

  it("adds a tag to a ticket", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/tags`,
      user.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ tag: "Bug" }),
      },
    );
    expect(res.status).toBe(201);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.tags).toContain("bug");
  });

  it("removes a tag from a ticket", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/tags/bug`,
      user.accessToken,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect((ticket.tags as string[]).includes("bug")).toBe(false);
  });

  it("closes a ticket", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/close`,
      user.accessToken,
      { method: "PATCH" },
    );
    expect(res.status).toBe(200);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.closed_at).toBeDefined();
    expect(ticket.closed_at).not.toBeNull();
  });

  it("reopens a closed ticket", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/reopen`,
      user.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ to_column_id: backlogColumnId }),
      },
    );
    expect(res.status).toBe(200);

    const ticket = (await res.json()) as Record<string, unknown>;
    expect(ticket.closed_at).toBeNull();
    expect(ticket.status_column_id).toBe(backlogColumnId);
  });

  it("filters tickets by assignee", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectId}/tickets?assignee_id=${user.id}`,
      user.accessToken,
    );
    expect(res.status).toBe(200);

    const tickets = (await res.json()) as Record<string, unknown>[];
    expect(tickets.length).toBe(1);
    expect(tickets[0].id).toBe(firstTicketId);
  });

  it("filters tickets by column", async () => {
    const res = await authRequest(
      app,
      `/projects/${projectId}/tickets?status_column_id=${backlogColumnId}`,
      user.accessToken,
    );
    expect(res.status).toBe(200);

    const tickets = (await res.json()) as Record<string, unknown>[];
    // First ticket was reopened to Backlog, second is in Backlog by default
    expect(tickets.length).toBe(2);
  });

  it("verifies activity events in order", async () => {
    const res = await authRequest(
      app,
      `/tickets/${firstTicketId}/activity`,
      user.accessToken,
    );
    expect(res.status).toBe(200);

    const events = (await res.json()) as Record<string, unknown>[];
    const eventTypes = events.map((e) => e.event_type);

    expect(eventTypes).toEqual([
      "ticket_created",
      "status_changed",
      "assignee_changed",
      "tag_added",
      "tag_removed",
      "ticket_closed",
      "ticket_reopened",
    ]);

    // Every event has the correct actor
    for (const event of events) {
      expect(event.actor_id).toBe(user.id);
    }
  });
});
