import postgres from "postgres";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    // WARNING: This deletes ALL tables/views/functions in the public schema.
    // Also deletes Drizzle's internal migrations table.
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;

    // Recreate public schema so the DB is usable afterwards.
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    await sql`GRANT ALL ON SCHEMA public TO CURRENT_USER`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

