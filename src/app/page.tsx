"use client";

import { useEffect, useState } from "react";
import { AuditFilters } from "@/components/AuditFilters";
import { AuditTable } from "@/components/AuditTable";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/hooks/useAuth";
import type { AuditFilters as AuditFiltersState } from "@/types/audit";

const EMPTY_FILTERS: AuditFiltersState = {
  action: "",
  from: "",
  to: "",
};

export default function Home() {
  const { token, tenantId, userId, loading: authLoading, error: authError } =
    useAuth();
  const [filters, setFilters] = useState<AuditFiltersState>(EMPTY_FILTERS);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const { logs, loading: logsLoading, error: logsError } = useAuditLogs(
    token,
    filters
  );

  useEffect(() => {
    if (logs.length === 0) {
      return;
    }

    setAvailableActions((current) => {
      const merged = new Set([
        ...current,
        ...logs.map((log) => log.action),
      ]);
      return [...merged].sort();
    });
  }, [logs]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-600">Authenticating...</p>
      </main>
    );
  }

  if (!tenantId || !userId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Audit Log Viewer</h1>
        <p className="mt-4 text-gray-600">
          Open with query params:{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
            ?tenant_id=tenant-a&amp;user_id=user-1
          </code>
        </p>
      </main>
    );
  }

  if (authError || !token) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Audit Log Viewer</h1>
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {authError ?? "Authentication failed"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Audit Log Viewer</h1>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">{tenantId}</span>
          {" / "}
          <span className="font-medium text-gray-800">{userId}</span>
        </p>
      </div>

      <div className="space-y-4">
        <AuditFilters
          filters={filters}
          actions={availableActions}
          onChange={setFilters}
        />

        {logsError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {logsError}
          </p>
        )}

        <AuditTable logs={logs} loading={logsLoading} />
      </div>
    </main>
  );
}
