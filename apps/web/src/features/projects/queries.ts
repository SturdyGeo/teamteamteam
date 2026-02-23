import { queryOptions } from "@tanstack/react-query";
import type { TicketQueryParams } from "@teamteamteam/api-client/web";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function projectColumnsQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.projects.columns(projectId),
    queryFn: () => apiClient.getColumns(projectId),
    staleTime: 60_000,
  });
}

export function projectTicketsQueryOptions(
  projectId: string,
  params?: TicketQueryParams,
) {
  return queryOptions({
    queryKey: queryKeys.projects.tickets(projectId, params),
    queryFn: () => apiClient.getTickets(projectId, params),
    staleTime: 15_000,
  });
}

export function projectTicketQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: queryKeys.projects.ticket(ticketId),
    queryFn: () => apiClient.getTicket(ticketId),
    staleTime: 15_000,
  });
}

export function projectTagsQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.projects.tags(projectId),
    queryFn: () => apiClient.getTags(projectId),
    staleTime: 60_000,
  });
}
