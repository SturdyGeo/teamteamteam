import type { Command } from "commander";
import { getClient } from "../client.js";
import { saveConfig, loadConfig } from "../config.js";
import {
  printJson,
  printTable,
  printSuccess,
  confirmAction,
  withErrorHandler,
} from "../output.js";
import { resolveProjectByPrefix, resolveOrgId } from "../resolve.js";

export function registerProjectCommands(program: Command): void {
  const project = program
    .command("project")
    .description("Manage projects")
    .addHelpText(
      "after",
      `
Examples:
  $ candoo project create "Backend API" BACK
  $ candoo project use BACK
  $ candoo project list`,
    );

  project
    .command("list")
    .description("List projects in the current org")
    .action(
      withErrorHandler(async (_opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, org } = cmd.optsWithGlobals();
        const orgId = await resolveOrgId(client, org);
        const projects = await client.getProjects(orgId);

        if (json) {
          printJson(projects);
        } else {
          printTable(projects, [
            { header: "Prefix", value: (p) => p.prefix },
            { header: "Name", value: (p) => p.name },
            { header: "ID", value: (p) => p.id },
          ]);
        }
      }),
    );

  project
    .command("create")
    .description("Create a new project with a ticket key prefix")
    .argument("<name>", "Project name")
    .argument("<prefix>", "Ticket key prefix, uppercase letters (e.g. BACK, PROJ, WEB)")
    .addHelpText(
      "after",
      `
The prefix is used to generate ticket keys (e.g. BACK → BACK-1, BACK-2).

Examples:
  $ candoo project create "Backend API" BACK
  $ candoo project create "Frontend" WEB`,
    )
    .action(
      withErrorHandler(async (name: string, prefix: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, org } = cmd.optsWithGlobals();
        const orgId = await resolveOrgId(client, org);
        const created = await client.createProject(orgId, { name, prefix: prefix.toUpperCase() });

        if (json) {
          printJson(created);
        } else {
          printSuccess(`Project "${created.name}" (${created.prefix}) created.`);
        }
      }),
    );

  project
    .command("use")
    .description("Set the default project for this machine")
    .argument("<prefix>", "Project prefix (e.g. BACK)")
    .addHelpText(
      "after",
      `
Example:
  $ candoo project use BACK`,
    )
    .action(
      withErrorHandler(async (prefix: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { org } = cmd.optsWithGlobals();
        const orgId = await resolveOrgId(client, org);
        const resolved = await resolveProjectByPrefix(client, orgId, prefix);
        const config = await loadConfig();
        await saveConfig({
          ...config,
          orgId,
          projectId: resolved.id,
          projectPrefix: resolved.prefix,
        });
        printSuccess(`Default project set to ${resolved.prefix}.`);
      }),
    );

  project
    .command("delete")
    .description("Delete a project and all its tickets")
    .argument("<prefix>", "Project prefix (e.g. BACK)")
    .option("-y, --yes", "Skip confirmation prompt")
    .addHelpText(
      "after",
      `
Examples:
  $ candoo project delete BACK
  $ candoo project delete BACK --yes`,
    )
    .action(
      withErrorHandler(async (prefix: string, opts: { yes?: boolean }, cmd: Command) => {
        const client = getClient();
        const { json, org } = cmd.optsWithGlobals();
        const orgId = await resolveOrgId(client, org);
        const resolved = await resolveProjectByPrefix(client, orgId, prefix);

        if (!opts.yes) {
          const confirmed = await confirmAction(
            `Are you sure you want to delete project "${resolved.prefix}"? All tickets will be lost.`,
          );
          if (!confirmed) {
            console.log("Aborted.");
            return;
          }
        }

        const deleted = await client.deleteProject(orgId, resolved.id);

        const config = await loadConfig();
        if (config.projectId === resolved.id) {
          await saveConfig({ ...config, projectId: undefined, projectPrefix: undefined });
        }

        if (json) {
          printJson(deleted);
        } else {
          printSuccess(`Project "${resolved.prefix}" deleted.`);
        }
      }),
    );
}
