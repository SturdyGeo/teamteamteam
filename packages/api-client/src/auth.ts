import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.js";
import type { SessionStore, StoredSession } from "./types.js";

const REFRESH_BUFFER_MS = 60_000;

export interface AuthClient {
  sendOtp(email: string): Promise<void>;
  /** @deprecated Use sendOtp instead */
  sendMagicLink(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<void>;
  exchangeCodeForSession(code: string): Promise<void>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  getSession(): Promise<StoredSession | null>;
}

export interface AuthClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sessionStore: SessionStore;
}

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const supabase: SupabaseClient = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const store = config.sessionStore;

  function toStoredSession(
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    user: { id: string; email?: string },
  ): StoredSession {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user: { id: user.id, email: user.email ?? "" },
    };
  }

  return {
    async sendOtp(email: string): Promise<void> {
      // Do NOT pass emailRedirectTo - that triggers magic link behavior.
      // Without it, Supabase sends only an OTP code.
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) {
        throw new ApiError("AUTH_ERROR", error.message, error.status ?? 500);
      }
    },

    /** @deprecated Use sendOtp instead */
    async sendMagicLink(email: string): Promise<void> {
      return this.sendOtp(email);
    },

    async verifyOtp(email: string, token: string): Promise<void> {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        throw new ApiError("AUTH_ERROR", error.message, error.status ?? 500);
      }
      if (!data.session) {
        throw new ApiError("AUTH_ERROR", "No session returned", 500);
      }
      const s = data.session;
      await store.set(
        toStoredSession(
          s.access_token,
          s.refresh_token,
          s.expires_at ?? 0,
          s.user,
        ),
      );
    },

    async exchangeCodeForSession(code: string): Promise<void> {
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw new ApiError("AUTH_ERROR", error.message, error.status ?? 500);
      }
      if (!data.session) {
        throw new ApiError("AUTH_ERROR", "No session returned", 500);
      }
      const s = data.session;
      await store.set(
        toStoredSession(
          s.access_token,
          s.refresh_token,
          s.expires_at ?? 0,
          s.user,
        ),
      );
    },

    async logout(): Promise<void> {
      try {
        await supabase.auth.signOut();
      } catch {
        // Best-effort sign out
      }
      await store.clear();
    },

    async getToken(): Promise<string | null> {
      const session = await store.get();
      if (!session) return null;

      const nowMs = Date.now();
      const expiresMs = session.expires_at * 1000;

      if (expiresMs - nowMs > REFRESH_BUFFER_MS) {
        return session.access_token;
      }

      // Token is near expiry — attempt refresh
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (error || !data.session) {
        console.error("Token refresh failed — session cleared");
        await store.clear();
        return null;
      }

      const s = data.session;
      const refreshed = toStoredSession(
        s.access_token,
        s.refresh_token,
        s.expires_at ?? 0,
        s.user,
      );
      await store.set(refreshed);
      return refreshed.access_token;
    },

    async getSession(): Promise<StoredSession | null> {
      return store.get();
    },
  };
}
