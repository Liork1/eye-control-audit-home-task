import "./load-env";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "pg";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is required to apply migrations.\n" +
        "Add it to .env from Supabase Dashboard → Project Settings → Database → Connection string (URI).\n" +
        `Alternatively, run the SQL manually from: ${MIGRATIONS_DIR}`
    );
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No migration files found in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
