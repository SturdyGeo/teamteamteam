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
