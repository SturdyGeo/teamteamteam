import type { Command } from "commander";
import { getClient } from "../client.js";
import {
  getDefaultProjectId,
  loadConfig,
} from "../config.js";
import { withErrorHandler } from "../output.js";
import { resolveOrgId } from "../resolve.js";

export function registerBoardCommand(program: Command): void {
  program
    .command("board")
    .description("Open the interactive kanban board (TUI)")
    .addHelpText(
      "after",
      `
Keyboard shortcuts: arrow keys to navigate, enter to select,
q to quit. Use 'candoo board' after setting a default project.

Examples:
  $ candoo board
  $ candoo board --project BACK`,
    )
    .action(
      withErrorHandler(async (_opts: unknown, cmd: Command) => {
        const { org, project } = cmd.optsWithGlobals();
        const client = getClient();
        const orgId = await resolveOrgId(client, org);
        const projectId = await getDefaultProjectId(project);
        const config = await loadConfig();
        const prefix = config.projectPrefix ?? "???";

        const { render } = await import("ink");
        const { createElement } = await import("react");
        const { App } = await import("../tui/App.js");

        const inst = render(
          createElement(App, { client, projectId, orgId, prefix }),
        );
        await inst.waitUntilExit();
      }),
    );
}
