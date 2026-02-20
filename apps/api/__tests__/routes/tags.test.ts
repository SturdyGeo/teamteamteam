import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp, DEFAULT_USER } from "../helpers/test-app.js";
import { tags } from "../../src/routes/tags.js";

const PROJECT_ID = "00000000-0000-0000-0000-000000000010";
const TICKET_ID = "00000000-0000-0000-0000-000000000100";

const RAW_TICKET_NO_TAGS = {
  id: TICKET_ID,
  project_id: PROJECT_ID,
  number: 1,
  title: "Test ticket",
  description: "",
  status_column_id: "00000000-0000-0000-0000-00000000000a",
  priority: "P2",
  assignee_id: null,
  reporter_id: DEFAULT_USER.id,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  closed_at: null,
  ticket_tags: [],
};

const RAW_TICKET_WITH_BUG = {
  ...RAW_TICKET_NO_TAGS,
  ticket_tags: [{ tags: { name: "bug" } }],
};

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(tags, createMockSupabase(results));
}

function post(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// GET /projects/:projectId/tags
// ---------------------------------------------------------------------------

describe("GET /projects/:projectId/tags", () => {
  it("returns tags", async () => {
    const data = [
      { id: "tag-1", project_id: PROJECT_ID, name: "bug", created_at: "2026-01-01T00:00:00.000Z" },
      { id: "tag-2", project_id: PROJECT_ID, name: "feature", created_at: "2026-01-01T00:00:00.000Z" },
    ];
    const app = setup([{ data, error: null }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tags`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  it("returns empty array", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tags`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/projects/${PROJECT_ID}/tags`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// POST /tickets/:ticketId/tags
// ---------------------------------------------------------------------------

describe("POST /tickets/:ticketId/tags", () => {
  it("adds tag and returns 201", async () => {
    const app = setup([
      { data: RAW_TICKET_NO_TAGS, error: null },   // ticket fetch
      { data: { id: "tag-1" }, error: null },       // tag upsert
      { data: null, error: null },                  // ticket_tags insert
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "bug" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tags).toContain("bug");
  });

  it("returns 400 when tag is empty", async () => {
    const app = setup([]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "bug" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when tag already exists on ticket", async () => {
    const app = setup([
      { data: RAW_TICKET_WITH_BUG, error: null },  // ticket already has "bug"
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "bug" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TAG_ALREADY_EXISTS");
  });

  it("returns 500 when tag upsert fails", async () => {
    const app = setup([
      { data: RAW_TICKET_NO_TAGS, error: null },
      { data: null, error: { message: "upsert failed" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "bug" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 when ticket_tags insert fails", async () => {
    const app = setup([
      { data: RAW_TICKET_NO_TAGS, error: null },
      { data: { id: "tag-1" }, error: null },
      { data: null, error: { message: "join insert failed" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags`, post({ tag: "bug" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

// ---------------------------------------------------------------------------
// DELETE /tickets/:ticketId/tags/:tag
// ---------------------------------------------------------------------------

describe("DELETE /tickets/:ticketId/tags/:tag", () => {
  it("removes tag and returns updated ticket", async () => {
    const app = setup([
      { data: RAW_TICKET_WITH_BUG, error: null },  // ticket fetch
      { data: { id: "tag-1" }, error: null },       // tag lookup
      { data: null, error: null },                  // ticket_tags delete
      { data: null, error: null },                  // activity event
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags/bug`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tags).not.toContain("bug");
  });

  it("returns 404 when ticket not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags/bug`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when tag not found on ticket (domain error)", async () => {
    const app = setup([
      { data: RAW_TICKET_NO_TAGS, error: null },  // ticket has no tags
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags/bug`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("TAG_NOT_FOUND");
  });

  it("returns 404 when tag row not found in DB", async () => {
    const app = setup([
      { data: RAW_TICKET_WITH_BUG, error: null },
      { data: null, error: { message: "not found", code: "PGRST116" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags/bug`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when ticket_tags delete fails", async () => {
    const app = setup([
      { data: RAW_TICKET_WITH_BUG, error: null },
      { data: { id: "tag-1" }, error: null },
      { data: null, error: { message: "delete failed" } },
    ]);

    const res = await app.request(`/tickets/${TICKET_ID}/tags/bug`, { method: "DELETE" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
