import type { AuthClient } from "./auth.js";
import { createAuthClient } from "./auth.js";
import type { QueryMethods } from "./queries.js";
import { createQueryMethods } from "./queries.js";
import type { MutationMethods } from "./mutations.js";
import { createMutationMethods } from "./mutations.js";
import { HttpClient } from "./http.js";
import { FileSessionStore } from "./session.js";
import type { ClientConfig } from "./types.js";

export type TeamteamteamClient = AuthClient & QueryMethods & MutationMethods;

export function createTeamteamteamClient(config: ClientConfig): TeamteamteamClient {
  const sessionStore = config.sessionStore ?? new FileSessionStore();
  const auth = createAuthClient({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    sessionStore,
  });
  const http = new HttpClient({
    baseUrl: config.baseUrl,
    getToken: () => auth.getToken(),
  });
  return {
    ...auth,
    ...createQueryMethods(http),
    ...createMutationMethods(http),
  };
}
