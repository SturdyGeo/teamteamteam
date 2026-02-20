import chalk from "chalk";
import { createInterface } from "node:readline";
import { ApiError } from "@candoo/api-client";

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

interface TableColumn<T> {
  header: string;
  value: (row: T) => string;
}

export function printTable<T>(rows: T[], columns: TableColumn<T>[]): void {
  if (rows.length === 0) {
    console.log(chalk.dim("No results."));
    return;
  }

  const widths = columns.map((col) =>
    Math.max(col.header.length, ...rows.map((r) => col.value(r).length)),
  );

  const header = columns
    .map((col, i) => chalk.bold(col.header.padEnd(widths[i])))
    .join("  ");
  console.log(header);

  const separator = widths.map((w) => chalk.dim("─".repeat(w))).join("  ");
  console.log(separator);

  for (const row of rows) {
    const line = columns
      .map((col, i) => col.value(row).padEnd(widths[i]))
      .join("  ");
    console.log(line);
  }
}

export function printSuccess(msg: string): void {
  console.log(chalk.green("✓") + " " + msg);
}

export function printError(msg: string): void {
  console.error(chalk.red("error:") + " " + msg);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export async function confirmAction(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export function handleError(err: unknown): never {
  if (err instanceof ApiError) {
    switch (err.statusCode) {
      case 401:
        printError("Not authenticated. Run 'candoo login <email>' first.");
        break;
      case 403:
        printError("Permission denied.");
        break;
      case 404:
        printError("Not found: " + err.message);
        break;
      default:
        printError(err.message);
    }
  } else if (err instanceof Error) {
    printError(err.message);
  } else {
    printError("An unexpected error occurred.");
  }
  process.exit(1);
}

export function withErrorHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (err) {
      handleError(err);
    }
  };
}
