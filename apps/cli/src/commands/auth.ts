import type { Command } from "commander";
import { createInterface } from "node:readline";
import { ApiError } from "@teamteamteam/api-client";
import { getClient } from "../client.js";
import { printSuccess, printJson, withErrorHandler } from "../output.js";

function readOtp(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Enter the 6-digit code from your email: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Log in with an OTP code sent to your email")
    .argument("<email>", "Your email address (e.g. alice@acme.com)")
    .addHelpText(
      "after",
      `
Example:
  $ ttteam login alice@acme.com`,
    )
    .action(
      withErrorHandler(async (email: string) => {
        const client = getClient();
        await client.sendMagicLink(email);
        console.log(`Login code sent to ${email}. Check your inbox.`);
        const token = await readOtp();
        await client.verifyOtp(email, token);
        printSuccess("Logged in successfully.");
      }),
    );

  program
    .command("logout")
    .description("Log out and clear session")
    .action(
      withErrorHandler(async () => {
        const client = getClient();
        await client.logout();
        printSuccess("Logged out.");
      }),
    );

  program
    .command("whoami")
    .description("Show current user")
    .addHelpText(
      "after",
      `
Examples:
  $ ttteam whoami
  $ ttteam whoami --json`,
    )
    .action(
      withErrorHandler(async (_opts: unknown, cmd: Command) => {
        const client = getClient();
        const { json } = cmd.optsWithGlobals();
        const session = await client.getSession();
        if (!session) {
          throw new ApiError("AUTH_ERROR", "Not logged in. Run 'ttteam login <email>' first.", 401);
        }
        if (json) {
          printJson(session.user);
        } else {
          console.log(`Email: ${session.user.email}`);
          console.log(`ID:    ${session.user.id}`);
        }
      }),
    );
}
