import { Hono } from "hono";
import { z } from "zod";
import { getAuth } from "../middleware/auth.js";

const orgs = new Hono();

const CreateOrgBody = z.object({
  name: z.string().min(1),
});

orgs.get("/orgs", async (c) => {
  const { supabase, user } = getAuth(c);

  const { data: membershipRows, error } = await supabase
    .from("memberships")
    .select("org_id, role, orgs(id, name, created_at, updated_at)")
    .eq("user_id", user.id);

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  const result = (membershipRows ?? []).map(
    (row: Record<string, unknown>) => ({
      ...(row.orgs as Record<string, unknown>),
      membership_role: row.role,
    }),
  );

  return c.json(result);
});

orgs.post("/orgs", async (c) => {
  const { supabase, user } = getAuth(c);

  const body = await c.req.json();
  const parsed = CreateOrgBody.safeParse(body);
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

  // Generate org ID client-side to avoid RETURNING clause.
  // INSERT ... RETURNING triggers the SELECT policy, which requires
  // a membership that doesn't exist yet (chicken-and-egg).
  const orgId = crypto.randomUUID();

  // Insert org without RETURNING
  const { error: orgError } = await supabase
    .from("orgs")
    .insert({ id: orgId, name: parsed.data.name });

  if (orgError) {
    return c.json(
      { error: { code: "DB_ERROR", message: orgError.message } },
      500,
    );
  }

  // Insert owner membership for current user
  const { error: memberError } = await supabase.from("memberships").insert({
    org_id: orgId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return c.json(
      { error: { code: "DB_ERROR", message: memberError.message } },
      500,
    );
  }

  // Now SELECT the org — membership exists so SELECT policy passes
  const { data: org, error: selectError } = await supabase
    .from("orgs")
    .select()
    .eq("id", orgId)
    .single();

  if (selectError) {
    return c.json(
      { error: { code: "DB_ERROR", message: selectError.message } },
      500,
    );
  }

  return c.json(org, 201);
});

orgs.delete("/orgs/:orgId", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");

  const { data: existing, error: selectError } = await supabase
    .from("orgs")
    .select()
    .eq("id", orgId)
    .single();

  if (selectError || !existing) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Org not found" } },
      404,
    );
  }

  const { error: deleteError } = await supabase
    .from("orgs")
    .delete()
    .eq("id", orgId);

  if (deleteError) {
    return c.json(
      { error: { code: "DB_ERROR", message: deleteError.message } },
      500,
    );
  }

  return c.json(existing);
});

export { orgs };
