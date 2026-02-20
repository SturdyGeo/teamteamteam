import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../src/errors.js";
import type { SessionStore, StoredSession } from "../src/types.js";

// Mock supabase before importing auth
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
    },
  }),
}));

import { createAuthClient } from "../src/auth.js";

function createMockStore(): SessionStore & {
  stored: StoredSession | null;
} {
  const mock = {
    stored: null as StoredSession | null,
    get: vi.fn(async () => mock.stored),
    set: vi.fn(async (s: StoredSession) => {
      mock.stored = s;
    }),
    clear: vi.fn(async () => {
      mock.stored = null;
    }),
  };
  return mock;
}

const fakeSupabaseSession = {
  access_token: "access-123",
  refresh_token: "refresh-456",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "user-1", email: "test@example.com" },
};

describe("AuthClient", () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createMockStore();
  });

  function makeClient() {
    return createAuthClient({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: store,
    });
  }

  describe("sendMagicLink", () => {
    it("calls signInWithOtp with email", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const client = makeClient();
      await client.sendMagicLink("user@example.com");
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        options: undefined,
      });
    });

    it("passes redirectTo when provided", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const client = makeClient();
      await client.sendMagicLink("user@example.com", "http://localhost/cb");
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        options: { emailRedirectTo: "http://localhost/cb" },
      });
    });

    it("throws ApiError on failure", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Rate limited", status: 429 },
      });
      const client = makeClient();
      await expect(
        client.sendMagicLink("user@example.com"),
      ).rejects.toMatchObject({
        code: "AUTH_ERROR",
        statusCode: 429,
      });
    });
  });

  describe("verifyOtp", () => {
    it("stores session on success", async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: fakeSupabaseSession },
        error: null,
      });
      const client = makeClient();
      await client.verifyOtp("user@example.com", "123456");
      expect(store.set).toHaveBeenCalled();
      const saved = store.stored;
      expect(saved?.access_token).toBe("access-123");
      expect(saved?.user.email).toBe("test@example.com");
    });

    it("throws when no session returned", async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      const client = makeClient();
      await expect(
        client.verifyOtp("user@example.com", "123456"),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getToken", () => {
    it("returns null when no session exists", async () => {
      const client = makeClient();
      expect(await client.getToken()).toBeNull();
    });

    it("returns token when session is valid", async () => {
      store.stored = {
        access_token: "valid-token",
        refresh_token: "refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "u1", email: "a@b.com" },
      };
      const client = makeClient();
      expect(await client.getToken()).toBe("valid-token");
    });

    it("refreshes token when near expiry", async () => {
      store.stored = {
        access_token: "old-token",
        refresh_token: "refresh",
        expires_at: Math.floor(Date.now() / 1000) + 30, // 30s left (under 60s buffer)
        user: { id: "u1", email: "a@b.com" },
      };
      mockRefreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: "new-token",
            refresh_token: "new-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "u1", email: "a@b.com" },
          },
        },
        error: null,
      });
      const client = makeClient();
      const token = await client.getToken();
      expect(token).toBe("new-token");
      expect(store.stored?.access_token).toBe("new-token");
    });

    it("clears session when refresh fails", async () => {
      store.stored = {
        access_token: "old-token",
        refresh_token: "refresh",
        expires_at: Math.floor(Date.now() / 1000) + 10,
        user: { id: "u1", email: "a@b.com" },
      };
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid refresh token" },
      });
      const client = makeClient();
      const token = await client.getToken();
      expect(token).toBeNull();
      expect(store.clear).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("clears the session store", async () => {
      store.stored = {
        access_token: "t",
        refresh_token: "r",
        expires_at: 999,
        user: { id: "u", email: "e" },
      };
      const client = makeClient();
      await client.logout();
      expect(store.clear).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
