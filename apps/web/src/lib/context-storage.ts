const ORG_STORAGE_KEY = "teamteamteam:web:org-id";
const PROJECT_STORAGE_KEY = "teamteamteam:web:project-id";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getStoredOrgId(): string | null {
  return getStorage()?.getItem(ORG_STORAGE_KEY) ?? null;
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
  return getStorage()?.getItem(PROJECT_STORAGE_KEY) ?? null;
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
