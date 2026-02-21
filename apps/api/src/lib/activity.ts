import type { SupabaseClient } from "./supabase.js";

/**
 * Persist activity events to the database (best-effort).
 * Logs errors but does not throw — the primary mutation has already succeeded.
 */
export async function persistActivityEvents(
  supabase: SupabaseClient,
  events: readonly Record<string, unknown>[],
): Promise<void> {
  for (const event of events) {
    const { error } = await supabase.from("activity_events").insert(event);
    if (error) {
      console.error("Failed to insert activity event:", error);
    }
  }
}
