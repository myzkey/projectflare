# ProjectFlare

Cloudflare-native project management for small teams.

[日本語README](./README.ja.md)

ProjectFlare is a lightweight project OS designed to run on Cloudflare Workers, D1, R2, Queues, and Zero Trust. It is meant for teams that want tasks, gantt planning, wiki notes, GitHub/webhook intake, multilingual admin screens, and eventually MCP access without operating a VPS, Docker host, PostgreSQL, Redis, Nginx, or certificates.

ProjectFlare is not trying to replace Jira, Linear, Notion, Redmine, or OpenProject in one jump. The goal is a small, Cloudflare-native operations layer that makes project work visible to engineers, non-engineers, webhooks, GitHub, and AI agents.

## Positioning

- GitHub: implementation tracking
- ProjectFlare: project tracking and delivery status
- Wiki: specs, background, decisions, and runbooks
- Gantt: schedule and dependency visibility
- Webhooks: intake from external systems
- MCP: future AI-agent operation surface

## Current Surface

- Cloudflare Worker serving API and the React admin UI
- D1 schema for workspaces, projects, tasks, comments, wiki, webhooks, GitHub integration records, attachments, and audit logs
- Cloudflare Access-aware user bootstrap from request headers
- Workspace and project creation
- Task creation, status/priority/progress updates, status summary, and simple gantt timeline
- Task dependency capture for gantt planning
- Task comments
- Markdown wiki page listing, editing, preview, and revision history
- GitHub repository linking, webhook intake, issue/comment/PR sync, and queue processing
- Tokenized generic webhook endpoints, app notifications, and outgoing Slack/Lark/webhook notification channels
- Generic webhook endpoint that can create tasks from JSON
- Queue producer hook for webhook/GitHub-style async processing
- React/Vite admin UI with a dense project command-center layout
- Frontend localization for `ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN`, and `zh-TW`
- RTL document direction for Arabic and Persian
- EmDash-inspired plugin foundation with manifests, capabilities, lifecycle/task hooks, plugin routes, and plugin-scoped KV/event tables
- Biome linting/formatting, Vitest coverage, TypeScript type checking, and Conventional Commits

## Architecture

ProjectFlare follows a Clean Architecture direction in a small pnpm workspace:

```txt
apps/web                 React admin UI
packages/admin          shared admin API client, UI types, and locale catalogs
packages/core           domain models, use cases, and ports
packages/cloudflare     Worker entrypoint, HTTP presentation, D1 adapters, Cloudflare bindings
packages/plugin-api     definePlugin API for first-party and future third-party plugins
packages/plugins        first-party plugins
migrations              consolidated D1 initial schema and seed data
test                    unit and Worker/API tests
```

The intended dependency direction is:

```txt
apps/web -> HTTP API
packages/cloudflare -> packages/core
packages/cloudflare -> packages/plugin-api + packages/plugins
apps/web -> packages/admin
packages/core -> no Cloudflare runtime dependency
```

Core business rules live in `packages/core`. Cloudflare-specific code, D1 SQL, queue integration, and request/response handling live in `packages/cloudflare`. The React app talks to ProjectFlare through the HTTP API and keeps UI concerns out of the domain package.

## Plugin Architecture

ProjectFlare has a first plugin foundation inspired by EmDash:

- `definePlugin()` wraps plugin descriptors and optional route/hook handlers
- `PluginDescriptor` declares id, version, entrypoint, capabilities, hooks, routes, settings schema, and storage collections
- capabilities are approved at install time and stored with the workspace installation
- lifecycle hooks are available for `plugin:install`, `plugin:activate`, and `plugin:deactivate`
- task hooks can react to `task:created`
- plugin routes are invoked through `/api/workspaces/:workspaceId/plugins/:pluginId/routes/:routeName`
- plugin data is scoped through D1 tables for installed plugins, plugin KV, and plugin events

Current first-party plugins live in `packages/plugins` and run through a host runtime adapter. The Clean Architecture port is intentionally shaped so a future Cloudflare Dynamic Worker runner can replace the in-process runtime for third-party plugins, matching the EmDash security direction of isolated execution and explicit permissions.

## MCP / Agent Surface

ProjectFlare exposes the first MCP tool schema descriptors under `packages/core/src/mcp-api`. The current descriptors cover project listing, task listing/creation, and notification sending with explicit required capabilities. This keeps agent access aligned with the same capability model used by plugins.

## Implemented API

- `GET /api/me`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId/projects`
- `POST /api/workspaces/:workspaceId/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `GET /api/projects/:projectId/dependencies`
- `GET /api/projects/:projectId/wiki`
- `POST /api/projects/:projectId/wiki`
- `PATCH /api/tasks/:taskId`
- `GET /api/tasks/:taskId/dependencies`
- `POST /api/tasks/:taskId/dependencies`
- `GET /api/tasks/:taskId/comments`
- `POST /api/tasks/:taskId/comments`
- `GET /api/wiki/:pageId`
- `PATCH /api/wiki/:pageId`
- `GET /api/wiki/:pageId/revisions`
- `GET /api/workspaces/:workspaceId/github/repositories`
- `POST /api/workspaces/:workspaceId/github/repositories`
- `GET /api/plugins/catalog`
- `GET /api/workspaces/:workspaceId/plugins`
- `POST /api/workspaces/:workspaceId/plugins`
- `PATCH /api/workspaces/:workspaceId/plugins/:pluginId`
- `POST /api/workspaces/:workspaceId/plugins/:pluginId/routes/:routeName`
- `GET /api/projects/:projectId/github/events`
- `POST /api/github/webhook`
- `GET /api/projects/:projectId/webhook-endpoints`
- `POST /api/projects/:projectId/webhook-endpoints`
- `GET /api/projects/:projectId/notification-channels`
- `POST /api/projects/:projectId/notification-channels`
- `GET /api/projects/:projectId/notifications`
- `PATCH /api/notifications/:notificationId`

