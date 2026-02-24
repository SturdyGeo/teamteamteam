import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp, DEFAULT_USER } from "../helpers/test-app.js";
import { tickets } from "../../src/routes/tickets.js";

const PROJECT_ID = "00000000-0000-0000-0000-000000000010";
const TICKET_ID = "00000000-0000-0000-0000-000000000100";
const COLUMN_A = "00000000-0000-0000-0000-00000000000a";
const COLUMN_B = "00000000-0000-0000-0000-00000000000b";
const COLUMN_DONE = "00000000-0000-0000-0000-00000000000c";
const ASSIGNEE_ID = "00000000-0000-0000-0000-000000000002";

const COLUMNS = [
  { id: COLUMN_A, project_id: PROJECT_ID, name: "To Do", position: 0, created_at: "2026-01-01T00:00:00.000Z" },
  { id: COLUMN_B, project_id: PROJECT_ID, name: "In Progress", position: 1, created_at: "2026-01-01T00:00:00.000Z" },
  { id: COLUMN_DONE, project_id: PROJECT_ID, name: "Done", position: 2, created_at: "2026-01-01T00:00:00.000Z" },
];

function rawTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    project_id: PROJECT_ID,
    number: 1,
    title: "Test",
    description: "",
    status_column_id: COLUMN_A,
    assignee_id: null,
    reporter_id: DEFAULT_USER.id,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    closed_at: null,
    ticket_tags: [],
    ...overrides,
  };
}

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(tickets, createMockSupabase(results));
}

