"use client";

import type { AuditFilters as AuditFiltersState } from "@/types/audit";

interface AuditFiltersProps {
  filters: AuditFiltersState;
  actions: string[];
  onChange: (filters: AuditFiltersState) => void;
}

export function AuditFilters({
  filters,
  actions,
  onChange,
}: AuditFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">Action</span>
        <select
          className="min-w-[180px] rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={filters.action}
          onChange={(event) =>
            onChange({ ...filters, action: event.target.value })
          }
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">From</span>
        <input
          type="date"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={filters.from}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">To</span>
        <input
          type="date"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={filters.to}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value })
          }
        />
      </label>
    </div>
  );
}
