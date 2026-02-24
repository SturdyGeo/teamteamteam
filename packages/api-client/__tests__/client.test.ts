import { describe, it, expect, vi } from "vitest";

const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null });
const mockVerifyOtp = vi.fn().mockResolvedValue({
  data: { session: null },
  error: { message: "test" },
});
const mockExchangeCodeForSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

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

import { createTeamteamteamClient } from "../src/client.js";
import type { SessionStore, StoredSession } from "../src/types.js";

function createMockStore(): SessionStore {
  let stored: StoredSession | null = null;
  return {
    get: vi.fn(async () => stored),
    set: vi.fn(async (s: StoredSession) => {
      stored = s;
    }),
    clear: vi.fn(async () => {
      stored = null;
    }),
  };
}

describe("createTeamteamteamClient", () => {
  it("returns an object with auth, query, and mutation methods", () => {
    const client = createTeamteamteamClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: createMockStore(),
    });

    // Auth methods
    expect(typeof client.sendMagicLink).toBe("function");
    expect(typeof client.verifyOtp).toBe("function");
    expect(typeof client.exchangeCodeForSession).toBe("function");
    expect(typeof client.logout).toBe("function");
    expect(typeof client.getToken).toBe("function");
    expect(typeof client.getSession).toBe("function");

    // Query methods
    expect(typeof client.getOrgs).toBe("function");
    expect(typeof client.getProjects).toBe("function");
    expect(typeof client.getTickets).toBe("function");
    expect(typeof client.getMembers).toBe("function");

    // Mutation methods
    expect(typeof client.createOrg).toBe("function");
    expect(typeof client.createTicket).toBe("function");
    expect(typeof client.updateTicket).toBe("function");
    expect(typeof client.moveTicket).toBe("function");
    expect(typeof client.closeTicket).toBe("function");
    expect(typeof client.deleteTicket).toBe("function");
    expect(typeof client.updateMemberRole).toBe("function");
  });

  it("uses custom sessionStore when provided", () => {
    const store = createMockStore();
    const client = createTeamteamteamClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: store,
    });

    // Calling getSession should use our custom store
    client.getSession();
    expect(store.get).toHaveBeenCalled();
  });

  it("auth methods delegate to supabase", async () => {
    const client = createTeamteamteamClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: createMockStore(),
    });

    await client.sendMagicLink("user@example.com");
    expect(mockSignInWithOtp).toHaveBeenCalled();
  });

  it("getToken returns null when no session", async () => {
    const client = createTeamteamteamClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: createMockStore(),
    });

    const token = await client.getToken();
    expect(token).toBeNull();
  });

  it("logout clears session and calls signOut", async () => {
    const store = createMockStore();
    const client = createTeamteamteamClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "anon-key",
      sessionStore: store,
    });

    await client.logout();
    expect(store.clear).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
