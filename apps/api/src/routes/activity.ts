import { Hono } from "hono";
import { getAuth } from "../middleware/auth.js";

const activity = new Hono();

activity.get("/tickets/:ticketId/activity", async (c) => {
  const { supabase } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const { data, error } = await supabase
    .from("activity_events")
    .select("*, actor:users(id, email, display_name)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  return c.json(data);
});

export { activity };
