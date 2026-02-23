interface WebEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
}

function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const webEnv: WebEnv = {
  supabaseUrl: requiredEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: requiredEnv("VITE_SUPABASE_ANON_KEY"),
  apiUrl: requiredEnv("VITE_TEAMTEAMTEAM_API_URL"),
};
