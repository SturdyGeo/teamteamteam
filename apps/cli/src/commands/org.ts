import type { Command } from "commander";
import type { MembershipRole } from "@teamteamteam/domain";
import { getClient } from "../client.js";
import { loadConfig, saveConfig } from "../config.js";
import {
  printJson,
  printTable,
  printSuccess,
  confirmAction,
  withErrorHandler,
} from "../output.js";
import { resolveOrg, resolveOrgId } from "../resolve.js";

export function registerOrgCommands(program: Command): void {
  const org = program
    .command("org")
    .description("Manage organizations")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam org create "Acme Corp"
  $ ttteam org use "Acme Corp"
  $ ttteam org list`,
    );

  org
    .command("list")
    .description("List your organizations")
    .action(
      withErrorHandler(async (_opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json } = cmd.optsWithGlobals();
        const orgs = await client.getOrgs();

        if (json) {
          printJson(orgs);
        } else {
          printTable(orgs, [
            { header: "ID", value: (o) => o.id },
            { header: "Name", value: (o) => o.name },
            { header: "Role", value: (o) => o.membership_role },
          ]);
        }
      }),
    );

  org
    .command("create")
    .description("Create a new organization")
    .argument("<name>", 'Organization name (e.g. "Acme Corp")')
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam org create "Acme Corp"
  $ ttteam org create MyStartup`,
    )
    .action(
      withErrorHandler(async (name: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json } = cmd.optsWithGlobals();
        const created = await client.createOrg({ name });

        if (json) {
          printJson(created);
        } else {
          printSuccess(`Organization "${created.name}" created (${created.id}).`);
        }
      }),
    );

  org
    .command("use")
    .description("Set the default organization for this machine")
    .argument("<name>", "Organization name")
    .addHelpText(
      "after",
      `
Example:
  $ ttteam org use "Acme Corp"`,
    )
    .action(
      withErrorHandler(async (name: string) => {
        const client = getClient();
        const resolved = await resolveOrg(client, name);
        const config = await loadConfig();
        await saveConfig({ ...config, orgId: resolved.id });
        printSuccess(`Default org set to "${resolved.name}".`);
      }),
    );

  org
    .command("delete")
    .description("Delete an organization and all its data")
    .argument("<name>", "Organization name")
    .option("-y, --yes", "Skip confirmation prompt")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam org delete "Acme Corp"
  $ ttteam org delete "Acme Corp" --yes`,
    )
    .action(
      withErrorHandler(async (name: string, opts: { yes?: boolean }, cmd: Command) => {
        const client = getClient();
        const { json } = cmd.optsWithGlobals();
        const resolved = await resolveOrg(client, name);

        if (!opts.yes) {
          const confirmed = await confirmAction(
            `Are you sure you want to delete org "${resolved.name}"? All projects and data will be lost.`,
          );
          if (!confirmed) {
            console.log("Aborted.");
            return;
          }
        }

        const deleted = await client.deleteOrg(resolved.id);

        const config = await loadConfig();
        if (config.orgId === resolved.id) {
          await saveConfig({ ...config, orgId: undefined, projectId: undefined, projectPrefix: undefined });
        }

        if (json) {
          printJson(deleted);
        } else {
          printSuccess(`Organization "${resolved.name}" deleted.`);
        }
      }),
    );

  org
    .command("invite")
    .description("Invite a user to the current organization by email")
    .argument("<email>", "Email of the user to invite")
    .option("--role <role>", "Role to assign (admin or member)", "member")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam org invite alice@example.com
  $ ttteam org invite bob@example.com --role admin`,
    )
    .action(
      withErrorHandler(async (email: string, opts: { role: string }, cmd: Command) => {
        const client = getClient();
        const { json, org } = cmd.optsWithGlobals();
        const orgId = await resolveOrgId(client, org);
        const role = opts.role as MembershipRole;
        const membership = await client.inviteMember(orgId, { email, role });

        if (json) {
          printJson(membership);
        } else {
          printSuccess(`Invited ${email} as ${role}.`);
        }
      }),
    );
}
