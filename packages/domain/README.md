# @teamteamteam/domain

Pure business logic for Teamteamteam. This package is the **single source of truth** for all domain rules, entities, commands, and invariants.

**No I/O allowed.** This package must never import HTTP clients, database drivers, Supabase, Ink, Commander, `fs`, or environment variables.

## Entities

| Entity | Description |
|--------|-------------|
| `Org` | Organization (id, name) |
| `User` | User (id, email, display_name) |
| `Membership` | Org membership with role (owner, admin, member) |
| `Project` | Project within an org (id, org_id, name, prefix) |
| `WorkflowColumn` | Kanban column (id, project_id, name, position) |
| `Ticket` | Kanban ticket (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id, tags, timestamps) |
| `Tag` | Project-scoped tag (id, project_id, name) |
| `ActivityEvent` | Append-only event log entry (discriminated union of 8 event types) |

All entities have Zod schemas for validation (e.g., `TicketSchema`, `OrgSchema`).

## Commands

All mutations go through command functions. Each command validates inputs, enforces invariants, and returns a `CommandResult<T>` containing the next state and activity events.

| Command | Function | Description |
|---------|----------|-------------|
| Create ticket | `createTicket(input, columns)` | Creates ticket in initial column, generates key |
| Update ticket | `updateTicket(ticket, input)` | Updates title and description |
| Move ticket | `moveTicket(ticket, input, columns)` | Changes status column |
| Assign ticket | `assignTicket(ticket, input)` | Changes assignee (or unassigns) |
| Close ticket | `closeTicket(ticket, input)` | Sets closed_at timestamp |
| Reopen ticket | `reopenTicket(ticket, input, columns)` | Clears closed_at, moves to column |
| Add tag | `addTag(ticket, input)` | Adds normalized tag to ticket |
| Remove tag | `removeTag(ticket, input)` | Removes tag from ticket |

### CommandResult

```typescript
interface CommandResult<T> {
  readonly data: T;           // Next state of the entity
  readonly events: readonly NewActivityEvent[];  // Activity events to persist
}
```

## Rules

### Ticket Keys

```typescript
generateTicketKey(prefix: string, number: number): string
// "PROJ" + 1 → "PROJ-1"

parseTicketKey(key: string): { prefix: string; number: number } | null
// "PROJ-1" → { prefix: "PROJ", number: 1 }
```

Keys are deterministic: same prefix + number always produces the same key.

### Tag Normalization

```typescript
normalizeTag(tag: string): string
// " Bug " → "bug" (trim + lowercase)

normalizeTags(tags: string[]): string[]
// Normalizes all, removes duplicates and empty strings
```

All tag operations use normalized comparison.

### Column Ordering

```typescript
sortColumns(columns: WorkflowColumn[]): WorkflowColumn[]
// Sorts by position ascending

getInitialColumn(columns: WorkflowColumn[]): WorkflowColumn
// Returns the column with the lowest position
```

### Filtering & Sorting

```typescript
filterTickets(tickets: Ticket[], filters: TicketFilters): Ticket[]
// Filters by status_column_id, assignee_id, tag, and/or search text

sortTickets(tickets: Ticket[]): Ticket[]
// Sorts by updated_at descending (most recent first)
```

## Error Types

All domain errors use `DomainError` with typed error codes:

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Missing/invalid field (empty title, no columns) |
| `COLUMN_NOT_FOUND` | Target column doesn't exist in project |
| `TICKET_ALREADY_CLOSED` | Attempting to close an already-closed ticket |
| `TICKET_NOT_CLOSED` | Attempting to reopen a ticket that isn't closed |
| `TAG_ALREADY_EXISTS` | Tag already present on ticket |
| `TAG_NOT_FOUND` | Tag not found on ticket |
| `SAME_COLUMN` | Moving ticket to its current column |
| `SAME_ASSIGNEE` | Assigning ticket to its current assignee |

## Activity Event Types

Every command produces one or more `NewActivityEvent` records:

| Event Type | Produced By | Payload |
|------------|-------------|---------|
| `ticket_created` | `createTicket` | (empty) |
| `status_changed` | `moveTicket` | from_column_id, to_column_id |
| `assignee_changed` | `assignTicket` | from_assignee_id, to_assignee_id |
| `ticket_updated` | `updateTicket` | from_title, to_title, description_changed |
| `ticket_closed` | `closeTicket` | (empty) |
| `ticket_reopened` | `reopenTicket` | to_column_id |
| `tag_added` | `addTag` | tag |
| `tag_removed` | `removeTag` | tag |
