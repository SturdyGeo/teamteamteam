import { Hono } from "hono";
import { z } from "zod";
import { getAuth } from "../middleware/auth.js";

const projects = new Hono();

const CreateProjectBody = z.object({
  name: z.string().min(1),
  prefix: z.string().min(1).max(10).regex(/^[A-Z][A-Z0-9]*$/),
});

const DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "Done"];

projects.get("/orgs/:orgId/projects", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  return c.json(data);
});

projects.post("/orgs/:orgId/projects", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");

  const body = await c.req.json();
  const parsed = CreateProjectBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  // Insert project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      prefix: parsed.data.prefix,
    })
    .select()
    .single();

  if (projectError) {
    if (projectError.code === "23505") {
      return c.json(
        {
          error: {
            code: "DUPLICATE",
            message: "A project with this prefix already exists in this org",
          },
        },
        409,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: projectError.message } },
      500,
    );
  }

  // Insert default workflow columns
  const columnInserts = DEFAULT_COLUMNS.map((name, position) => ({
    project_id: project.id,
    name,
    position,
  }));

  const { error: columnsError } = await supabase
    .from("workflow_columns")
    .insert(columnInserts);

  if (columnsError) {
    return c.json(
      { error: { code: "DB_ERROR", message: columnsError.message } },
      500,
    );
  }

  return c.json(project, 201);
});

projects.delete("/orgs/:orgId/projects/:projectId", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");
  const projectId = c.req.param("projectId");

  const { data: existing, error: selectError } = await supabase
    .from("projects")
    .select()
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();

  if (selectError || !existing) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      404,
    );
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("org_id", orgId);

  if (deleteError) {
    return c.json(
      { error: { code: "DB_ERROR", message: deleteError.message } },
      500,
    );
  }

  return c.json(existing);
});

export { projects };
