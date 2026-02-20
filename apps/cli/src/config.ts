import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

interface CliConfig {
  orgId?: string;
  projectId?: string;
  projectPrefix?: string;
}

function getConfigPath(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg || join(homedir(), ".config");
  return join(base, "candoo", "config.json");
}

export async function loadConfig(): Promise<CliConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  const filePath = getConfigPath();
  const dir = join(filePath, "..");
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function getDefaultOrgId(flag?: string): Promise<string> {
  if (flag) return flag;
  const config = await loadConfig();
  if (config.orgId) return config.orgId;
  throw new Error(
    "No org specified. Use --org <name> or run 'candoo org use <name>' to set a default.",
  );
}

export async function getDefaultProjectId(flag?: string): Promise<string> {
  if (flag) return flag;
  const config = await loadConfig();
  if (config.projectId) return config.projectId;
  throw new Error(
    "No project specified. Use --project <prefix> or run 'candoo project use <prefix>' to set a default.",
  );
}
