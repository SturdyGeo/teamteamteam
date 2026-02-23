import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTicketInput,
  ReopenTicketInput,
  TicketQueryParams,
  UpdateTicketInput,
} from "@teamteamteam/api-client/web";
import type { Ticket } from "@teamteamteam/domain";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  projectColumnsQueryOptions,
  projectTicketQueryOptions,
  projectTicketsQueryOptions,
  ticketActivityQueryOptions,
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

export function useTicketDetailQuery(ticketId: string | null, enabled = true) {
  return useQuery({
    ...projectTicketQueryOptions(ticketId ?? ""),
    enabled: enabled && Boolean(ticketId),
  });
}

export function useTicketActivityQuery(ticketId: string | null, enabled = true) {
  return useQuery({
    ...ticketActivityQueryOptions(ticketId ?? ""),
    enabled: enabled && Boolean(ticketId),
  });
}

interface MoveTicketVariables {
  ticketId: string;
  toColumnId: string;
}

interface AssignTicketVariables {
  ticketId: string;
  assigneeId: string | null;
}

interface ReopenTicketVariables {
  ticketId: string;
  toColumnId: string;
}

interface AddTagVariables {
  ticketId: string;
  tag: string;
}

interface RemoveTagVariables {
  ticketId: string;
  tag: string;
}

interface AssignTicketContext {
  previousTicketLists: Array<[readonly unknown[], Ticket[] | undefined]>;
  previousTicket: Ticket | undefined;
}

async function invalidateTicketQueries(
  projectId: string | null,
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId?: string,
): Promise<void> {
  if (!projectId) {
    return;
  }

  await queryClient.invalidateQueries({
    queryKey: queryKeys.projects.tickets(projectId),
  });

  if (!ticketId) {
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.ticket(ticketId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.activity(ticketId),
    }),
  ]);
}

export function useCreateTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      if (!projectId) {
        throw new Error("Project is required.");
      }

      return apiClient.createTicket(projectId, input);
    },
    onSuccess: async (ticket) => {
      await invalidateTicketQueries(projectId, queryClient, ticket.id);
    },
  });
}

export function useMoveTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, toColumnId }: MoveTicketVariables) =>
      apiClient.moveTicket(ticketId, { to_column_id: toColumnId }),
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}

export function useUpdateTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      input,
    }: {
      ticketId: string;
      input: UpdateTicketInput;
    }) => apiClient.updateTicket(ticketId, input),
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}

export function useAssignTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }: AssignTicketVariables) =>
      apiClient.assignTicket(ticketId, { assignee_id: assigneeId }),
    onMutate: async ({ ticketId, assigneeId }): Promise<AssignTicketContext> => {
      if (!projectId) {
        return {
          previousTicketLists: [],
          previousTicket: undefined,
        };
      }

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: queryKeys.projects.tickets(projectId),
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.projects.ticket(ticketId),
        }),
      ]);

      const previousTicketLists = queryClient.getQueriesData<Ticket[]>({
        queryKey: queryKeys.projects.tickets(projectId),
      });
      const previousTicket = queryClient.getQueryData<Ticket>(
        queryKeys.projects.ticket(ticketId),
      );
      const now = new Date().toISOString();

      for (const [key, list] of previousTicketLists) {
        if (!list) {
          continue;
        }

        queryClient.setQueryData<Ticket[]>(
          key,
          list.map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  assignee_id: assigneeId,
                  updated_at: now,
                }
              : ticket,
          ),
        );
      }

      queryClient.setQueryData<Ticket | undefined>(
        queryKeys.projects.ticket(ticketId),
        (ticket) =>
          ticket
            ? {
                ...ticket,
                assignee_id: assigneeId,
                updated_at: now,
              }
            : ticket,
      );

      return {
        previousTicketLists,
        previousTicket,
      };
    },
    onError: (_error, variables, context) => {
      if (!context) {
        return;
      }

      for (const [key, list] of context.previousTicketLists) {
        queryClient.setQueryData<Ticket[] | undefined>(key, list);
      }

      queryClient.setQueryData<Ticket | undefined>(
        queryKeys.projects.ticket(variables.ticketId),
        context.previousTicket,
      );
    },
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}

export function useCloseTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => apiClient.closeTicket(ticketId),
    onSuccess: async (_ticket, ticketId) => {
      await invalidateTicketQueries(projectId, queryClient, ticketId);
    },
  });
}

export function useReopenTicketMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, toColumnId }: ReopenTicketVariables) => {
      const input: ReopenTicketInput = { to_column_id: toColumnId };
      return apiClient.reopenTicket(ticketId, input);
    },
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}

export function useAddTagMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, tag }: AddTagVariables) =>
      apiClient.addTag(ticketId, { tag }),
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}

export function useRemoveTagMutation(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, tag }: RemoveTagVariables) =>
      apiClient.removeTag(ticketId, tag),
    onSuccess: async (_ticket, variables) => {
      await invalidateTicketQueries(projectId, queryClient, variables.ticketId);
    },
  });
}
