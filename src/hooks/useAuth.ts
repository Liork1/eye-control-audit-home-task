"use client";

import { useEffect, useState } from "react";

interface AuthState {
  token: string | null;
  tenantId: string | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenant = params.get("tenant_id");
    const user = params.get("user_id");

    setTenantId(tenant);
    setUserId(user);

    if (!tenant || !user) {
      setLoading(false);
      setError("Missing tenant_id or user_id in URL");
      return;
    }

    async function bootstrap(): Promise<void> {
      try {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenant, user_id: user }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Bootstrap failed");
        }

        const body = (await response.json()) as { token: string };
        setToken(body.token);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bootstrap failed");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  return { token, tenantId, userId, loading, error };
}
