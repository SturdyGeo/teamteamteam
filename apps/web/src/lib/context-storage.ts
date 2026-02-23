const ORG_STORAGE_KEY = "teamteamteam:web:org-id";
const PROJECT_STORAGE_KEY = "teamteamteam:web:project-id";
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
