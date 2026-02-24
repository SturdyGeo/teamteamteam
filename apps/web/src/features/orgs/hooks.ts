import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateOrgInput,
  CreateProjectInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from "@teamteamteam/api-client/web";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

export function useCreateOrgMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrgInput) => apiClient.createOrg(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orgs.list() });
    },
  });
}

export function useCreateProjectMutation(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!orgId) {
        throw new Error("Select an organization first.");
      }

      return apiClient.createProject(orgId, input);
    },
    onSuccess: async () => {
      if (!orgId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.orgs.projects(orgId) });
    },
  });
}

export function useInviteMemberMutation(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      if (!orgId) {
        throw new Error("Select an organization first.");
      }

      return apiClient.inviteMember(orgId, input);
    },
    onSuccess: async () => {
      if (!orgId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.orgs.members(orgId) });
    },
  });
}

export function useUpdateMemberRoleMutation(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, input }: { memberId: string; input: UpdateMemberRoleInput }) => {
      if (!orgId) {
        throw new Error("Select an organization first.");
      }

      return apiClient.updateMemberRole(orgId, memberId, input);
    },
    onSuccess: async () => {
      if (!orgId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.orgs.members(orgId) });
    },
  });
}
