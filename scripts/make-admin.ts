import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { user } from "../src/server/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function makeAdmin(email: string) {
  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email));

  console.log(`${email} is now admin ✅`);
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email");
  process.exit(1);
}

makeAdmin(email).then(() => process.exit());
