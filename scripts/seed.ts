import "./load-env";
import { createServiceRoleClient } from "../src/lib/supabase";
import { SEED_ROWS } from "./seed-data";

async function main(): Promise<void> {
  const supabase = createServiceRoleClient();

  const { count, error: countError } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(
      `audit_log table is not available (${countError.message}). Run npm run db:migrate first.`
    );
  }

  if ((count ?? 0) >= SEED_ROWS.length) {
    console.log(`Seed skipped: audit_log already has ${count} rows.`);
    return;
  }

  const { error: deleteError } = await supabase
    .from("audit_log")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    throw new Error(`Failed to clear audit_log: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from("audit_log")
    .insert(SEED_ROWS);

  if (insertError) {
    throw new Error(`Failed to seed audit_log: ${insertError.message}`);
  }

  console.log(`Seeded ${SEED_ROWS.length} audit_log rows.`);
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
