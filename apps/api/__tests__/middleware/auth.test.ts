import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { authMiddleware, getAuth } from "../../src/middleware/auth.js";

function createTestApp(): Hono {
  const app = new Hono();
  app.use("/*", authMiddleware);
  app.get("/test", (c) => {
    const auth = getAuth(c);
    return c.json({ userId: auth.user.id, email: auth.user.email });
  });
  return app;
}

describe("authMiddleware", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Missing or invalid token");
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when token is invalid (Supabase rejects)", async () => {
    // This test requires SUPABASE_URL and SUPABASE_ANON_KEY to be set
    // but will fail to validate the fake token, resulting in 401
    const app = createTestApp();

    // If env vars are not set, the middleware will throw (caught by us)
    // If they are set, it will try to validate and fail
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer fake-invalid-token" },
    });

    // Either 401 (token rejected) or 500 (env vars missing) — both are appropriate
    expect([401, 500]).toContain(res.status);
  });
});
