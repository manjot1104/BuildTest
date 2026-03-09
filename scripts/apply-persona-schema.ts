/**
 * One-time script: create or patch the persona_layouts table.
 * Safe to run multiple times (idempotent).
 */
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')

  const sql = postgres(url, { max: 1 })

  try {
    const [{ exists }] = await sql<[{ exists: string | null }]>`
      SELECT to_regclass('public."pg-drizzle_persona_layouts"') AS exists
    `

    if (!exists) {
      console.log('Creating pg-drizzle_persona_layouts table...')
      await sql`
        CREATE TABLE "pg-drizzle_persona_layouts" (
          "id"           text PRIMARY KEY NOT NULL,
          "user_id"      text NOT NULL,
          "slug"         text UNIQUE,
          "title"        text NOT NULL DEFAULT 'My Persona',
          "layout"       text NOT NULL DEFAULT '[]',
          "background"   text,
          "is_published" boolean NOT NULL DEFAULT false,
          "published_at" timestamp with time zone,
          "created_at"   timestamp with time zone NOT NULL,
          "updated_at"   timestamp with time zone NOT NULL
        )
      `
      await sql`
        ALTER TABLE "pg-drizzle_persona_layouts"
          ADD CONSTRAINT "pg-drizzle_persona_layouts_user_id_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade
      `
      await sql`CREATE INDEX "persona_layouts_user_id_idx" ON "pg-drizzle_persona_layouts" ("user_id")`
      await sql`CREATE INDEX "persona_layouts_slug_idx"    ON "pg-drizzle_persona_layouts" ("slug")`
      console.log('Table created.')
    } else {
      console.log('Table already exists — checking columns...')

      // Ensure background column exists
      const bgCols = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pg-drizzle_persona_layouts' AND column_name = 'background'
      `
      if (bgCols.length === 0) {
        await sql`ALTER TABLE "pg-drizzle_persona_layouts" ADD COLUMN "background" text`
        console.log('Added background column.')
      } else {
        console.log('background column already exists.')
      }

      // Ensure slug is nullable
      const [slugRow] = await sql<[{ is_nullable: string }]>`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'pg-drizzle_persona_layouts' AND column_name = 'slug'
      `
      if (slugRow?.is_nullable === 'NO') {
        await sql`ALTER TABLE "pg-drizzle_persona_layouts" ALTER COLUMN "slug" DROP NOT NULL`
        console.log('Made slug nullable.')
      } else {
        console.log('slug is already nullable.')
      }
    }

    console.log('Schema up to date.')
  } finally {
    await sql.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
