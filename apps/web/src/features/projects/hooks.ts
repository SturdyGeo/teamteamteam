import { useQuery } from "@tanstack/react-query";
import type { TicketQueryParams } from "@teamteamteam/api-client/web";
import {
  projectColumnsQueryOptions,
  projectTicketQueryOptions,
  projectTagsQueryOptions,
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

export function useProjectTicketQuery(ticketId: string | null, enabled = true) {
  return useQuery({
    ...projectTicketQueryOptions(ticketId ?? ""),
    enabled: enabled && Boolean(ticketId),
  });
}

export function useProjectTagsQuery(projectId: string | null, enabled = true) {
  return useQuery({
    ...projectTagsQueryOptions(projectId ?? ""),
    enabled: enabled && Boolean(projectId),
  });
}
