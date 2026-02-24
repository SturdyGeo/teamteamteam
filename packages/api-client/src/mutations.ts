import type { Org, Project, Ticket, Membership } from "@teamteamteam/domain";
import type { HttpClient } from "./http.js";
import type {
  CreateOrgInput,
  CreateProjectInput,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  AssignTicketInput,
  ReopenTicketInput,
  AddTagInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from "./types.js";

export interface MutationMethods {
  createOrg(input: CreateOrgInput): Promise<Org>;
  createProject(orgId: string, input: CreateProjectInput): Promise<Project>;
  createTicket(projectId: string, input: CreateTicketInput): Promise<Ticket>;
  updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket>;
  moveTicket(ticketId: string, input: MoveTicketInput): Promise<Ticket>;
  assignTicket(ticketId: string, input: AssignTicketInput): Promise<Ticket>;
  closeTicket(ticketId: string): Promise<Ticket>;
  reopenTicket(ticketId: string, input: ReopenTicketInput): Promise<Ticket>;
  deleteTicket(ticketId: string): Promise<Ticket>;
  addTag(ticketId: string, input: AddTagInput): Promise<Ticket>;
  removeTag(ticketId: string, tag: string): Promise<Ticket>;
  inviteMember(orgId: string, input: InviteMemberInput): Promise<Membership>;
  updateMemberRole(
    orgId: string,
    memberId: string,
    input: UpdateMemberRoleInput,
  ): Promise<Membership>;
  deleteOrg(orgId: string): Promise<Org>;
  deleteProject(orgId: string, projectId: string): Promise<Project>;
}

export function createMutationMethods(http: HttpClient): MutationMethods {
  return {
    createOrg(input: CreateOrgInput) {
      return http.post<Org>("/orgs", input);
    },

    createProject(orgId: string, input: CreateProjectInput) {
      return http.post<Project>(`/orgs/${orgId}/projects`, input);
    },

    createTicket(projectId: string, input: CreateTicketInput) {
      return http.post<Ticket>(`/projects/${projectId}/tickets`, input);
    },

    updateTicket(ticketId: string, input: UpdateTicketInput) {
      return http.patch<Ticket>(`/tickets/${ticketId}`, input);
    },

    moveTicket(ticketId: string, input: MoveTicketInput) {
      return http.patch<Ticket>(`/tickets/${ticketId}/move`, input);
    },

    assignTicket(ticketId: string, input: AssignTicketInput) {
      return http.patch<Ticket>(`/tickets/${ticketId}/assign`, input);
    },

    closeTicket(ticketId: string) {
      return http.patch<Ticket>(`/tickets/${ticketId}/close`);
    },

    reopenTicket(ticketId: string, input: ReopenTicketInput) {
      return http.patch<Ticket>(`/tickets/${ticketId}/reopen`, input);
    },

    deleteTicket(ticketId: string) {
      return http.delete<Ticket>(`/tickets/${ticketId}`);
    },

    addTag(ticketId: string, input: AddTagInput) {
      return http.post<Ticket>(`/tickets/${ticketId}/tags`, input);
    },

    removeTag(ticketId: string, tag: string) {
      const encoded = encodeURIComponent(tag);
      return http.delete<Ticket>(`/tickets/${ticketId}/tags/${encoded}`);
    },

    inviteMember(orgId: string, input: InviteMemberInput) {
      return http.post<Membership>(`/orgs/${orgId}/members`, input);
    },

    updateMemberRole(orgId: string, memberId: string, input: UpdateMemberRoleInput) {
      return http.patch<Membership>(`/orgs/${orgId}/members/${memberId}`, input);
    },

    deleteOrg(orgId: string) {
      return http.delete<Org>(`/orgs/${orgId}`);
    },

    deleteProject(orgId: string, projectId: string) {
      return http.delete<Project>(`/orgs/${orgId}/projects/${projectId}`);
    },
  };
}
