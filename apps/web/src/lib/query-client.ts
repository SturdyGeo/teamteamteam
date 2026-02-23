import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { reportMutationError, reportQueryError } from "@/lib/query-diagnostics";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportQueryError(error, query.queryKey);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        reportMutationError(error, mutation.options.mutationKey);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          const unauthorized =
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            Number((error as { status?: number }).status) === 401;

          if (unauthorized) {
            return false;
          }

          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
