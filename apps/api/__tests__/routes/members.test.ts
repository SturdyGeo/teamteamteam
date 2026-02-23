import { describe, it, expect } from "vitest";
import { createMockSupabase, type MockSupabaseOptions } from "../helpers/mock-supabase.js";
import { createTestApp } from "../helpers/test-app.js";
import { members } from "../../src/routes/members.js";

const ORG_ID = "00000000-0000-0000-0000-000000000020";

function setup(
  results: Parameters<typeof createMockSupabase>[0],
  options?: MockSupabaseOptions,
) {
  return createTestApp(members, createMockSupabase(results, options));
}

function post(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("GET /orgs/:orgId/members", () => {
  it("returns members with user info", async () => {
    const data = [
      {
        id: "mem-1",
        org_id: ORG_ID,
        user_id: "user-1",
        role: "owner",
        created_at: "2026-01-01T00:00:00.000Z",
        user: { id: "user-1", email: "owner@example.com", display_name: "Owner" },
      },
    ];
    const app = setup([{ data, error: null }]);

    const res = await app.request(`/orgs/${ORG_ID}/members`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  it("returns empty array when no members exist", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/orgs/${ORG_ID}/members`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/orgs/${ORG_ID}/members`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});

describe("POST /orgs/:orgId/members", () => {
  const membership = {
    id: "mem-new",
    org_id: ORG_ID,
    user_id: "user-2",
    role: "member",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  it("creates membership and returns 201", async () => {
    const app = setup([
      { data: { id: "user-2" }, error: null },   // user lookup
      { data: membership, error: null },          // membership insert
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "new@example.com" }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(membership);
  });

  it("returns 400 when email is invalid", async () => {
    const app = setup([]);

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "not-an-email" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when email is missing", async () => {
    const app = setup([]);

    const res = await app.request(`/orgs/${ORG_ID}/members`, post({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("provisions user via OTP and creates membership when email is new", async () => {
    const app = setup([
      { data: null, error: null },               // initial user lookup
      { data: { id: "user-2" }, error: null },   // post-OTP user lookup
      { data: membership, error: null },         // membership insert
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "nobody@example.com" }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(membership);
  });

  it("returns 404 when user is missing and OTP bootstrap fails", async () => {
    const app = setup(
      [{ data: null, error: null }],
      { otpError: { message: "otp blocked" } },
    );

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "nobody@example.com" }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toContain("could not send a sign-in code");
  });

  it("returns 409 when user is already a member", async () => {
    const app = setup([
      { data: { id: "user-2" }, error: null },
      { data: null, error: { message: "duplicate", code: "23505" } },
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "existing@example.com" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("DUPLICATE");
  });

  it("returns 500 on other DB error", async () => {
    const app = setup([
      { data: { id: "user-2" }, error: null },
      { data: null, error: { message: "db crash" } },
    ]);

    const res = await app.request(
      `/orgs/${ORG_ID}/members`,
      post({ email: "new@example.com" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
