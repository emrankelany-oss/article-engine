# Bridge Server API Reference

> **Version:** 4.7.0 | **Base URL:** `http://127.0.0.1:19847` | **Auth:** Supabase JWT Bearer token

The bridge server is a lightweight local HTTP server that gates section editing behind Supabase authentication and routes edit requests to the Claude CLI.

## Quick Start

```bash
# Start the bridge server
node bridge/server.js

# Or with a custom port
BRIDGE_PORT=8080 node bridge/server.js

# Or targeting a specific project directory
node bridge/server.js /path/to/project
```

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via `POST /auth/login` and verified via `GET /auth/verify`.

### Auth Flow

```
1. POST /auth/signup        → Account created (pending approval)
2. Admin approves via POST /admin/approve
3. POST /auth/login         → Returns access_token
4. Use token in Authorization header for all subsequent requests
```

### Role Model

| Role | Access |
|------|--------|
| `user` (pending) | Auth endpoints only |
| `user` (active) | Auth + edit endpoint |
| `admin` (active) | Auth + edit + all admin endpoints |

---

## Endpoints

### Health Check

#### `GET /health`

No authentication required.

**Response:**
```json
{
  "status": "ok",
  "busy": false,
  "activeEdits": 0,
  "authEnabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` |
| `busy` | boolean | `true` if any edit is currently in progress |
| `activeEdits` | number | Count of concurrent per-article edits in progress |
| `authEnabled` | boolean | `true` if Supabase config is loaded |

---

### Auth Endpoints

#### `POST /auth/signup`

Create a new user account. The account starts in `pending` status until an admin approves it.

**Rate limit:** 10 requests per minute per email/IP.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Required, valid email |
| `password` | string | Required, minimum 8 characters |

**Success response (200):**
```json
{
  "status": "success",
  "message": "Account created! Your access is pending admin approval.",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing email or password | `{ "status": "error", "error": "Email and password are required." }` |
| 400 | Password too short | `{ "status": "error", "error": "Password must be at least 8 characters." }` |
| 429 | Rate limited | `{ "status": "error", "error": "Too many attempts. Please wait a minute." }` |

---

#### `POST /auth/login`

Authenticate and receive an access token.

**Rate limit:** 10 requests per minute per email/IP.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success response (200):**
```json
{
  "status": "success",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "uuid", "email": "user@example.com" },
  "subscription": { "plan": "free", "status": "active", "role": "user" }
}
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing fields | `{ "status": "error", "error": "Email and password are required." }` |
| 401 | Bad credentials | `{ "status": "error", "error": "Invalid email or password." }` |
| 429 | Rate limited | `{ "status": "error", "error": "Too many attempts. Please wait a minute." }` |

---

#### `POST /auth/logout`

Invalidate the current session token on Supabase.

**Rate limit:** 10 requests per minute per IP.

**Headers:** `Authorization: Bearer <token>`

**Success response (200):**
```json
{ "status": "success", "message": "Logged out successfully." }
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No token | `{ "status": "error", "error": "No token provided." }` |
| 429 | Rate limited | `{ "status": "error", "error": "Too many attempts. Please wait a minute." }` |
| 500 | Supabase error | `{ "status": "error", "error": "Logout failed: ..." }` |

---

#### `GET /auth/verify`

Verify a token and return the user's subscription status.

**Headers:** `Authorization: Bearer <token>`

**Success response (200):**
```json
{
  "status": "ok",
  "user": { "id": "uuid", "email": "user@example.com" },
  "subscription": { "plan": "free", "status": "active" }
}
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No token | `{ "status": "error", "error": "No token provided." }` |
| 401 | Invalid/expired token | `{ "status": "error", "error": "Invalid or expired token." }` |

---

### Admin Endpoints

