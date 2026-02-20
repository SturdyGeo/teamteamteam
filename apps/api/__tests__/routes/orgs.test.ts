import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp } from "../helpers/test-app.js";
import { orgs } from "../../src/routes/orgs.js";

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(orgs, createMockSupabase(results));
}

function post(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("GET /orgs", () => {
  it("returns user's orgs with membership_role", async () => {
    const membershipRows = [
      {
        org_id: "org-1",
        role: "owner",
        orgs: {
          id: "org-1",
          name: "My Org",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      },
    ];
    const app = setup([{ data: membershipRows, error: null }]);

    const res = await app.request("/orgs");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: "org-1",
        name: "My Org",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        membership_role: "owner",
      },
    ]);
  });

  it("returns empty array when user has no orgs", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request("/orgs");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request("/orgs");
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

describe("POST /orgs", () => {
  const org = {
    id: "org-new",
    name: "New Org",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("creates org and owner membership, returns 201", async () => {
    const app = setup([
      { data: null, error: null },        // org insert (no RETURNING)
      { data: null, error: null },        // membership insert
      { data: org, error: null },         // select org
    ]);

    const res = await app.request("/orgs", post({ name: "New Org" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(org);
  });

  it("returns 400 when name is missing", async () => {
    const app = setup([]);

    const res = await app.request("/orgs", post({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when name is empty", async () => {
    const app = setup([]);

    const res = await app.request("/orgs", post({ name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 500 when org insert fails", async () => {
    const app = setup([
      { data: null, error: { message: "insert failed" } },
    ]);

    const res = await app.request("/orgs", post({ name: "New Org" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 when membership insert fails", async () => {
    const app = setup([
      { data: null, error: null },
      { data: null, error: { message: "member insert failed" } },
    ]);

    const res = await app.request("/orgs", post({ name: "New Org" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

describe("DELETE /orgs/:orgId", () => {
  const org = {
    id: "org-1",
    name: "My Org",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("returns deleted org with 200", async () => {
    const app = setup([
      { data: org, error: null },     // select existing
      { data: null, error: null },     // delete
    ]);

    const res = await app.request("/orgs/org-1", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(org);
  });

  it("returns 404 when org not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found" } },  // select fails
    ]);

    const res = await app.request("/orgs/org-missing", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 on DB error during delete", async () => {
    const app = setup([
      { data: org, error: null },                         // select succeeds
      { data: null, error: { message: "delete failed" } }, // delete fails
    ]);

    const res = await app.request("/orgs/org-1", { method: "DELETE" });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
