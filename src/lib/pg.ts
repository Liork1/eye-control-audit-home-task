import { Client } from "pg";

export class PgConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PgConfigError";
  }
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new PgConfigError("Missing required environment variable: DATABASE_URL");
  }
  return url;
}

/** Run a callback with a short-lived direct Postgres connection. */
export async function withPgClient<T>(
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
