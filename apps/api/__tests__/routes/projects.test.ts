import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp } from "../helpers/test-app.js";
import { projects } from "../../src/routes/projects.js";

const ORG_ID = "00000000-0000-0000-0000-000000000020";

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(projects, createMockSupabase(results));
}

function post(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("GET /orgs/:orgId/projects", () => {
  it("returns projects", async () => {
    const data = [
      {
        id: "proj-1",
        org_id: ORG_ID,
        name: "Alpha",
        prefix: "ALP",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const app = setup([{ data, error: null }]);

    const res = await app.request(`/orgs/${ORG_ID}/projects`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  it("returns empty array when no projects exist", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/orgs/${ORG_ID}/projects`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/orgs/${ORG_ID}/projects`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

describe("POST /orgs/:orgId/projects", () => {
  const project = {
    id: "proj-new",
    org_id: ORG_ID,
    name: "Beta",
    prefix: "BET",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("creates project and default columns, returns 201", async () => {
    const app = setup([
      { data: project, error: null },  // project insert
      { data: null, error: null },      // columns insert
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "BET" }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(project);
  });

  it("returns 400 when name is missing", async () => {
    const app = setup([]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ prefix: "BET" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when prefix is invalid (not uppercase)", async () => {
    const app = setup([]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "lowercase" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when prefix is too long", async () => {
    const app = setup([]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "ABCDEFGHIJK" }), // 11 chars, max 10
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 409 when prefix is duplicate", async () => {
    const app = setup([
      { data: null, error: { message: "duplicate", code: "23505" } },
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "BET" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("DUPLICATE");
  });

  it("returns 500 on project insert failure", async () => {
    const app = setup([
      { data: null, error: { message: "insert failed" } },
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "BET" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });

  it("returns 500 on columns insert failure", async () => {
    const app = setup([
      { data: project, error: null },
      { data: null, error: { message: "columns failed" } },
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects`,
      post({ name: "Beta", prefix: "BET" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

describe("DELETE /orgs/:orgId/projects/:projectId", () => {
  const project = {
    id: "proj-1",
    org_id: ORG_ID,
    name: "Alpha",
    prefix: "ALP",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("returns deleted project with 200", async () => {
    const app = setup([
      { data: project, error: null },   // select existing
      { data: null, error: null },       // delete
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects/proj-1`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(project);
  });

  it("returns 404 when project not found", async () => {
    const app = setup([
      { data: null, error: { message: "not found" } },  // select fails
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects/proj-missing`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 on DB error during delete", async () => {
    const app = setup([
      { data: project, error: null },                         // select succeeds
      { data: null, error: { message: "delete failed" } },    // delete fails
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/projects/proj-1`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
