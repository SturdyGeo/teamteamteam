import { createCandooClient } from "@candoo/api-client";
import type { CandooClient } from "@candoo/api-client";

let instance: CandooClient | null = null;

export function getClient(): CandooClient {
  if (instance) return instance;

  const baseUrl = process.env["CANDOO_API_URL"] ?? "";
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable");
  }

  instance = createCandooClient({ baseUrl, supabaseUrl, supabaseAnonKey });
  return instance;
}

