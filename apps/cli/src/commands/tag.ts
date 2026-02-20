import type { Command } from "commander";
import { getClient } from "../client.js";
import { getDefaultProjectId } from "../config.js";
import {
  printJson,
  printTable,
  printSuccess,
  withErrorHandler,
  formatDate,
} from "../output.js";
import { resolveTicket } from "../resolve.js";

export function registerTagCommands(program: Command): void {
  program
    .command("tags")
    .description("List all tags used in the current project")
    .addHelpText(
      "after",
      `
Examples:
  $ candoo tags
  $ candoo tags --json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const tags = await client.getTags(projectId);

        if (json) {
          printJson(tags);
        } else {
          printTable(tags, [
            { header: "Name", value: (t) => t.name },
            { header: "Created", value: (t) => formatDate(t.created_at) },
          ]);
        }
      }),
    );
}

export function registerTicketTagCommands(ticket: Command): void {
  const tag = ticket
    .command("tag")
    .description("Manage ticket tags")
    .addHelpText(
      "after",
      `
Tags are auto-normalized to lowercase and trimmed.

Examples:
  $ candoo ticket tag add BACK-1 bug
  $ candoo ticket tag add BACK-1 "tech-debt"
  $ candoo ticket tag remove BACK-1 bug`,
    );

  tag
    .command("add")
    .description("Add a tag to a ticket")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .argument("<tag>", "Tag name (auto-normalized to lowercase)")
    .addHelpText(
      "after",
      `
Examples:
  $ candoo ticket tag add BACK-1 bug
  $ candoo ticket tag add BACK-1 "tech-debt"`,
    )
    .action(
      withErrorHandler(async (key: string, tagName: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);
        const updated = await client.addTag(resolved.id, { tag: tagName });

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Added tag "${tagName}" to ${key.toUpperCase()}.`);
        }
      }),
    );

  tag
    .command("remove")
    .description("Remove a tag from a ticket")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .argument("<tag>", "Tag name")
    .addHelpText(
      "after",
      `
Example:
  $ candoo ticket tag remove BACK-1 bug`,
    )
    .action(
      withErrorHandler(async (key: string, tagName: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);
        const updated = await client.removeTag(resolved.id, tagName);

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Removed tag "${tagName}" from ${key.toUpperCase()}.`);
        }
      }),
    );
}
