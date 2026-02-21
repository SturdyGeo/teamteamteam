import chalk from "chalk";
import type { Command } from "commander";
import { generateTicketKey } from "@teamteamteam/domain";
import { getClient } from "../client.js";
import { getDefaultProjectId, loadConfig } from "../config.js";
import {
  printJson,
  printTable,
  printSuccess,
  withErrorHandler,
  formatDate,
  formatDateTime,
} from "../output.js";
import {
  resolveTicket,
  resolveColumn,
  resolveMember,
  resolveOrgId,
} from "../resolve.js";
import { registerTicketTagCommands } from "./tag.js";

export function registerTicketCommands(program: Command): void {
  const ticket = program
    .command("ticket")
    .description("Manage tickets")
    .addHelpText(
      "after",
      `
Ticket keys have the format PREFIX-NUMBER (e.g. BACK-1, PROJ-42).
The prefix comes from your project. Run 'ttteam project list' to see prefixes.

Examples:
  $ ttteam ticket create "Fix login bug"
  $ ttteam ticket list --status "In Progress"
  $ ttteam ticket show BACK-1
  $ ttteam ticket move BACK-1 "In Progress"
  $ ttteam ticket assign BACK-1 alice@acme.com
  $ ttteam ticket close BACK-1`,
    );

  registerTicketTagCommands(ticket);

  ticket
    .command("list")
    .description("List tickets in the current project")
    .option("--status <column>", "Filter by column name (e.g. 'To Do', 'In Progress')")
    .option(
      "--assignee <assignee>",
      "Filter by assignee (email, display name, or email username)",
    )
    .option("--tag <name>", "Filter by tag")
    .option("--search <term>", "Search tickets")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam ticket list
  $ ttteam ticket list --status "In Progress"
  $ ttteam ticket list --tag bug --search login`,
    )
    .action(
      withErrorHandler(async (opts: Record<string, string | undefined>, cmd: Command) => {
        const client = getClient();
        const { json, project, org } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);

        const params: Record<string, string> = {};
        if (opts.status) {
          const col = await resolveColumn(client, projectId, opts.status);
          params.status_column_id = col.id;
        }
        if (opts.assignee) {
          const orgId = await resolveOrgId(client, org);
          const member = await resolveMember(client, orgId, opts.assignee);
          params.assignee_id = member.user.id;
        }
        if (opts.tag) params.tag = opts.tag;
        if (opts.search) params.search = opts.search;

        const tickets = await client.getTickets(projectId, params);
        const config = await loadConfig();
        const prefix = config.projectPrefix ?? "???";

        if (json) {
          printJson(tickets);
        } else {
          printTable(tickets, [
            { header: "Key", value: (t) => generateTicketKey(prefix, t.number) },
            { header: "Title", value: (t) => t.title },
            { header: "Tags", value: (t) => t.tags.join(", ") },
          ]);
        }
      }),
    );

  ticket
    .command("create")
    .description("Create a new ticket in the current project")
    .argument("<title>", "Ticket title (use quotes for multi-word titles)")
    .option("-d, --description <text>", "Longer description of the ticket")
    .option(
      "-a, --assignee <assignee>",
      "Assign to a team member (email, display name, or email username)",
    )
    .option("-t, --tag <name>", "Add a tag (repeatable for multiple tags)", collect, [])
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam ticket create "Fix login bug"
  $ ttteam ticket create "New feature" -a alice@acme.com
  $ ttteam ticket create "Refactor auth" -t backend -t tech-debt`,
    )
    .action(
      withErrorHandler(async (title: string, opts: Record<string, unknown>, cmd: Command) => {
        const client = getClient();
        const { json, project, org } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);

        let assignee_id: string | undefined;
        if (opts.assignee) {
          const orgId = await resolveOrgId(client, org);
          const member = await resolveMember(client, orgId, opts.assignee as string);
          assignee_id = member.user.id;
        }

        const created = await client.createTicket(projectId, {
          title,
          description: (opts.description as string) ?? undefined,
          assignee_id,
          tags: (opts.tag as string[]).length > 0 ? (opts.tag as string[]) : undefined,
        });

        const config = await loadConfig();
        const prefix = config.projectPrefix ?? "???";
        const key = generateTicketKey(prefix, created.number);

        if (json) {
          printJson(created);
        } else {
          printSuccess(`Ticket ${key} created: ${created.title}`);
        }
      }),
    );

  ticket
    .command("show")
    .description("Show ticket details, tags, and activity history")
    .argument("<key>", "Ticket key (e.g. BACK-1, PROJ-42)")
    .addHelpText(
      "after",
      `
Example:
  $ ttteam ticket show BACK-1`,
    )
    .action(
      withErrorHandler(async (key: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);
        const ticket = await client.getTicket(resolved.id);

        if (json) {
          printJson(ticket);
          return;
        }

        const config = await loadConfig();
        const prefix = config.projectPrefix ?? "???";
        const ticketKey = generateTicketKey(prefix, ticket.number);

        const columns = await client.getColumns(projectId);
        const col = columns.find((c) => c.id === ticket.status_column_id);
        const statusName = col?.name ?? ticket.status_column_id;

        console.log(chalk.bold(ticketKey) + "  " + ticket.title);
        console.log(chalk.dim("─".repeat(60)));
        console.log(`Status:    ${statusName}`);
        console.log(`Assignee:  ${ticket.assignee_id ?? chalk.dim("unassigned")}`);
        if (ticket.tags.length > 0) {
          console.log(`Tags:      ${ticket.tags.join(", ")}`);
        }
        if (ticket.description) {
          console.log();
          console.log(ticket.description);
        }
        console.log();
        console.log(chalk.dim(`Created: ${formatDateTime(ticket.created_at)}`));
        if (ticket.closed_at) {
          console.log(chalk.dim(`Closed:  ${formatDateTime(ticket.closed_at)}`));
        }

        const activity = await client.getActivity(ticket.id);
        if (activity.length > 0) {
          console.log();
          console.log(chalk.bold("Activity"));
          console.log(chalk.dim("─".repeat(40)));
          for (const event of activity) {
            const actor = event.actor?.display_name ?? event.actor?.email ?? "unknown";
            const date = formatDate(event.created_at);
            console.log(chalk.dim(`${date}  ${actor}  ${event.event_type}`));
          }
        }
      }),
    );

  ticket
    .command("move")
    .description("Move a ticket to a different workflow column")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .argument("<column>", "Target column name (use quotes if it contains spaces)")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam ticket move BACK-1 "In Progress"
  $ ttteam ticket move PROJ-42 Done`,
    )
    .action(
      withErrorHandler(async (key: string, columnName: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);
        const column = await resolveColumn(client, projectId, columnName);
        const updated = await client.moveTicket(resolved.id, { to_column_id: column.id });

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Moved ${key.toUpperCase()} to "${column.name}".`);
        }
      }),
    );

  ticket
    .command("assign")
    .description("Assign a ticket to an org member")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .argument(
      "<assignee>",
      "Assignee identifier (email, display name, or email username)",
    )
    .addHelpText(
      "after",
      `
Example:
  $ ttteam ticket assign BACK-1 alice@acme.com
  $ ttteam ticket assign BACK-1 alice`,
    )
    .action(
      withErrorHandler(async (key: string, assignee: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project, org } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const orgId = await resolveOrgId(client, org);
        const resolved = await resolveTicket(client, projectId, key);
        const member = await resolveMember(client, orgId, assignee);
        const updated = await client.assignTicket(resolved.id, { assignee_id: member.user.id });

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Assigned ${key.toUpperCase()} to ${assignee}.`);
        }
      }),
    );

  ticket
    .command("close")
    .description("Close a ticket (marks it as done)")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .addHelpText(
      "after",
      `
Example:
  $ ttteam ticket close BACK-1`,
    )
    .action(
      withErrorHandler(async (key: string, _opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);
        const updated = await client.closeTicket(resolved.id);

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Closed ${key.toUpperCase()}.`);
        }
      }),
    );

  ticket
    .command("reopen")
    .description("Reopen a previously closed ticket")
    .argument("<key>", "Ticket key (e.g. BACK-1)")
    .option("--column <name>", "Target column (defaults to first column)")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam ticket reopen BACK-1
  $ ttteam ticket reopen BACK-1 --column "In Progress"`,
    )
    .action(
      withErrorHandler(async (key: string, opts: Record<string, string | undefined>, cmd: Command) => {
        const client = getClient();
        const { json, project } = cmd.optsWithGlobals();
        const projectId = await getDefaultProjectId(project);
        const resolved = await resolveTicket(client, projectId, key);

        let columnId: string;
        if (opts.column) {
          const col = await resolveColumn(client, projectId, opts.column);
          columnId = col.id;
        } else {
          const columns = await client.getColumns(projectId);
          const sorted = [...columns].sort((a, b) => a.position - b.position);
          columnId = sorted[0].id;
        }

        const updated = await client.reopenTicket(resolved.id, { to_column_id: columnId });

        if (json) {
          printJson(updated);
        } else {
          printSuccess(`Reopened ${key.toUpperCase()}.`);
        }
      }),
    );
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
