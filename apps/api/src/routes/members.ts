import { Hono } from "hono";
import { z } from "zod";
import { getAuth } from "../middleware/auth.js";

const members = new Hono();

async function lookupUserIdByEmail(
  supabase: ReturnType<typeof getAuth>["supabase"],
  email: string,
): Promise<{ userId: string | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return { userId: null, errorMessage: error.message };
  }

  return { userId: data?.id ?? null, errorMessage: null };
}

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
  role: z.enum(["admin", "member", "limited"]).optional().default("member"),
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

  const email = parsed.data.email.trim().toLowerCase();

  let userLookup = await lookupUserIdByEmail(supabase, email);
  if (userLookup.errorMessage) {
    return c.json(
      { error: { code: "DB_ERROR", message: userLookup.errorMessage } },
      500,
    );
  }

  // If the user does not exist yet, trigger Supabase OTP signup/login for this
  // email, then retry lookup briefly so invite works for brand-new users.
  if (!userLookup.userId) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `No user found with that email address, and we could not send a sign-in code (${otpError.message}).`,
          },
        },
        404,
      );
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      userLookup = await lookupUserIdByEmail(supabase, email);
      if (userLookup.errorMessage) {
        return c.json(
          { error: { code: "DB_ERROR", message: userLookup.errorMessage } },
          500,
        );
      }

      if (userLookup.userId) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  if (!userLookup.userId) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message:
            "No user found with that email address yet. A sign-in code was sent; ask them to sign in once, then retry the invite.",
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
      user_id: userLookup.userId,
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