All admin endpoints require a Bearer token from a user with `role: "admin"` and `status: "active"`. Admin privilege is checked server-side using the service role key (never trusting the user's own token for privilege checks).

#### `GET /admin/users`

List all users and their subscriptions.

**Success response (200):**
```json
{
  "status": "ok",
  "users": [
    { "id": "uuid", "email": "user@example.com", "created_at": "..." }
  ],
  "subscriptions": [
    { "user_id": "uuid", "plan": "free", "status": "active", "role": "user" }
  ]
}
```

---

#### `POST /admin/approve`

Activate a pending user's subscription.

**Request body:**
```json
{ "user_id": "550e8400-e29b-41d4-a716-446655440000" }
```

| Field | Type | Rules |
|-------|------|-------|
| `user_id` | string | Required, valid UUID format |

**Success response (200):**
```json
{ "status": "success", "message": "User approved." }
```

---

#### `POST /admin/revoke`

Revoke a user's access (set status back to pending).

**Request body:**
```json
{ "user_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Success response (200):**
```json
{ "status": "success", "message": "User access revoked." }
```

---

#### `POST /admin/delete`

Delete a user and their subscription permanently.

**Request body:**
```json
{ "user_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Success response (200):**
```json
{ "status": "success", "message": "User deleted." }
```

---

#### `POST /admin/add-user`

Create a new user with auto-activation (skips the approval flow).

**Request body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Required |
| `password` | string | Required, minimum 8 characters |

**Success response (200):**
```json
{
  "status": "success",
  "message": "User created and activated.",
  "user": { "id": "uuid", "email": "newuser@example.com" }
}
```

---

#### `GET /admin/usage`

Get the 50 most recent usage log entries.

**Success response (200):**
```json
{
  "status": "ok",
  "logs": [
    { "user_id": "uuid", "action": "edit", "article_file": null, "created_at": "..." }
  ]
}
```

---

### Notification Endpoints

#### `GET /notifications`

Get all notifications (admin only). Returns up to 50 most recent notifications.

**Headers:** `Authorization: Bearer <admin_token>`

**Success response (200):**
```json
{
  "notifications": [
    { "ts": "2026-03-26T...", "type": "user:signup", "message": "New user registered: user@example.com", "read": false },
    { "ts": "2026-03-26T...", "type": "edit:success", "message": "Edit completed for /path/to/article.html", "read": true }
  ]
}
```

**Notification types:** `user:signup`, `edit:success`, `edit:failed`

---

#### `POST /notifications/mark-read`

Mark all notifications as read (admin only).

**Headers:** `Authorization: Bearer <admin_token>`

**Success response (200):**
```json
{ "status": "success" }
```

---

### Edit Endpoint

#### `POST /apply-edit`

Submit a section edit request. Requires an active subscription. Per-article locking allows concurrent edits to different articles but blocks concurrent edits to the same file.

**Headers:** `Authorization: Bearer <token>`

**Request body:**
```json
{
  "prompt": "SECTION_EDIT:\nArticle file: articles/my-article.html\nSection ID: section-intro\nUser requested change: Make the introduction more engaging"
}
```

**Prompt validation rules:**

| Rule | Error |
|------|-------|
| Must contain `SECTION_EDIT:` | 400: Invalid SECTION_EDIT prompt |
| Must contain `Article file:`, `Section ID:`, `User requested change:` | 400: Invalid edit prompt format |
| Max 8000 characters | 400: Edit prompt too long |
| Article file must be `.html` | 400: Article file must be an .html file |
| No `..` in path | 400: Path traversal not allowed |
| No absolute paths | 400: Absolute paths not allowed |
| File must exist within project dir | 400: Article file not found / must be within project directory |

**Success response (200):**
```json
{
  "status": "success",
  "output": "Section updated successfully..."
}
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Validation failure | `{ "status": "error", "error": "..." }` |
| 401 | No/invalid token | `{ "status": "error", "error": "Authentication required." }` |
| 403 | Inactive subscription | `{ "status": "error", "error": "Your account is pending approval." }` |
| 409 | Edit in progress for this article | `{ "status": "busy", "error": "An edit is already in progress for this article." }` |
| 504 | Timeout (10 min) | `{ "status": "timeout", "error": "Edit timed out after 10 minutes" }` |

---

## CORS Policy

The bridge server restricts CORS to localhost origins only:

| Origin | Allowed |
|--------|---------|
| `http://127.0.0.1:*` | Yes |
| `http://localhost:*` | Yes |
| `null` (file:// URLs) | Yes |
| All other origins | Blocked |

## Rate Limiting

| Endpoint Group | Limit | Scope |
|---------------|-------|-------|
| Auth (`/auth/signup`, `/auth/login`, `/auth/logout`) | 10 per minute | Per email or IP |
| Admin (`/admin/*`) | No limit | Auth-gated only |
| Edit (`/apply-edit`) | 1 concurrent per article | Per-file lock |

The rate limiter uses an in-memory TTL map. Expired entries are cleaned on every check. Rate limits reset on server restart.

## Error Format

All errors follow a consistent format:

```json
{
  "status": "error",
  "error": "Human-readable error message"
}
```

The 404 handler returns:
```json
{
  "error": "Not found"
}
```
