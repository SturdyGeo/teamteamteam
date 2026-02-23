import { createClient } from "@supabase/supabase-js";
import { webEnv } from "./env";

export const supabase = createClient(webEnv.supabaseUrl, webEnv.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