## Phase 1: Workspaces, Projects, Tasks, Comments

- Bootstrap the current user from Cloudflare Access headers
- Create and list workspaces and projects
- Create tasks with status, priority, assignee, dates, progress, source, labels, and external URL fields
- Update task status, priority, progress, dates, and metadata
- Add and list task comments
- Render a scan-friendly overview with status metrics and a task table

## Phase 2: Planning And Wiki

- Add task dependencies and show them in the gantt area
- Create and edit Markdown wiki pages
- Preview Markdown while editing
- Store a wiki revision every time a page is created or updated
- List wiki revisions for the selected page

## Phase 3: GitHub Sync

- Link a GitHub repository to a ProjectFlare project
- Receive GitHub webhooks at `/api/github/webhook`
- Verify `X-Hub-Signature-256` when `GITHUB_WEBHOOK_SECRET` is configured
- Queue GitHub webhook processing through Cloudflare Queues
- Sync GitHub issues into tasks
- Sync GitHub issue comments into task comments
- Update linked tasks from pull request events when the PR body contains GitHub issue URLs

For local development, the GitHub webhook secret is optional. In production, set `GITHUB_WEBHOOK_SECRET` as a Worker secret:

```sh
wrangler secret put GITHUB_WEBHOOK_SECRET
```

## Phase 4: Webhooks And Notifications

- Create tokenized generic webhook endpoints per project
- Accept `Authorization: Bearer <token>` or `X-ProjectFlare-Token`
- Apply simple endpoint mapping for `source` and default priority
- Store app notifications for webhook tasks, comments, GitHub issue/comment/PR events
- Add outgoing notification channels for generic webhook, Slack, or Lark-compatible URLs
- Send Slack Incoming Webhook block payloads or compact JSON payloads to configured channels

Generic webhook endpoints created in the UI return the token once. Store it in the external system that will send tasks into ProjectFlare.

## Frontend

The admin UI is a React/Vite app under `apps/web`. It includes:

- Project switcher, summary metrics, task table, and comment panel
- Gantt-style planning view with dependency labels
- Markdown wiki editor, preview, page list, and revision list
- Integration view for GitHub events, generic webhook endpoints, notification channels, and app notifications
- Language picker covering the currently supported 18 locales

The language choice is stored in `localStorage` as `projectflare.locale`.

## Local Setup

ProjectFlare uses asdf for Node.js version management.

```sh
asdf install
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` builds the React app with Vite, then starts Wrangler. Open the URL printed by Wrangler.

For UI-only iteration, run the Vite dev server:

```sh
pnpm dev:ui
```

## Quality Checks

Run the full local gate before pushing:

```sh
pnpm check
pnpm build
pnpm test:e2e
```

Useful individual commands:

```sh
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
```

## Commit Messages

ProjectFlare uses Conventional Commits. Commit messages are checked by commitlint through Husky.

Examples:

```txt
feat: add workspace invitations
fix: handle missing webhook endpoint
refactor: extract task use cases
test: cover github webhook processing
```

## Cloudflare Setup

1. Create a D1 database:

```sh
wrangler d1 create projectflare
```

2. Copy the generated `database_id` into `wrangler.toml`.
3. Create an R2 bucket:

```sh
wrangler r2 bucket create projectflare-files
```

4. Create the queue:

```sh
wrangler queues create projectflare-events
```

5. Apply migrations and deploy:

```sh
pnpm db:migrate
pnpm deploy
```

6. Put the Worker behind Cloudflare Access. ProjectFlare reads `CF-Access-Authenticated-User-Email`, `CF-Access-Authenticated-User-Name`, and `Cf-Access-Groups` when present.

## Generic Webhook

POST JSON to:

```txt
/api/webhooks/generic/:projectId
```

Example:

```json
{
  "title": "Investigate failed checkout",
  "description": "Stripe dispute from customer report",
  "source": "stripe",
  "priority": "urgent",
  "dueDate": "2026-06-18",
  "assignee": "ops@example.com",
  "labels": ["support", "billing"],
  "externalUrl": "https://example.com/cases/123"
}
```

## Roadmap

- Phase 1: Workers API, D1 schema, Access user bootstrap, workspace/project/task/comment UI - implemented
- Phase 2: Gantt dependencies, markdown wiki editing, wiki revisions - implemented
- Phase 3: GitHub repository linking, issue/comment/PR sync, webhook signature verification, queue processing - implemented
- Phase 4: Generic webhook mapping, tokens, Slack/Lark/app notifications - implemented
- Phase 5: MCP server with project/task/wiki read and task creation tools
- Phase 6: Backlog sync exploration

## Non-Goals

The early ProjectFlare scope deliberately avoids becoming a full Jira, Linear, Notion, or Redmine clone. The priority is a lightweight Cloudflare-only base that connects tasks, GitHub, wiki notes, gantt planning, and webhook intake with a low-operations footprint.
