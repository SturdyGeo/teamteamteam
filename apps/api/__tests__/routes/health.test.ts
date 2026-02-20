import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { health } from "../../src/routes/health.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = new Hono();
    app.route("/", health);

    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
