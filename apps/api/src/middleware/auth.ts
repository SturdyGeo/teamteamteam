import type { Context, Next } from "hono";
import { createSupabaseClient, type SupabaseClient } from "../lib/supabase.js";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContext {
  user: AuthUser;
  supabase: SupabaseClient;
}

export function getAuth(c: Context): AuthContext {
  return c.get("auth") as AuthContext;
}

export async function authMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } },
      401,
    );
  }

  const token = header.slice(7);
  const supabase = createSupabaseClient(token);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        },
      },
      401,
    );
  }

  c.set("auth", {
    user: { id: user.id, email: user.email! },
    supabase,
  } satisfies AuthContext);

  await next();
}
