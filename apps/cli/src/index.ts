#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerOrgCommands } from "./commands/org.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerTicketCommands } from "./commands/ticket.js";
import { registerTagCommands } from "./commands/tag.js";
import { registerBoardCommand } from "./commands/board.js";

const program = new Command("candoo")
  .version("0.1.0")
  .description("Terminal-first multi-user kanban")
  .showHelpAfterError()
  .option("--json", "Output as JSON")
  .option("--org <name>", "Override default org (name or UUID)")
  .option("--project <prefix>", "Override default project (prefix or UUID)")
  .addHelpText(
    "after",
    `
Getting started:
  $ candoo login alice@acme.com
  $ candoo org create "Acme Corp"
  $ candoo org use "Acme Corp"
  $ candoo project create "Backend API" BACK
  $ candoo project use BACK
  $ candoo ticket create "My first ticket"
  $ candoo board`,
  );

registerAuthCommands(program);
registerOrgCommands(program);
registerProjectCommands(program);
registerTicketCommands(program);
registerTagCommands(program);
registerBoardCommand(program);

program.parse();
