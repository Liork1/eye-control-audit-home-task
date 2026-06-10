"use client";

import { useEffect, useState } from "react";
import type { AuditFilters, AuditLogEntry } from "@/types/audit";

interface AuditLogsState {
  logs: AuditLogEntry[];
  loading: boolean;
  error: string | null;
}

function buildQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.from) {
    params.set("from", `${filters.from}T00:00:00Z`);
  }

  if (filters.to) {
    params.set("to", `${filters.to}T23:59:59Z`);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useAuditLogs(
  token: string | null,
  filters: AuditFilters
): AuditLogsState {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function fetchLogs(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audit${buildQueryString(filters)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to load audit logs");
        }

        const body = (await response.json()) as { data: AuditLogEntry[] };
        setLogs(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchLogs();
  }, [token, filters]);

  return { logs, loading, error };
}
