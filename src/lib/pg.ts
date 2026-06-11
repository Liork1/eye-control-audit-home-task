import { Client } from "pg";
import { pgSslOption } from "./pg-ssl";

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
  const connectionString = getDatabaseUrl();
  const client = new Client({
    connectionString,
    ssl: pgSslOption(connectionString),
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
