import pg from "pg";

const APP_TABLES = [
  "activity_events",
  "ticket_tags",
  "tags",
  "tickets",
  "workflow_columns",
  "projects",
  "memberships",
  "orgs",
  "users",
];

export async function truncateAllTables(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Truncate all app tables (order doesn't matter with CASCADE)
    await client.query(
      `TRUNCATE ${APP_TABLES.join(", ")} CASCADE`,
    );
    // Delete auth users (triggers cascade to public.users via FK)
    await client.query("DELETE FROM auth.users");
  } finally {
    await client.end();
  }
}
