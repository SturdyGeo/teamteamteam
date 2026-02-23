import { useQuery } from "@tanstack/react-query";
import {
  orgMembersQueryOptions,
  orgProjectsQueryOptions,
  orgsQueryOptions,
} from "@/features/orgs/queries";

export function useOrgsQuery(enabled = true) {
  return useQuery({
    ...orgsQueryOptions(),
    enabled,
  });
}

export function useOrgProjectsQuery(orgId: string | null, enabled = true) {
  return useQuery({
    ...orgProjectsQueryOptions(orgId ?? ""),
    enabled: enabled && Boolean(orgId),
  });
}

export function useOrgMembersQuery(orgId: string | null, enabled = true) {
  return useQuery({
    ...orgMembersQueryOptions(orgId ?? ""),
    enabled: enabled && Boolean(orgId),
  });
}