function post(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function patch(body?: unknown) {
  if (body === undefined) return { method: "PATCH" as const };
  return {
    method: "PATCH" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// GET /projects/:projectId/tickets
// ---------------------------------------------------------------------------

describe("GET /projects/:projectId/tickets", () => {
  it("returns enriched, sorted tickets", async () => {
    const app = setup([{
      data: [
        rawTicket({ id: "t-1", number: 1, updated_at: "2026-01-01T00:00:00.000Z" }),
        rawTicket({ id: "t-2", number: 2, updated_at: "2026-01-02T00:00:00.000Z" }),
      ],
      error: null,
    }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tickets`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    // Most recently updated should sort first
    expect(body[0].id).toBe("t-2");
    expect(body[1].id).toBe("t-1");
    // Enrichment: ticket_tags removed, tags added
    expect(body[0]).toHaveProperty("tags");
    expect(body[0]).not.toHaveProperty("ticket_tags");
  });

  it("returns empty array", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tickets`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tickets`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// GET /tickets/:ticketId
// ---------------------------------------------------------------------------

describe("GET /tickets/:ticketId", () => {
  it("returns enriched ticket", async () => {
    const app = setup([{
      data: rawTicket({ ticket_tags: [{ tags: { name: "bug" } }] }),
      error: null,
    }]);

    const res = await app.request(`/tickets/${TICKET_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tags).toEqual(["bug"]);
    expect(body).not.toHaveProperty("ticket_tags");
  });

  it("returns 404 when ticket not found (PGRST116)", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 on other DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/tickets/${TICKET_ID}`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// POST /projects/:projectId/tickets
// ---------------------------------------------------------------------------

describe("POST /projects/:projectId/tickets", () => {
  it("creates ticket and returns 201", async () => {
    const app = setup([
      { data: COLUMNS, error: null },        // columns query
      { data: 1, error: null },               // rpc next_ticket_number
      { data: null, error: null },            // ticket insert
      { data: null, error: null },            // activity event
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "New ticket" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("New ticket");
    expect(body.status_column_id).toBe(COLUMN_A); // initial column
    expect(body.project_id).toBe(PROJECT_ID);
  });

  it("returns 400 when title is missing", async () => {
    const app = setup([]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({}),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when project has no workflow columns", async () => {
    const app = setup([
      { data: [], error: null },  // empty columns
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "Test" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 500 when columns query fails", async () => {
    const app = setup([
      { data: null, error: { message: "columns error" } },
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "Test" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 when RPC fails", async () => {
    const app = setup([
      { data: COLUMNS, error: null },
      { data: null, error: { message: "rpc failed" } },
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "Test" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 when ticket insert fails", async () => {
    const app = setup([
      { data: COLUMNS, error: null },
      { data: 1, error: null },
      { data: null, error: { message: "insert failed" } },
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "Test" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("retries number allocation after duplicate project ticket key conflict", async () => {
    const app = setup([
      { data: COLUMNS, error: null }, // columns query
      { data: 1, error: null }, // rpc next_ticket_number (stale under race)
      {
        data: null,
        error: {
          message: 'duplicate key value violates unique constraint "tickets_project_id_number_key"',
          code: "23505",
        },
      }, // ticket insert duplicate
      { data: 2, error: null }, // rpc next_ticket_number retry
      { data: null, error: null }, // ticket insert succeeds
      { data: null, error: null }, // activity event
    ]);

    const res = await app.request(
      `/projects/${PROJECT_ID}/tickets`,
      post({ title: "Retry me" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Retry me");
    expect(body.number).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PATCH /tickets/:ticketId
// ---------------------------------------------------------------------------

describe("PATCH /tickets/:ticketId", () => {
  it("updates ticket title and description", async () => {
    const app = setup([
      { data: rawTicket(), error: null },           // ticket fetch
      { data: null, error: null },                  // ticket update
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}`,
      patch({ title: "Updated title", description: "Updated description" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated title");
    expect(body.description).toBe("Updated description");
  });

  it("returns 400 when title is missing", async () => {
    const app = setup([]);

    const res = await app.request(
      `/tickets/${TICKET_ID}`,
      patch({ description: "Only description" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}`,
      patch({ title: "Updated title", description: "Updated description" }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when ticket update fails", async () => {
    const app = setup([
      { data: rawTicket(), error: null },
      { data: null, error: { message: "update failed" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}`,
      patch({ title: "Updated title", description: "Updated description" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PATCH /tickets/:ticketId/move
// ---------------------------------------------------------------------------

describe("PATCH /tickets/:ticketId/move", () => {
  it("returns moved ticket", async () => {
    const app = setup([
      { data: rawTicket(), error: null },           // ticket fetch
      { data: COLUMNS, error: null },               // columns fetch
      { data: null, error: null },                  // ticket update
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status_column_id).toBe(COLUMN_B);
    expect(body.closed_at).toBeNull();
  });

  it("auto-closes ticket when moved into Done column", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: null }), error: null }, // ticket fetch
      { data: COLUMNS, error: null },                        // columns fetch
      { data: null, error: null },                           // ticket update
      { data: null, error: null },                           // status_changed event
      { data: null, error: null },                           // ticket_closed event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_DONE }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status_column_id).toBe(COLUMN_DONE);
    expect(body.closed_at).not.toBeNull();
  });

  it("auto-reopens ticket when moved out of Done column", async () => {
    const app = setup([
      {
        data: rawTicket({
          status_column_id: COLUMN_DONE,
          closed_at: "2026-01-01T00:10:00.000Z",
        }),
        error: null,
      },
      { data: COLUMNS, error: null },             // columns fetch
      { data: null, error: null },                // ticket update
      { data: null, error: null },                // status_changed event
      { data: null, error: null },                // ticket_reopened event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status_column_id).toBe(COLUMN_B);
    expect(body.closed_at).toBeNull();
  });

  it("returns 400 when to_column_id is missing", async () => {
    const app = setup([]);

    const res = await app.request(`/tickets/${TICKET_ID}/move`, patch({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when ticket is already in that column (SAME_COLUMN)", async () => {
    const app = setup([
      { data: rawTicket(), error: null },           // ticket in COLUMN_A
      { data: COLUMNS, error: null },               // columns
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_A }),            // same column
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("SAME_COLUMN");
  });

  it("returns 500 when columns query fails", async () => {
    const app = setup([
      { data: rawTicket(), error: null },
      { data: null, error: { message: "columns error" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 when ticket update fails", async () => {
    const app = setup([
      { data: rawTicket(), error: null },
      { data: COLUMNS, error: null },
      { data: null, error: { message: "update failed" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/move`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// DELETE /tickets/:ticketId
// ---------------------------------------------------------------------------

describe("DELETE /tickets/:ticketId", () => {
  it("deletes ticket and returns deleted ticket", async () => {
    const app = setup([
      { data: rawTicket(), error: null }, // ticket fetch
      { data: null, error: null },        // delete
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(TICKET_ID);
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when delete fails", async () => {
    const app = setup([
      { data: rawTicket(), error: null },
      { data: null, error: { message: "delete failed" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}`, { method: "DELETE" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PATCH /tickets/:ticketId/assign
// ---------------------------------------------------------------------------

describe("PATCH /tickets/:ticketId/assign", () => {
  it("returns assigned ticket", async () => {
    const app = setup([
      { data: rawTicket(), error: null },           // ticket fetch (assignee_id: null)
      { data: null, error: null },                  // ticket update
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/assign`,
      patch({ assignee_id: ASSIGNEE_ID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignee_id).toBe(ASSIGNEE_ID);
  });

  it("returns 400 when assignee_id is missing", async () => {
    const app = setup([]);

    const res = await app.request(`/tickets/${TICKET_ID}/assign`, patch({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/assign`,
      patch({ assignee_id: ASSIGNEE_ID }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when assignee is the same (SAME_ASSIGNEE)", async () => {
    const app = setup([
      { data: rawTicket({ assignee_id: ASSIGNEE_ID }), error: null },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/assign`,
      patch({ assignee_id: ASSIGNEE_ID }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("SAME_ASSIGNEE");
  });

  it("returns 500 when ticket update fails", async () => {
    const app = setup([
      { data: rawTicket(), error: null },
      { data: null, error: { message: "update failed" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/assign`,
      patch({ assignee_id: ASSIGNEE_ID }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PATCH /tickets/:ticketId/close
// ---------------------------------------------------------------------------

describe("PATCH /tickets/:ticketId/close", () => {
  it("returns closed ticket", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: null }), error: null },
      { data: null, error: null },                  // ticket update
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/close`, patch());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.closed_at).not.toBeNull();
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/close`, patch());
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when ticket is already closed (TICKET_ALREADY_CLOSED)", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: "2026-01-01T00:00:00.000Z" }), error: null },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/close`, patch());
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TICKET_ALREADY_CLOSED");
  });

  it("returns 500 when ticket update fails", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: null }), error: null },
      { data: null, error: { message: "update failed" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/close`, patch());
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PATCH /tickets/:ticketId/reopen
// ---------------------------------------------------------------------------

describe("PATCH /tickets/:ticketId/reopen", () => {
  it("returns reopened ticket", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: "2026-01-01T00:00:00.000Z" }), error: null },
      { data: COLUMNS, error: null },               // columns fetch
      { data: null, error: null },                  // ticket update
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/reopen`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.closed_at).toBeNull();
    expect(body.status_column_id).toBe(COLUMN_B);
  });

  it("returns 400 when to_column_id is missing", async () => {
    const app = setup([]);

    const res = await app.request(`/tickets/${TICKET_ID}/reopen`, patch({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/reopen`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when ticket is not closed (TICKET_NOT_CLOSED)", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: null }), error: null },  // ticket is open
      { data: COLUMNS, error: null },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/reopen`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TICKET_NOT_CLOSED");
  });

  it("returns 500 when columns query fails", async () => {
    const app = setup([
      { data: rawTicket({ closed_at: "2026-01-01T00:00:00.000Z" }), error: null },
      { data: null, error: { message: "columns error" } },
    ]);

    const res = await app.request(
      `/tickets/${TICKET_ID}/reopen`,
      patch({ to_column_id: COLUMN_B }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
