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
  assignee: string,
): Promise<MemberWithUser> {
  const identifier = assignee.trim().toLowerCase();
  const members = await client.getMembers(orgId);

  const byEmail = members.filter(
    (m) => m.user.email.toLowerCase() === identifier,
  );
  if (byEmail.length === 1) return byEmail[0];

  const byDisplayName = members.filter(
    (m) => (m.user.display_name?.trim().toLowerCase() ?? "") === identifier,
  );
  if (byDisplayName.length === 1) return byDisplayName[0];
  if (byDisplayName.length > 1) {
    const matches = byDisplayName.map(formatMemberMatch).join(", ");
    throw new Error(`Assignee "${assignee}" is ambiguous. Matches: ${matches}`);
  }

  const byEmailUsername = members.filter((m) => {
    const [localPart] = m.user.email.toLowerCase().split("@");
    return localPart === identifier;
  });
  if (byEmailUsername.length === 1) return byEmailUsername[0];
  if (byEmailUsername.length > 1) {
    const matches = byEmailUsername.map(formatMemberMatch).join(", ");
    throw new Error(`Assignee "${assignee}" is ambiguous. Matches: ${matches}`);
  }

  if (byEmail.length > 1) {
    const matches = byEmail.map(formatMemberMatch).join(", ");
    throw new Error(`Assignee "${assignee}" is ambiguous. Matches: ${matches}`);
  }

  throw new Error(
    `Member "${assignee}" not found in this org. Use full email or a unique display name/email username.`,
  );
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

function formatMemberMatch(member: MemberWithUser): string {
  const displayName = member.user.display_name?.trim();
  if (displayName) {
    return `${displayName} <${member.user.email}>`;
  }
  return member.user.email;
}
