import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TicketQueryParams } from "@teamteamteam/api-client/web";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  projectColumnsQueryOptions,
  projectTicketsQueryOptions,
} from "@/features/projects/queries";

export function useProjectColumnsQuery(projectId: string | null, enabled = true) {
  return useQuery({
    ...projectColumnsQueryOptions(projectId ?? ""),
    enabled: enabled && Boolean(projectId),
  });
}

export function useProjectTicketsQuery(
  projectId: string | null,
  params?: TicketQueryParams,
  enabled = true,
) {
  return useQuery({
    ...projectTicketsQueryOptions(projectId ?? "", params),
    enabled: enabled && Boolean(projectId),
  });
}

interface MoveTicketVariables {
  ticketId: string;
  toColumnId: string;
}

export function useMoveTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, toColumnId }: MoveTicketVariables) =>
      apiClient.moveTicket(ticketId, { to_column_id: toColumnId }),
    onSuccess: async () => {
      if (!projectId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets(projectId),
      });
    },
  });
}
