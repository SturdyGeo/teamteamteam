#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerOrgCommands } from "./commands/org.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerTicketCommands } from "./commands/ticket.js";
import { registerTagCommands } from "./commands/tag.js";
import { registerBoardCommand } from "./commands/board.js";
import { configureClient } from "./client.js";

declare const __TTTEAM_VERSION__: string | undefined;

const embeddedVersion =
  typeof __TTTEAM_VERSION__ !== "undefined" ? __TTTEAM_VERSION__ : undefined;
const cliVersion = (embeddedVersion ?? process.env.TTTEAM_VERSION ?? "0.1.0").replace(/^v/, "");

const program = new Command("ttteam")
  .version(cliVersion)
  .description("Terminal-first multi-user kanban")
  .showHelpAfterError()
  .option("--json", "Output as JSON")
  .option("--org <name>", "Override default org (name or UUID)")
  .option("--project <prefix>", "Override default project (prefix or UUID)")
  .option("--custom-backend", "Use a custom backend from flags/env instead of the built-in backend")
  .option("--api-url <url>", "Custom API URL (requires --custom-backend)")
  .option("--supabase-url <url>", "Custom Supabase URL (requires --custom-backend)")
  .option(
    "--supabase-anon-key <key>",
    "Custom Supabase anon key (requires --custom-backend)",
  )
  .addHelpText(
    "after",
    `
Getting started:
  $ ttteam login alice@acme.com
  $ ttteam org create "Acme Corp"
  $ ttteam org use "Acme Corp"
  $ ttteam project create "Backend API" BACK
  $ ttteam project use BACK
  $ ttteam ticket create "My first ticket"
  $ ttteam board`,
  );

program.hook("preAction", (_command, actionCommand) => {
  const opts = actionCommand.optsWithGlobals<{
    customBackend?: boolean;
    apiUrl?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  }>();
  configureClient({
    customBackend: opts.customBackend,
    apiUrl: opts.apiUrl,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
  });
});

registerAuthCommands(program);
registerOrgCommands(program);
registerProjectCommands(program);
registerTicketCommands(program);
registerTagCommands(program);
registerBoardCommand(program);

program.parse();
