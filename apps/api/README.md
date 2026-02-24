# @teamteamteam/api

HTTP API for Teamteamteam, built with [Hono](https://hono.dev/). Runs on Bun for local development and deploys as a Supabase Edge Function.

## Authentication

All endpoints except `/health` require a valid Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

RLS policies enforce org-level data isolation automatically.

For reliable member invites by email (including users not yet in the org), set `SUPABASE_SERVICE_ROLE_KEY` for the API runtime so server-side user lookup can bypass org-scoped user visibility.

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Validation failed |
| `DOMAIN_ERROR` | 409 | Business rule violation (e.g., ticket already closed) |
| `DB_ERROR` | 500 | Database error |

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |

### Organizations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/orgs` | Yes | List user's organizations |
| `POST` | `/orgs` | Yes | Create organization |
| `DELETE` | `/orgs/:orgId` | Yes | Delete organization (owner only) |

### Members

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/orgs/:orgId/members` | Yes | List org members |
| `POST` | `/orgs/:orgId/members` | Yes | Invite member by email (roles: admin/member/limited; auto-provisions via OTP if new) |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/orgs/:orgId/projects` | Yes | List projects in org |
| `POST` | `/orgs/:orgId/projects` | Yes | Create project (+ default columns) |
| `DELETE` | `/orgs/:orgId/projects/:projectId` | Yes | Delete project (owner/admin) |

### Workflow Columns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:projectId/columns` | Yes | List workflow columns |

### Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:projectId/tickets` | Yes | List tickets (with filters) |
| `POST` | `/projects/:projectId/tickets` | Yes | Create ticket |
| `GET` | `/tickets/:ticketId` | Yes | Get ticket details |
| `PATCH` | `/tickets/:ticketId/move` | Yes | Move ticket to column (auto-closes in Done, auto-reopens when moved out) |
| `PATCH` | `/tickets/:ticketId/assign` | Yes | Assign/unassign ticket |
| `PATCH` | `/tickets/:ticketId/close` | Yes | Close ticket |
| `PATCH` | `/tickets/:ticketId/reopen` | Yes | Reopen ticket |
| `DELETE` | `/tickets/:ticketId` | Yes | Delete ticket |

### Tags

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:projectId/tags` | Yes | List project tags |
| `POST` | `/tickets/:ticketId/tags` | Yes | Add tag to ticket |
| `DELETE` | `/tickets/:ticketId/tags/:tag` | Yes | Remove tag from ticket |

### Activity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/tickets/:ticketId/activity` | Yes | Get ticket activity log |

## Query Parameters

`GET /projects/:projectId/tickets` supports:

| Param | Type | Description |
|-------|------|-------------|
| `status_column_id` | UUID | Filter by workflow column |
| `assignee_id` | UUID or `"null"` | Filter by assignee (use `"null"` for unassigned) |
| `tag` | string | Filter by tag name (applied client-side) |
| `search` | string | Text search in title/description (applied client-side) |

## Deployment

The API deploys as a Supabase Edge Function. See the root [README.md](../../README.md) for deployment instructions.

The Edge Function adapter normalizes both `/orgs/...` and `/api/orgs/...` runtime path shapes before handing requests to Hono. This prevents route/CORS mismatches when proxied through `functions/v1/api`.

For local development:

```sh
doppler run -- bun run --filter @teamteamteam/api dev
```

Runs on `http://localhost:3001` by default (configurable via `PORT` env var).
