import { Hono } from "hono";
import { z } from "zod";
import { getAuth } from "../middleware/auth.js";

const members = new Hono();

members.get("/orgs/:orgId/members", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");

  const { data, error } = await supabase
    .from("memberships")
    .select("id, org_id, user_id, role, created_at, user:users(id, email, display_name)")
    .eq("org_id", orgId)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  return c.json(data);
});

const InviteMemberBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

members.post("/orgs/:orgId/members", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");

  const body = await c.req.json();
  const parsed = InviteMemberBody.safeParse(body);
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

  // Look up user by email
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", parsed.data.email)
    .single();

  if (userError || !userRow) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "No user found with that email address",
        },
      },
      404,
    );
  }

  // Insert membership
  const { data: membership, error: memberError } = await supabase
    .from("memberships")
    .insert({
      org_id: orgId,
      user_id: userRow.id,
      role: parsed.data.role,
    })
    .select()
    .single();

  if (memberError) {
    if (memberError.code === "23505") {
      return c.json(
        {
          error: {
            code: "DUPLICATE",
            message: "User is already a member of this org",
          },
        },
        409,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: memberError.message } },
      500,
    );
  }

  return c.json(membership, 201);
});

export { members };
