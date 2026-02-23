import type { TicketQueryParams } from "@teamteamteam/api-client/web";

function normalizeTicketParams(
  params?: TicketQueryParams,
): Readonly<Record<string, string>> {
  if (!params) {
    return {};
  }

  const entries = Object.entries(params)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries) as Record<string, string>;
}

export const queryKeys = {
  orgs: {
    all: ["orgs"] as const,
    list: () => [...queryKeys.orgs.all, "list"] as const,
    detail: (orgId: string) => [...queryKeys.orgs.all, "detail", orgId] as const,
    projects: (orgId: string) => [...queryKeys.orgs.all, orgId, "projects"] as const,
    members: (orgId: string) => [...queryKeys.orgs.all, orgId, "members"] as const,
  },

  projects: {
    all: ["projects"] as const,
    detail: (projectId: string) => [...queryKeys.projects.all, "detail", projectId] as const,
    ticket: (ticketId: string) => [...queryKeys.projects.all, "ticket", ticketId] as const,
    activity: (ticketId: string) => [...queryKeys.projects.all, "activity", ticketId] as const,
    columns: (projectId: string) => [...queryKeys.projects.all, projectId, "columns"] as const,
    tags: (projectId: string) => [...queryKeys.projects.all, projectId, "tags"] as const,
    tickets: (projectId: string, params?: TicketQueryParams) =>
      [
        ...queryKeys.projects.all,
        projectId,
        "tickets",
        normalizeTicketParams(params),
      ] as const,
  },
} as const;
