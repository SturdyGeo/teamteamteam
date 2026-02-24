import type {
  Org,
  Membership,
  ActivityEvent,
  MembershipRole,
} from "@teamteamteam/domain";

// ---------- Response types ----------

export interface OrgWithRole extends Org {
  membership_role: MembershipRole;
}

export interface UserSummary {
  id: string;
  email: string;
  display_name: string;
}

export interface MemberWithUser extends Membership {
  user: UserSummary;
}

export type ActivityEventWithActor = ActivityEvent & {
  actor: UserSummary;
};

// ---------- Request types ----------

export interface CreateOrgInput {
  name: string;
}

export interface CreateProjectInput {
  name: string;
  prefix: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  assignee_id?: string | null;
  tags?: string[];
}

export interface UpdateTicketInput {
  title: string;
  description: string;
}

export interface MoveTicketInput {
  to_column_id: string;
}

export interface AssignTicketInput {
  assignee_id: string | null;
}

export interface ReopenTicketInput {
  to_column_id: string;
}

export interface AddTagInput {
  tag: string;
}

export interface InviteMemberInput {
  email: string;
  role: MembershipRole;
}

export interface UpdateMemberRoleInput {
  role: "admin" | "member" | "limited";
}

export interface TicketQueryParams {
  status_column_id?: string;
  assignee_id?: string;
  tag?: string;
  search?: string;
}

// ---------- Session + config ----------

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}

export interface SessionStore {
  get(): Promise<StoredSession | null>;
  set(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export interface ClientConfig {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  sessionStore?: SessionStore;
}
