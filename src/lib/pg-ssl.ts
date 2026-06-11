import type { ConnectionConfig } from "pg";

export function pgSslOption(
  connectionString: string
): ConnectionConfig["ssl"] {
  if (
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("sslmode=disable")
  ) {
    return false;
  }
  return { rejectUnauthorized: false };
}
