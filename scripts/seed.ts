import "./load-env";
import { withPgClient } from "../src/lib/pg";
import { SEED_ROWS } from "./seed-data";

async function main(): Promise<void> {
  await withPgClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM audit_log"
    );
    const count = parseInt(countResult.rows[0]?.count ?? "0", 10);

    if (count >= SEED_ROWS.length) {
      console.log(`Seed skipped: audit_log already has ${count} rows.`);
      return;
    }

    await client.query("DELETE FROM audit_log");

    for (const row of SEED_ROWS) {
      await client.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, resource, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row.tenant_id,
          row.user_id,
          row.action,
          row.resource ?? null,
          JSON.stringify(row.payload ?? {}),
          row.created_at,
        ]
      );
    }

    console.log(`Seeded ${SEED_ROWS.length} audit_log rows.`);
  });
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
