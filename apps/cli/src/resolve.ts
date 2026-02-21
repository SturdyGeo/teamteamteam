import type { TeamteamteamClient, OrgWithRole } from "@teamteamteam/api-client";
import type { Ticket, WorkflowColumn } from "@teamteamteam/domain";
import { parseTicketKey } from "@teamteamteam/domain";
import type { MemberWithUser } from "@teamteamteam/api-client";
import { loadConfig } from "./config.js";

export async function resolveOrg(
  client: TeamteamteamClient,
  nameOrId: string,
): Promise<OrgWithRole> {
  const orgs = await client.getOrgs();
  const byId = orgs.find((o) => o.id === nameOrId);
  if (byId) return byId;
  const byName = orgs.find(
    (o) => o.name.toLowerCase() === nameOrId.toLowerCase(),
  );
  if (byName) return byName;
  const available = orgs.map((o) => o.name).join(", ");
  throw new Error(
    `Org "${nameOrId}" not found. Available orgs: ${available}`,
  );
}

export async function resolveOrgId(
  client: TeamteamteamClient,
  flag?: string,
): Promise<string> {
  if (flag) {
    const org = await resolveOrg(client, flag);
    return org.id;
  }
  const config = await loadConfig();
  if (config.orgId) return config.orgId;
  const orgs = await client.getOrgs();
  if (orgs.length === 1) return orgs[0].id;
  if (orgs.length === 0) {
    throw new Error("No orgs found. Create one with 'ttteam org create <name>'.");
  }
  const names = orgs.map((o) => `  ${o.name}`).join("\n");
  throw new Error(
    `Multiple orgs found. Use --org <name> or run 'ttteam org use <name>' to set a default.\n${names}`,
  );
}

export async function resolveTicket(
  client: TeamteamteamClient,
  projectId: string,
  key: string,
): Promise<Ticket> {
  const parsed = parseTicketKey(key.toUpperCase());
  if (!parsed) {
    throw new Error(`Invalid ticket key "${key}". Expected format: PREFIX-123`);
  }
  const tickets = await client.getTickets(projectId);
  const ticket = tickets.find((t) => t.number === parsed.number);
  if (!ticket) {
    throw new Error(`Ticket "${key}" not found.`);
  }
  return ticket;
}

export async function resolveColumn(
  client: TeamteamteamClient,
  projectId: string,
  name: string,
): Promise<WorkflowColumn> {
  const columns = await client.getColumns(projectId);
  const match = columns.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    const available = columns.map((c) => c.name).join(", ");
    throw new Error(
      `Column "${name}" not found. Available columns: ${available}`,
    );
  }
  return match;
}

export async function resolveMember(
  client: TeamteamteamClient,
  orgId: string,
  email: string,
): Promise<MemberWithUser> {
  const members = await client.getMembers(orgId);
  const match = members.find(
    (m) => m.user.email.toLowerCase() === email.toLowerCase(),
  );
  if (!match) {
    throw new Error(`Member with email "${email}" not found in this org.`);
  }
  return match;
}

export async function resolveProjectByPrefix(
  client: TeamteamteamClient,
  orgId: string,
  prefix: string,
): Promise<{ id: string; prefix: string }> {
  const projects = await client.getProjects(orgId);
  const match = projects.find(
    (p) => p.prefix.toUpperCase() === prefix.toUpperCase(),
  );
  if (!match) {
    throw new Error(
      `Project with prefix "${prefix}" not found. Run 'ttteam project list' to see available projects.`,
    );
  }
  return { id: match.id, prefix: match.prefix };
}
