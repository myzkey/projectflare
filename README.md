# ProjectFlare

Cloudflare-native project management for small teams.

[日本語README](./README.ja.md)

ProjectFlare is a lightweight project OS designed to run on Cloudflare Workers, D1, R2, Queues, and Zero Trust. It is meant for teams that want tasks, gantt planning, wiki notes, GitHub/webhook intake, and eventually MCP access without operating a VPS, Docker host, PostgreSQL, Redis, Nginx, or certificates.

## MVP Surface

- Cloudflare Worker serving both API and the first app screen
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

## Phase 1 API

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
- `GET /api/projects/:projectId/github/events`
- `POST /api/github/webhook`
- `GET /api/projects/:projectId/webhook-endpoints`
- `POST /api/projects/:projectId/webhook-endpoints`
- `GET /api/projects/:projectId/notification-channels`
- `POST /api/projects/:projectId/notification-channels`
- `GET /api/projects/:projectId/notifications`
- `PATCH /api/notifications/:notificationId`

## Phase 2 Surface

- Add task dependencies and show them in the gantt area
- Create and edit Markdown wiki pages
- Preview Markdown while editing
- Store a wiki revision every time a page is created or updated
- List wiki revisions for the selected page

## Phase 3 Surface

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

## Phase 4 Surface

- Create tokenized generic webhook endpoints per project
- Accept `Authorization: Bearer <token>` or `X-ProjectFlare-Token`
- Apply simple endpoint mapping for `source` and default priority
- Store app notifications for webhook tasks, comments, GitHub issue/comment/PR events
- Add outgoing notification channels for generic webhook, Slack, or Lark-compatible URLs
- Send a compact JSON notification payload to configured channels

Generic webhook endpoints created in the UI return the token once. Store it in the external system that will send tasks into ProjectFlare.

## Local Setup

```sh
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` builds the React app with Vite, then starts Wrangler. Open the URL printed by Wrangler.

For UI-only iteration, run the Vite dev server:

```sh
pnpm dev:ui
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

- Phase 1: Workers API, D1 schema, Access user bootstrap, workspace/project/task/comment UI
- Phase 2: Gantt dependencies, markdown wiki editing, wiki revisions
- Phase 3: GitHub App, issue/PR sync, webhook signature verification, queue consumers
- Phase 4: Generic webhook mapping, tokens, Slack/Lark/app notifications
- Phase 5: MCP server with project/task/wiki read and task creation tools
- Phase 6: Backlog sync exploration
