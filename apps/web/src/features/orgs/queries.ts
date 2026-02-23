import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function orgsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.orgs.list(),
    queryFn: () => apiClient.getOrgs(),
    staleTime: 5 * 60_000,
  });
}

export function orgProjectsQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: queryKeys.orgs.projects(orgId),
    queryFn: () => apiClient.getProjects(orgId),
    staleTime: 60_000,
  });
}

export function orgMembersQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: queryKeys.orgs.members(orgId),
    queryFn: () => apiClient.getMembers(orgId),
    staleTime: 30_000,
  });
}
