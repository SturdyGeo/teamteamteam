import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase.js";
import { createTestApp } from "../helpers/test-app.js";
import { activity } from "../../src/routes/activity.js";

const TICKET_ID = "00000000-0000-0000-0000-000000000100";

function setup(results: Parameters<typeof createMockSupabase>[0]) {
  return createTestApp(activity, createMockSupabase(results));
}

describe("GET /tickets/:ticketId/activity", () => {
  it("returns activity events", async () => {
    const events = [
      {
        id: "evt-1",
        ticket_id: TICKET_ID,
        actor_id: "user-1",
        event_type: "ticket_created",
        payload: {},
        created_at: "2026-01-01T00:00:00.000Z",
        actor: { id: "user-1", email: "a@b.com", display_name: "Alice" },
      },
    ];
    const app = setup([{ data: events, error: null }]);

    const res = await app.request(`/tickets/${TICKET_ID}/activity`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(events);
  });

  it("returns empty array when no events exist", async () => {
    const app = setup([{ data: [], error: null }]);

    const res = await app.request(`/tickets/${TICKET_ID}/activity`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const app = setup([{ data: null, error: { message: "db error" } }]);

    const res = await app.request(`/tickets/${TICKET_ID}/activity`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("DB_ERROR");
  });
});
