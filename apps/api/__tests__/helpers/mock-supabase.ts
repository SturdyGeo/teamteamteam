/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

export interface MockSupabaseOptions {
  otpError?: { message: string; code?: string } | null;
  onSignInWithOtp?: (args: { email: string; options?: { shouldCreateUser?: boolean } }) => void;
}

/**
 * Creates a mock Supabase client that returns results from an ordered queue.
 * Each awaited query chain consumes the next result from the queue.
 */
export function createMockSupabase(
  results: MockResult[],
  options: MockSupabaseOptions = {},
) {
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
      "maybeSingle",
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
    auth: {
      signInWithOtp: async (args: { email: string; options?: { shouldCreateUser?: boolean } }) => {
        options.onSignInWithOtp?.(args);
        return {
          data: null,
          error: options.otpError ?? null,
        };
      },
    },
  };
}
