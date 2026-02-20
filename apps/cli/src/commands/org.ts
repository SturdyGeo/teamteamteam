import type { Command } from "commander";
import { getClient } from "../client.js";
import { loadConfig, saveConfig } from "../config.js";
import {
  printJson,
  printTable,
  printSuccess,
  confirmAction,
  withErrorHandler,
} from "../output.js";
import { resolveOrg } from "../resolve.js";

export function registerOrgCommands(program: Command): void {
  const org = program
    .command("org")
    .description("Manage organizations")
    .addHelpText(
      "after",
      `
Examples:
  $ candoo org create "Acme Corp"
  $ candoo org use "Acme Corp"
  $ candoo org list`,
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
  $ candoo org create "Acme Corp"
  $ candoo org create MyStartup`,
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
  $ candoo org use "Acme Corp"`,
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
  $ candoo org delete "Acme Corp"
  $ candoo org delete "Acme Corp" --yes`,
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
}
