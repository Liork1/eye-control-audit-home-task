export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditFilters {
  action: string;
  from: string;
  to: string;
}
