# agent.md

## Project Goal

Build a multi-tenant Audit Log Service and Viewer.

The solution must include:

* Backend implemented with Next.js API Routes.
* Supabase as the database.
* React frontend (Next.js App Router is preferred).
* PostgreSQL schema hosted in Supabase.
* JWT-based authentication.
* Multi-tenant isolation enforced both in:

  * Backend authorization layer.
  * Supabase Row Level Security (RLS).
* Integration tests proving tenant isolation.
* End-to-end documentation.

---

# Working Agreement

## Mandatory Planning Phase

Before writing any code:

1. Create a file:

```text
/docs/plan.md
```

2. The plan must include:

* Architecture overview
* Database design
* Authentication flow
* Authorization model
* API design
* Frontend design
* Testing strategy
* Execution phases

3. Stop after creating the plan.

4. Request explicit approval before continuing.

---

## Approval Workflow

Every implementation phase must follow this process:

### Step 1

Describe:

* What will be implemented
* Which files will be created
* Which files will be modified

### Step 2

Wait for approval.

No code generation before approval.

### Step 3

Implement the approved step.

### Step 4

Run and document tests.

Tests are mandatory for every phase.

### Step 5

Provide:

* Summary of changes
* Test results
* Known limitations (if any)

### Step 6

Request approval before moving to the next phase.

---

# Technical Requirements

## Stack

### Frontend

* React
* TypeScript
* Next.js

### Backend

* Next.js API Routes
* TypeScript

### Database

* Supabase PostgreSQL

### Testing

Recommended:

* Vitest or Jest
* Supertest
* Playwright (optional)

---

# Environment Variables

The project must use:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

from the local `.env` file.

Never hardcode credentials.

---

# Database Schema

Create:

```sql
audit_log(
    id uuid primary key,
    tenant_id text not null,
    user_id text not null,
    action text not null,
    resource text,
    payload jsonb,
    created_at timestamptz default now()
)
```

Additional tables may be created if required.

---

# Authentication

## JWT Bootstrap Endpoint

When the application loads:

The URL will contain:

```text
?tenant_id=...
&user_id=...
```

The frontend must call a backend endpoint.

Example:

```http
POST /api/auth/bootstrap
```

Body:

```json
{
  "tenant_id": "tenant-a",
  "user_id": "user-1"
}
```

Response:

```json
{
  "token": "<jwt>"
}
```

---

## MVP Authentication Behavior

For MVP purposes:

* User is automatically approved.
* No password required.
* A JWT is generated immediately.

JWT requirements:

* TTL: 24 hours
* Contains:

  * tenant_id
  * user_id

Example claims:

```json
{
  "tenant_id": "tenant-a",
  "user_id": "user-1"
}
```

---

## Token Lifecycle

Create a token tracking table.

Suggested fields:

```sql
issued_tokens(
    id uuid primary key,
    token_jti text unique,
    tenant_id text,
    user_id text,
    status text,
    expires_at timestamptz,
    created_at timestamptz
)
```

Behavior:

* New token status = ACTIVE
* After expiration:

  * Token becomes EXPIRED
* Tokens must be logically deleted only.
* Never physically delete expired tokens.

---

# Multi-Tenant Security

Tenant isolation is the most important requirement.

The authenticated user's tenant must always come from:

```text
JWT claims
```

Never from:

* query parameters
* headers
* request body

The following must be ignored for authorization:

```text
tenant_id query parameter
tenant_id header
tenant_id request body
```

Authorization source:

```text
JWT only
```

---

# Supabase Row Level Security

RLS is mandatory.

Create policies ensuring:

```text
tenant A
cannot read
tenant B rows
```

and vice versa.

The implementation must support:

```text
auth.jwt() -> tenant_id
```

or an equivalent secure mechanism.

Document the chosen approach.

---

# API Requirements

## POST /api/audit

### Authentication

Requires JWT.

### Behavior

Extract:

* tenant_id
* user_id

from JWT claims.

Insert:

```json
{
  "tenant_id": "...",
  "user_id": "...",
  "action": "...",
  "resource": "...",
  "payload": {}
}
```

into audit_log.

### Example Request

```json
{
  "action": "PATIENT_VIEWED",
  "resource": "patient/123",
  "payload": {}
}
```

---

## GET /api/audit

### Authentication

Requires JWT.

### Filters

Supported filters:

```text
action
resource
from
to
```

### Security

Returned rows must only belong to the authenticated tenant.

Tenant filtering must be derived exclusively from JWT claims.

---

# Seed Data

Seed at least:

```text
14+
```

rows.

Across:

```text
tenant-a
tenant-b
tenant-c
```

Include a variety of:

* actions
* resources
* timestamps

---

# Frontend Requirements

Create a single page.

Features:

### Audit Table

Columns:

* Timestamp
* User
* Action
* Resource

### Filters

Minimum:

* Action filter
* Date range filter

### Authentication Flow

1. Read:

```text
tenant_id
user_id
```

from URL.

2. Request bootstrap JWT.

3. Store token in memory.

4. Use token for API calls.

5. Load audit entries.

---

# Testing Requirements

## Mandatory Integration Test

Must prove:

```text
tenant-a
cannot access
tenant-b
data
```

The test must include bypass attempts.

### Query Manipulation

Example:

```http
GET /api/audit?tenant_id=tenant-b
```

Expected:

Only tenant-a records returned.

### Header Injection

Example:

```http
X-Tenant-Id: tenant-b
```

Expected:

Only tenant-a records returned.

### Body Manipulation

Example:

```json
{
  "tenant_id": "tenant-b"
}
```

Expected:

Ignored.

````

---

## RLS Tests

Required:

### Positive Test

Tenant A can read Tenant A rows.

### Negative Test

Tenant A cannot read Tenant B rows.

---

## Additional Tests

Use engineering judgment.

Suggested:

- JWT validation
- Audit creation
- Date filtering
- Action filtering

---

# Documentation

The final phase must create comprehensive documentation under:

```text
/Docs
````

Suggested structure:

```text
/docs
├── plan.md
├── architecture.md
├── authentication.md
├── database.md
├── api.md
├── testing.md
├── deployment.md
└── e2e-walkthrough.md
```

Documentation must allow a reviewer to:

1. Run the project.
2. Understand the architecture.
3. Verify tenant isolation.
4. Execute tests.

---

# README Requirements

The project must start in under 5 minutes.

Provide:

```bash
npm install
npm run dev
```

or

```bash
docker compose up
```

Include:

* Environment setup
* Seeding instructions
* Running tests
* Viewing frontend
* API examples

---

# Success Criteria

The implementation is complete only when:

* JWT authentication works.
* Tenant isolation exists in backend authorization.
* Tenant isolation exists in Supabase RLS.
* Seed data exists across 3 tenants.
* Frontend displays audit logs.
* Filters work.
* Integration security tests pass.
* RLS tests pass.
* Documentation is complete.
* README allows startup within 5 minutes.
