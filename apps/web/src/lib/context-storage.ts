const ORG_STORAGE_KEY = "teamteamteam:web:org-id";
const PROJECT_STORAGE_KEY = "teamteamteam:web:project-id";
const VISIBLE_PROJECTS_BY_ORG_STORAGE_KEY = "teamteamteam:web:visible-projects-by-org";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getStoredOrgId(): string | null {
  const storage = getStorage();
  const value = storage?.getItem(ORG_STORAGE_KEY) ?? null;
  if (!value) {
    return null;
  }

  if (UUID_REGEX.test(value)) {
    return value;
  }

  storage?.removeItem(ORG_STORAGE_KEY);
  return null;
}

export function setStoredOrgId(orgId: string | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (!orgId) {
    storage.removeItem(ORG_STORAGE_KEY);
    return;
  }

  storage.setItem(ORG_STORAGE_KEY, orgId);
}

export function getStoredProjectId(): string | null {
  const storage = getStorage();
  const value = storage?.getItem(PROJECT_STORAGE_KEY) ?? null;
  if (!value) {
    return null;
  }

  if (UUID_REGEX.test(value)) {
    return value;
  }

  storage?.removeItem(PROJECT_STORAGE_KEY);
  return null;
}

export function setStoredProjectId(projectId: string | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (!projectId) {
    storage.removeItem(PROJECT_STORAGE_KEY);
    return;
  }

  storage.setItem(PROJECT_STORAGE_KEY, projectId);
}

function sanitizeProjectIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const value of input) {
    if (typeof value === "string" && UUID_REGEX.test(value)) {
      deduped.add(value);
    }
  }

  return [...deduped];
}

function readVisibleProjectsByOrg(storage: Storage): Record<string, string[]> {
  const raw = storage.getItem(VISIBLE_PROJECTS_BY_ORG_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const record = parsed as Record<string, unknown>;
    const output: Record<string, string[]> = {};

    for (const [orgId, projectIds] of Object.entries(record)) {
      if (!UUID_REGEX.test(orgId)) {
        continue;
      }

      output[orgId] = sanitizeProjectIds(projectIds);
    }

    return output;
  } catch {
    return {};
  }
}

export function getStoredVisibleProjectIds(orgId: string): string[] {
  if (!UUID_REGEX.test(orgId)) {
    return [];
  }

  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const byOrg = readVisibleProjectsByOrg(storage);
  return byOrg[orgId] ?? [];
}

export function setStoredVisibleProjectIds(orgId: string, projectIds: string[]): void {
  if (!UUID_REGEX.test(orgId)) {
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  const byOrg = readVisibleProjectsByOrg(storage);
  byOrg[orgId] = sanitizeProjectIds(projectIds);
  storage.setItem(VISIBLE_PROJECTS_BY_ORG_STORAGE_KEY, JSON.stringify(byOrg));
}
