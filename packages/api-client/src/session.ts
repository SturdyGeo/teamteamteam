import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SessionStore, StoredSession } from "./types.js";

function getConfigDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg || join(homedir(), ".config");
  return join(base, "candoo");
}

export class FileSessionStore implements SessionStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(getConfigDir(), "session.json");
  }

  async get(): Promise<StoredSession | null> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }

  async set(session: StoredSession): Promise<void> {
    const dir = join(this.filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(session, null, 2), {
      mode: 0o600,
    });
  }

  async clear(): Promise<void> {
    try {
      await writeFile(this.filePath, "", { mode: 0o600 });
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
