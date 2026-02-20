import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileSessionStore } from "../src/session.js";
import type { StoredSession } from "../src/types.js";

const fakeSession: StoredSession = {
  access_token: "access-123",
  refresh_token: "refresh-456",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "user-1", email: "test@example.com" },
};

describe("FileSessionStore", () => {
  let tmpDir: string;
  let filePath: string;
  let store: FileSessionStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "candoo-test-"));
    filePath = join(tmpDir, "session.json");
    store = new FileSessionStore(filePath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no session file exists", async () => {
    expect(await store.get()).toBeNull();
  });

  it("stores and retrieves a session", async () => {
    await store.set(fakeSession);
    const result = await store.get();
    expect(result).toEqual(fakeSession);
  });

  it("overwrites an existing session", async () => {
    await store.set(fakeSession);
    const updated = { ...fakeSession, access_token: "new-token" };
    await store.set(updated);
    const result = await store.get();
    expect(result?.access_token).toBe("new-token");
  });

  it("clears the session", async () => {
    await store.set(fakeSession);
    await store.clear();
    const result = await store.get();
    expect(result).toBeNull();
  });

  it("writes file with restrictive permissions (0o600)", async () => {
    await store.set(fakeSession);
    const stats = await stat(filePath);
    // Check owner-only read/write (0o600)
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("creates parent directories if they don't exist", async () => {
    const nested = join(tmpDir, "a", "b", "session.json");
    const nestedStore = new FileSessionStore(nested);
    await nestedStore.set(fakeSession);
    const result = await nestedStore.get();
    expect(result).toEqual(fakeSession);
  });

  it("returns null for corrupt JSON", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, "not-json{{{");
    const result = await store.get();
    expect(result).toBeNull();
  });

  it("returns null for empty file", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, "");
    const result = await store.get();
    expect(result).toBeNull();
  });
});
