import type { Project, WorkflowColumn, Ticket, Tag } from "@candoo/domain";
import type { HttpClient } from "./http.js";
import type {
  OrgWithRole,
  MemberWithUser,
  ActivityEventWithActor,
  TicketQueryParams,
} from "./types.js";

export interface QueryMethods {
  getOrgs(): Promise<OrgWithRole[]>;
  getProjects(orgId: string): Promise<Project[]>;
  getColumns(projectId: string): Promise<WorkflowColumn[]>;
  getTickets(projectId: string, params?: TicketQueryParams): Promise<Ticket[]>;
  getTicket(ticketId: string): Promise<Ticket>;
  getTags(projectId: string): Promise<Tag[]>;
  getActivity(ticketId: string): Promise<ActivityEventWithActor[]>;
  getMembers(orgId: string): Promise<MemberWithUser[]>;
}

function buildQueryString(params?: TicketQueryParams): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined,
  );
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(
    entries as [string, string][],
  ).toString();
  return `?${qs}`;
}

export function createQueryMethods(http: HttpClient): QueryMethods {
  return {
    getOrgs() {
      return http.get<OrgWithRole[]>("/orgs");
    },

    getProjects(orgId: string) {
      return http.get<Project[]>(`/orgs/${orgId}/projects`);
    },

    getColumns(projectId: string) {
      return http.get<WorkflowColumn[]>(
        `/projects/${projectId}/columns`,
      );
    },

    getTickets(projectId: string, params?: TicketQueryParams) {
      const qs = buildQueryString(params);
      return http.get<Ticket[]>(`/projects/${projectId}/tickets${qs}`);
    },

    getTicket(ticketId: string) {
      return http.get<Ticket>(`/tickets/${ticketId}`);
    },

    getTags(projectId: string) {
      return http.get<Tag[]>(`/projects/${projectId}/tags`);
    },

    getActivity(ticketId: string) {
      return http.get<ActivityEventWithActor[]>(
        `/tickets/${ticketId}/activity`,
      );
    },

    getMembers(orgId: string) {
      return http.get<MemberWithUser[]>(`/orgs/${orgId}/members`);
    },
  };
}
