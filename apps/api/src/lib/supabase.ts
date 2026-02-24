import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export type { SupabaseClient };

export function createSupabaseClient(accessToken: string): SupabaseClient {
  const url = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
    );
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
