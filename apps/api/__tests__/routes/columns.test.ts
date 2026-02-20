import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp } from "../helpers/test-app.js";
import { columns } from "../../src/routes/columns.js";

const PROJECT_ID = "00000000-0000-0000-0000-000000000010";

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(columns, createMockSupabase(results));
}

describe("GET /projects/:projectId/columns", () => {
  it("returns columns ordered by position", async () => {
    const data = [
      { id: "col-1", project_id: PROJECT_ID, name: "Backlog", position: 0, created_at: "2026-01-01T00:00:00.000Z" },
      { id: "col-2", project_id: PROJECT_ID, name: "Done", position: 1, created_at: "2026-01-01T00:00:00.000Z" },
    ];
    const app = setup([{ data, error: null }]);

    const res = await app.request(`/projects/${PROJECT_ID}/columns`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  it("returns empty array when no columns exist", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/projects/${PROJECT_ID}/columns`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "connection failed" } }]);

    const res = await app.request(`/projects/${PROJECT_ID}/columns`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
