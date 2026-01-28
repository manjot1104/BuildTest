import postgres from "postgres";
import { spawnSync } from "node:child_process";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");

  // Use a single connection for schema reset.
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    // WARNING: This deletes ALL tables/views/functions in the public schema.
    // We recreate the schema and restore basic permissions.
    // Also remove Drizzle's internal schema so migrations re-apply from scratch.
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    // Managed Postgres providers often don't have a `postgres` role.
    // Grant to the current connected role instead.
    await sql`GRANT ALL ON SCHEMA public TO CURRENT_USER`;
  } finally {
    await sql.end({ timeout: 5 });
  }

  // Now run the normal migrations against the freshly reset schema.
  const result = spawnSync(
    process.platform === "win32" ? "bun.exe" : "bun",
    ["run", "db:migrate"],
    { stdio: "inherit", env: process.env },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

