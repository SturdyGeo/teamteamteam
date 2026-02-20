/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

/**
 * Creates a mock Supabase client that returns results from an ordered queue.
 * Each awaited query chain consumes the next result from the queue.
 */
export function createMockSupabase(results: MockResult[]) {
  const queue = [...results];

  function createBuilder() {
    const builder: Record<string, any> = {};

    for (const method of [
      "select",
      "eq",
      "is",
      "order",
      "insert",
      "update",
      "delete",
      "upsert",
      "single",
    ]) {
      builder[method] = () => builder;
    }

    builder.then = (onfulfilled?: any, onrejected?: any) => {
      const result = queue.shift() ?? { data: null, error: null };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    };

    return builder;
  }

  return {
    from: () => createBuilder(),
    rpc: () => createBuilder(),
  };
}
