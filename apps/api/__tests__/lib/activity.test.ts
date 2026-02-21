import { describe, it, expect, vi } from "vitest";
import { persistActivityEvents } from "../../src/lib/activity.js";

function createMockSupabase(insertFn: ReturnType<typeof vi.fn>) {
  return {
    from: () => ({ insert: insertFn }),
  } as unknown as Parameters<typeof persistActivityEvents>[0];
}

describe("persistActivityEvents", () => {
  it("inserts each event", async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const supabase = createMockSupabase(insertFn);

    const events = [
      { event_type: "ticket_created", ticket_id: "t1" },
      { event_type: "status_changed", ticket_id: "t1" },
    ];

    await persistActivityEvents(supabase, events);

    expect(insertFn).toHaveBeenCalledTimes(2);
    expect(insertFn).toHaveBeenCalledWith(events[0]);
    expect(insertFn).toHaveBeenCalledWith(events[1]);
  });

  it("logs errors but does not throw", async () => {
    const dbError = { message: "DB connection failed", code: "PGRST000" };
    const insertFn = vi.fn().mockResolvedValue({ error: dbError });
    const supabase = createMockSupabase(insertFn);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const events = [{ event_type: "ticket_created", ticket_id: "t1" }];

    await expect(persistActivityEvents(supabase, events)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to insert activity event:",
      dbError,
    );

    consoleSpy.mockRestore();
  });

  it("handles empty events array", async () => {
    const insertFn = vi.fn();
    const supabase = createMockSupabase(insertFn);

    await persistActivityEvents(supabase, []);

    expect(insertFn).not.toHaveBeenCalled();
  });
});
