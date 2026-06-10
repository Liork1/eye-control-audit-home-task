import "./load-env";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "pg";

const MIGRATION_FILE = resolve(
  process.cwd(),
  "supabase/migrations/001_initial_schema.sql"
);

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is required to apply migrations.\n" +
        "Add it to .env from Supabase Dashboard → Project Settings → Database → Connection string (URI).\n" +
        `Alternatively, run the SQL manually: ${MIGRATION_FILE}`
    );
    process.exit(1);
  }

  const sql = readFileSync(MIGRATION_FILE, "utf8");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
