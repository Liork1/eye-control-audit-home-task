# API Reference

All protected endpoints require a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Base URL (local): `http://localhost:3000`

---

## POST /api/auth/bootstrap

Issues a JWT for the given tenant and user. **No authentication required.**

### Request

```http
POST /api/auth/bootstrap
Content-Type: application/json

{
  "tenant_id": "tenant-a",
  "user_id": "user-1"
}
```

### Response `200`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Errors

| Status | Condition |
|--------|-----------|
| `400` | Missing `tenant_id` or `user_id`, or invalid JSON |

---

## POST /api/audit

Creates an audit log entry for the authenticated tenant.

`tenant_id` and `user_id` are taken from the JWT — any `tenant_id` in the request body is **ignored**.

### Request

```http
POST /api/audit
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "PATIENT_VIEWED",
  "resource": "patient/123",
  "payload": { "source": "dashboard" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `action` | Yes | Action identifier |
| `resource` | No | Resource path or identifier |
| `payload` | No | JSON object (defaults to `{}`) |

### Response `201`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "tenant-a",
  "user_id": "user-1",
  "action": "PATIENT_VIEWED",
  "resource": "patient/123",
  "payload": { "source": "dashboard" },
  "created_at": "2026-06-10T12:00:00.000Z"
}
```

### Errors

| Status | Condition |
|--------|-----------|
| `401` | Missing, invalid, or expired token |
| `400` | Missing `action` or invalid JSON |

### Example (curl)

```bash
TOKEN="<jwt from bootstrap>"

curl -X POST http://localhost:3000/api/audit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"PATIENT_VIEWED","resource":"patient/123"}'
```

---

## GET /api/audit

Lists audit log entries for the authenticated tenant only.

Query parameters for `tenant_id` are **ignored** — filtering always uses JWT claims.

### Request

```http
GET /api/audit?action=PATIENT_VIEWED&from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
Authorization: Bearer <token>
```

| Query param | Description |
|-------------|-------------|
| `action` | Filter by exact action name |
| `resource` | Filter by exact resource |
| `from` | Minimum `created_at` (ISO 8601) |
| `to` | Maximum `created_at` (ISO 8601) |

### Response `200`

```json
{
  "data": [
    {
      "id": "...",
      "tenant_id": "tenant-a",
      "user_id": "user-1",
      "action": "PATIENT_VIEWED",
      "resource": "patient/123",
      "payload": {},
      "created_at": "2026-06-10T12:00:00.000Z"
    }
  ]
}
```

Results are ordered by `created_at` descending.

### Errors

| Status | Condition |
|--------|-----------|
| `401` | Missing, invalid, or expired token |

### Example (curl)

```bash
curl "http://localhost:3000/api/audit?action=LOGIN" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Tenant Isolation Guarantees

The API enforces tenant isolation regardless of client manipulation:

| Attack vector | Behavior |
|---------------|----------|
| `GET /api/audit?tenant_id=tenant-b` | Returns only authenticated tenant's rows |
| `X-Tenant-Id: tenant-b` header | Ignored |
| `POST` body with `"tenant_id": "tenant-b"` | Ignored; JWT tenant used |

Integration tests in `tests/audit/tenant-isolation.test.ts` verify all three bypass attempts.

## Related Docs

- [Authentication](authentication.md)
- [E2E Walkthrough](e2e-walkthrough.md)
- [Testing](testing.md)
