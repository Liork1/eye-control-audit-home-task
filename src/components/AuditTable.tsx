"use client";

import type { AuditLogEntry } from "@/types/audit";

interface AuditTableProps {
  logs: AuditLogEntry[];
  loading: boolean;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function AuditTable({ logs, loading }: AuditTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
        Loading audit logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
        No audit logs match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Timestamp
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              User
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Action
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Resource
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                {formatTimestamp(log.created_at)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                {log.user_id}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                {log.action}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {log.resource ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
