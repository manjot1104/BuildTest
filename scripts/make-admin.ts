import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const { user } = schema;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function makeAdmin(email: string) {
  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true, roles: true },
  });

  if (!existing) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (existing.roles.includes("admin")) {
    console.log(`${email} is already an admin`);
    process.exit(0);
  }

  await db
    .update(user)
    .set({
      roles: sql`array_append(${user.roles}, 'admin'::user_role)`,
    })
    .where(eq(user.email, email));

  console.log(`${email} has been promoted to admin`);
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: bun run scripts/make-admin.ts <email>");
  process.exit(1);
}

makeAdmin(email).then(() => process.exit(0));
