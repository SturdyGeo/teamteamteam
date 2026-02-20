agents.md — Candoo
Propose all plans before editing!
I use doppler for secret management. If a command is not working, you might need doppler run -- in front of it
Before finishing run the following and fix errors until it's all good

doppler run -- bun run typecheck

doppler run -- bun run lint

doppler run -- bun run build

doppler run -- bun run test

doppler run -- bun run knip

Project Overview

Candoo is a terminal-first, multi-user kanban platform built for software teams. It provides a CLI and TUI experience backed by Supabase authentication and Postgres persistence.

The system is designed to evolve into a full web application without rewriting core logic.

Key Principle: The domain layer is the single source of truth. CLI, TUI, and future web UI must all use the same domain logic and API client. Rendering and UI state are always derived, never persisted.

IMPORTANT: Update all relevant .md documentation files when making changes.

IMPORTANT: Keep README.md updated with current usage, features, CLI commands, TUI shortcuts, setup steps, and architecture. When adding or changing user-facing functionality, the README must be updated to reflect those changes.

Stack
Runtime & Language

TypeScript across entire monorepo

Bun as runtime and package manager

pnpm acceptable alternative if needed

CLI & TUI

Commander for CLI commands

Ink (React for terminal) for TUI board

Chalk for color output

No direct DB access from UI layer

Backend

Supabase

Auth (magic link)

Postgres

Row Level Security

Optional thin HTTP API (recommended for future web UI)

Validation & Types

zod for runtime validation

Shared types in packages/domain

All API contracts defined in one place

Architecture Principles
1. Single Source of Truth

All business rules live in:

packages/domain


Includes:

Ticket state transitions

Workflow rules

Assignment rules

Tag logic

Priority rules

Activity generation

Validation schemas

UI layers may not implement business rules independently.

If two places need the same logic, move it to packages/domain.

2. Layered Architecture
Domain Layer (packages/domain/)

Pure logic

No HTTP

No Supabase

No Ink

No Commander

No filesystem

No environment variables

Contains:

Entities

Commands

State transitions

Invariants

Schemas

Application Layer (apps/api/ or Supabase Edge Functions)

Auth validation

Persistence

Query filtering

Permission checks

Activity persistence

Orchestration only. No rendering.

Client Layer
CLI (apps/cli/)

Commander-based commands

Delegates to API client

Outputs formatted text or JSON

TUI (apps/cli/tui/)

Ink components

Purely derived UI

Never mutates state directly

All state changes via commands

3. Ticket State Model

Tickets are canonical domain entities.

Fields:

id

project_id

number (per-project increment)

title

description (markdown)

status_column_id

priority (P0–P3)

assignee_id (nullable)

reporter_id

created_at

updated_at

closed_at (nullable)

Workflow columns are data, not enums.

No hardcoded statuses.

4. Command-Based Mutations

All mutations occur through domain commands:

createTicket

moveTicket

assignTicket

setPriority

addTag

removeTag

closeTicket

reopenTicket

Commands:

Validate inputs

Enforce invariants

Return next state + activity events

Views must never mutate ticket objects directly.

5. Activity Log

Every mutation produces activity events:

Examples:

ticket_created

status_changed

assignee_changed

priority_changed

tag_added

tag_removed

Activity is append-only.

UI derives history from activity records.

6. Deterministic Behavior

The following must always be deterministic:

Ticket key generation

Workflow ordering

Sorting rules

Filtering logic

Priority precedence

Same input → same output.

No hidden UI state affecting domain behavior.

7. TUI Architecture

The TUI is a derived representation of:

tickets + workflow + filters

Board Rules

Columns render in defined order

Tickets sorted by priority → updated_at

Filters are client-side

Refresh manually (r) in MVP

Interaction Rules

No direct mutation

All keyboard actions dispatch commands

On success → refresh state

On failure → display error

8. Authentication

Supabase magic link

CLI stores session securely

Access token required for all API calls

RLS enforces org isolation

CLI must never embed service role keys.

9. Multi-Tenancy

All data scoped by org_id

Users belong to orgs via membership table

RLS enforces access

CLI must never bypass org scope.

10. Extensibility

Architecture must support:

Web UI

Git integration

Slack integration

Plugins

Saved views

Custom workflows

Notifications

Without rewriting domain logic.

Domain rules must not depend on CLI implementation details.

11. Repository Structure
candoo/
├─ apps/
│  ├─ cli/
│  │  ├─ commands/
│  │  ├─ tui/
│  │  └─ index.ts
│  └─ api/ (optional thin server)
├─ packages/
│  ├─ domain/
│  │  ├─ entities/
│  │  ├─ commands/
│  │  ├─ schemas/
│  │  └─ rules/
│  └─ api-client/
├─ infra/
└─ dist/

DRY Guarantees

The following must exist in exactly one place:

Ticket key generation logic

State transition rules

Priority comparison logic

Tag normalization

Filtering logic

Activity event schema

If duplicated, refactor.

Non-Goals (MVP)

Realtime updates

Complex sprint planning

Story points

Dependencies

Notifications

Attachments

Multiple org switching UI

Development Commands
Development
bun run dev


⚠️ AI assistants should NEVER automatically run dev servers.

Testing
bun run test
bun run test:watch
bun run test:coverage


Test files:

**/__tests__/**/*.test.ts

Build
bun run build

Type Checking & Linting
bun run typecheck
bun run lint

Cleanup
bun run clean

Important Reminders

Never duplicate domain logic.

All mutations must go through commands.

CLI and TUI must use the same API client.

Never hardcode workflow columns.

No direct DB access from UI layer.

Domain must not import CLI, TUI, or Supabase.

RLS is mandatory.

Ticket keys must be deterministic.

Activity log is append-only.

No dev servers auto-started by assistants.

Always use Doppler when required.