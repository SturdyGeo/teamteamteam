import type { TestUser } from "./setup.js";

// Hono's request() returns Response | Promise<Response>
type App = {
  request: (
    path: string,
    init?: RequestInit,
  ) => Response | Promise<Response>;
};

export async function authRequest(
  app: App,
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return await app.request(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
}

export async function createOrg(
  app: App,
  user: TestUser,
  name: string,
): Promise<Record<string, unknown>> {
  const res = await authRequest(app, "/orgs", user.accessToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (res.status !== 201) {
    const body = await res.text();
    throw new Error(`createOrg failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function createProject(
  app: App,
  user: TestUser,
  orgId: string,
  name: string,
  prefix: string,
): Promise<Record<string, unknown>> {
  const res = await authRequest(
    app,
    `/orgs/${orgId}/projects`,
    user.accessToken,
    {
      method: "POST",
      body: JSON.stringify({ name, prefix }),
    },
  );
  if (res.status !== 201) {
    const body = await res.text();
    throw new Error(`createProject failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getColumns(
  app: App,
  user: TestUser,
  projectId: string,
): Promise<Record<string, unknown>[]> {
  const res = await authRequest(
    app,
    `/projects/${projectId}/columns`,
    user.accessToken,
  );
  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`getColumns failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>[]>;
}

export async function createTicket(
  app: App,
  user: TestUser,
  projectId: string,
  title: string,
  opts?: { description?: string; assignee_id?: string | null; tags?: string[] },
): Promise<Record<string, unknown>> {
  const res = await authRequest(
    app,
    `/projects/${projectId}/tickets`,
    user.accessToken,
    {
      method: "POST",
      body: JSON.stringify({ title, ...opts }),
    },
  );
  if (res.status !== 201) {
    const body = await res.text();
    throw new Error(`createTicket failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}
