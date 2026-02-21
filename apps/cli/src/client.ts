import { createTeamteamteamClient } from "@teamteamteam/api-client";
import type { TeamteamteamClient } from "@teamteamteam/api-client";

interface CliClientConfigOverrides {
  customBackend?: boolean;
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export const CLI_DEFAULT_BACKEND = {
  apiUrl: "https://qvwhayspqbzmtuwxdlnk.supabase.co/functions/v1/api",
  supabaseUrl: "https://qvwhayspqbzmtuwxdlnk.supabase.co",
  // Falls back to env for local dev until a baked-in anon key is set.
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2d2hheXNwcWJ6bXR1d3hkbG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTM2MTgsImV4cCI6MjA4NzA4OTYxOH0.EpzScwBeyjrhrMiPRRYYMCdbgJiBf40JLcntE928AFg",
} as const;

let instance: TeamteamteamClient | null = null;
let configOverrides: CliClientConfigOverrides = {};

export function configureClient(overrides: CliClientConfigOverrides): void {
  configOverrides = { ...overrides };
  instance = null;
}

function ensureValue(
  value: string | undefined,
  flagName: string,
  envName: string,
): string {
  if (!value) {
    throw new Error(
      `Missing ${flagName}. Pass ${flagName} or set ${envName} when using --custom-backend.`,
    );
  }
  return value;
}

export function getClient(): TeamteamteamClient {
  if (instance) return instance;

  const {
    customBackend = false,
    apiUrl: overrideApiUrl,
    supabaseUrl: overrideSupabaseUrl,
    supabaseAnonKey: overrideSupabaseAnonKey,
  } = configOverrides;

  if (!customBackend && (overrideApiUrl || overrideSupabaseUrl || overrideSupabaseAnonKey)) {
    throw new Error(
      "Custom backend flags require --custom-backend. Use --custom-backend with --api-url, --supabase-url, and --supabase-anon-key.",
    );
  }

  const baseUrl = customBackend
    ? ensureValue(overrideApiUrl ?? process.env["TEAMTEAMTEAM_API_URL"], "--api-url", "TEAMTEAMTEAM_API_URL")
    : CLI_DEFAULT_BACKEND.apiUrl;
  const supabaseUrl = customBackend
    ? ensureValue(
        overrideSupabaseUrl ?? process.env["SUPABASE_URL"],
        "--supabase-url",
        "SUPABASE_URL",
      )
    : CLI_DEFAULT_BACKEND.supabaseUrl;
  const supabaseAnonKey = customBackend
    ? ensureValue(
        overrideSupabaseAnonKey ?? process.env["SUPABASE_ANON_KEY"],
        "--supabase-anon-key",
        "SUPABASE_ANON_KEY",
      )
    : CLI_DEFAULT_BACKEND.supabaseAnonKey;

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY. Set apps/cli/src/client.ts default or use --custom-backend with --supabase-anon-key.",
    );
  }

  instance = createTeamteamteamClient({ baseUrl, supabaseUrl, supabaseAnonKey });
  return instance;
}
