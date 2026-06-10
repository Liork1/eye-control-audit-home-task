import "./load-env";
import { GET, POST } from "@/app/api/audit/route";
import { createAuditRequest, getBootstrapToken } from "../audit/helpers";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";
const TENANTS = ["tenant-a", "tenant-b", "tenant-c"] as const;

type AuditRow = { tenant_id: string; user_id: string; action: string };

async function listAuditLogs(token: string, query = ""): Promise<AuditRow[]> {
  const response = await GET(createAuditRequest(query, token));
  expect(response.status).toBe(200);
  const body = (await response.json()) as { data: AuditRow[] };
  return body.data;
}

(RUN_DB_TESTS ? describe : describe.skip)(
  "e2e tenant isolation",
  () => {
    const tokens: Record<(typeof TENANTS)[number], string> = {
      "tenant-a": "",
      "tenant-b": "",
      "tenant-c": "",
    };

    beforeAll(async () => {
      const bootstrapped = await Promise.all(
        TENANTS.map(async (tenant) => ({
          tenant,
          token: await getBootstrapToken(tenant, "e2e-user"),
        }))
      );

      for (const { tenant, token } of bootstrapped) {
        tokens[tenant] = token;
      }
    }, 30000);

    it("bootstrap → list returns only the authenticated tenant's rows", async () => {
      for (const tenant of TENANTS) {
        const rows = await listAuditLogs(tokens[tenant]);

        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.tenant_id === tenant)).toBe(true);
        expect(
          rows.some((row) => row.tenant_id !== tenant)
        ).toBe(false);
      }
    });

    it("tenant datasets are disjoint across all three tenants", async () => {
      const rowsByTenant = Object.fromEntries(
        await Promise.all(
          TENANTS.map(async (tenant) => [
            tenant,
            await listAuditLogs(tokens[tenant]),
          ] as const)
        )
      ) as Record<(typeof TENANTS)[number], AuditRow[]>;

      for (const left of TENANTS) {
        for (const right of TENANTS) {
          if (left === right) {
            continue;
          }

          expect(
            rowsByTenant[left].some((row) => row.tenant_id === right)
          ).toBe(false);
          expect(
            rowsByTenant[right].some((row) => row.tenant_id === left)
          ).toBe(false);
        }
      }
    });

    it("tenant-a cannot read tenant-b data via ?tenant_id=tenant-b bypass", async () => {
      const rows = await listAuditLogs(
        tokens["tenant-a"],
        "?tenant_id=tenant-b"
      );

      expect(rows.every((row) => row.tenant_id === "tenant-a")).toBe(true);
      expect(rows.some((row) => row.tenant_id === "tenant-b")).toBe(false);
    });

    it("tenant-b cannot read tenant-a data via X-Tenant-Id header bypass", async () => {
      const response = await GET(
        createAuditRequest("", tokens["tenant-b"], {
          headers: { "X-Tenant-Id": "tenant-a" },
        })
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { data: AuditRow[] };

      expect(body.data.every((row) => row.tenant_id === "tenant-b")).toBe(true);
      expect(body.data.some((row) => row.tenant_id === "tenant-a")).toBe(false);
    });

    it("POST stores tenant from JWT, ignoring tenant_id in body", async () => {
      const action = `E2E_TENANT_SCOPE_${Date.now()}`;

      for (const tenant of ["tenant-a", "tenant-b"] as const) {
        const response = await POST(
          createAuditRequest("", tokens[tenant], {
            method: "POST",
            body: JSON.stringify({
              tenant_id: tenant === "tenant-a" ? "tenant-b" : "tenant-a",
              action,
              resource: `e2e/${tenant}`,
              payload: { tenant },
            }),
          })
        );

        expect(response.status).toBe(201);
        const created = (await response.json()) as AuditRow;
        expect(created.tenant_id).toBe(tenant);
      }

      for (const tenant of ["tenant-a", "tenant-b"] as const) {
        const rows = await listAuditLogs(tokens[tenant], `?action=${action}`);
        expect(rows.length).toBe(1);
        expect(rows[0].tenant_id).toBe(tenant);
      }
    });

    it("date filter does not change tenant scope", async () => {
      const rows = await listAuditLogs(
        tokens["tenant-a"],
        "?from=2025-06-01T00:00:00Z&to=2026-12-31T23:59:59Z"
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.tenant_id === "tenant-a")).toBe(true);

      const users = new Set(rows.map((row) => row.user_id));
      expect(users.size).toBeGreaterThan(1);
    });
  }
);
