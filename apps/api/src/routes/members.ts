import { Hono } from "hono";
import { z } from "zod";
import { getAuth } from "../middleware/auth.js";
import { createSupabaseServiceClient } from "../lib/supabase.js";

const members = new Hono();

async function lookupUserIdByEmail(
  supabase: ReturnType<typeof getAuth>["supabase"] | null,
  fallbackSupabase: ReturnType<typeof getAuth>["supabase"] | null,
  email: string,
): Promise<{ userId: string | null; errorMessage: string | null }> {
  if (!supabase) {
    return { userId: null, errorMessage: null };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "user_id_by_email",
    { p_email: normalizedEmail },
  );

  if (!rpcError) {
    const userId =
      typeof rpcData === "string"
        ? rpcData
        : (rpcData && typeof rpcData === "object" && "id" in rpcData && typeof rpcData.id === "string"
            ? rpcData.id
            : null);
    return { userId, errorMessage: null };
  }

  const lookupClient = fallbackSupabase ?? supabase;
  const { data, error } = await lookupClient
    .from("users")
    .select("id")
    .ilike("email", normalizedEmail)
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

const UpdateMemberRoleBody = z.object({
  role: z.enum(["admin", "member", "limited"]),
});

members.post("/orgs/:orgId/members", async (c) => {
  const { supabase } = getAuth(c);
  const serviceSupabase = createSupabaseServiceClient();
  const lookupSupabase = serviceSupabase ?? supabase;
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

  let userLookup = await lookupUserIdByEmail(supabase, lookupSupabase, email);
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
      userLookup = await lookupUserIdByEmail(supabase, lookupSupabase, email);
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
            "No user found with that email address yet. A sign-in code was sent; ask them to sign in once, then retry the invite. If this persists, configure SUPABASE_SERVICE_ROLE_KEY for API invite lookup.",
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

members.patch("/orgs/:orgId/members/:memberId", async (c) => {
  const { supabase } = getAuth(c);
  const orgId = c.req.param("orgId");
  const memberId = c.req.param("memberId");

  const body = await c.req.json();
  const parsed = UpdateMemberRoleBody.safeParse(body);
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

  const { data: existingMember, error: existingError } = await supabase
    .from("memberships")
    .select("id, org_id, user_id, role, created_at")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single();

  if (existingError) {
    if (existingError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: existingError.message } },
      500,
    );
  }

  if (existingMember.role === "owner") {
    return c.json(
      {
        error: {
          code: "DOMAIN_ERROR",
          message: "Owner role cannot be changed from this endpoint",
        },
      },
      409,
    );
  }

  if (existingMember.role === parsed.data.role) {
    return c.json(existingMember);
  }

  const { data: updatedMember, error: updateError } = await supabase
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("id", memberId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  return c.json(updatedMember);
});

export { members };
