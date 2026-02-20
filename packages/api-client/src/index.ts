export { ApiError } from "./errors.js";
export { FileSessionStore } from "./session.js";
export { HttpClient } from "./http.js";
export type { HttpClientConfig } from "./http.js";
export { createAuthClient } from "./auth.js";
export type { AuthClient, AuthClientConfig } from "./auth.js";
export { createQueryMethods } from "./queries.js";
export type { QueryMethods } from "./queries.js";
export { createMutationMethods } from "./mutations.js";
export type { MutationMethods } from "./mutations.js";
export { createCandooClient } from "./client.js";
export type { CandooClient } from "./client.js";

export type {
  OrgWithRole,
  UserSummary,
  MemberWithUser,
  ActivityEventWithActor,
  CreateOrgInput,
  CreateProjectInput,
  CreateTicketInput,
  MoveTicketInput,
  AssignTicketInput,
  ReopenTicketInput,
  AddTagInput,
  InviteMemberInput,
  TicketQueryParams,
  StoredSession,
  SessionStore,
  ClientConfig,
} from "./types.js";
