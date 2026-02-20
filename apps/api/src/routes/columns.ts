import { Hono } from "hono";
import { getAuth } from "../middleware/auth.js";

const columns = new Hono();

columns.get("/projects/:projectId/columns", async (c) => {
  const { supabase } = getAuth(c);
  const projectId = c.req.param("projectId");

  const { data, error } = await supabase
    .from("workflow_columns")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  return c.json(data);
});

export { columns };
