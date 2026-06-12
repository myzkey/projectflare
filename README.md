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

## Features

- Manage workspaces and projects from a Cloudflare-hosted admin UI
- Create tasks with status, priority, assignee, category, tags, milestone, dates, progress, and parent task
- Manage project-specific task statuses with color, order, and done/archive semantics
- Track nested tasks, dependencies, status metrics, kanban-style boards, and a simple gantt-style planning view
- Add latest-first task comments with bounded loading and expandable long text
- Write task descriptions, task comments, and wiki pages with a Markdown-backed rich editor
- Upload images and lightweight videos to tasks and wiki pages
- Insert uploaded media into comments or wiki pages as Markdown
- Paste or drop image/video files directly into comment and wiki editors to upload and insert them
- Create and edit Markdown wiki pages with revision history
- Link GitHub repositories and receive issue, comment, and pull request webhook events
- Create tokenized generic webhook endpoints that turn external JSON into tasks
- Send app notifications and outgoing Slack, Lark, or generic webhook notifications
- Install first-party plugins with declared capabilities, hooks, routes, and plugin-scoped storage
- Use the admin UI in 18 locales: `ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN`, and `zh-TW`
- Use RTL layout for Arabic and Persian

## More Documentation

- [Architecture](./docs/architecture.md)

## Phase 1: Workspaces, Projects, Tasks, Comments

- Bootstrap the current user from Cloudflare Access headers
- Create and list workspaces and projects
- Create tasks with status, priority, assignee, dates, progress, source, labels, and external URL fields
- Update task status, priority, progress, dates, and metadata
- Add and list latest-first task comments with bounded loading and per-comment truncation
- Upload image or lightweight video attachments to tasks
- Insert task attachment Markdown into comments
- Paste or drop task comment media directly into the editor
- Render a scan-friendly overview with status metrics and a task table

## Phase 2: Planning And Wiki

- Add task dependencies and show them in the gantt area
- Create and edit Markdown wiki pages with a Lexical rich editor
- Keep Markdown as the persisted wiki format
- Store a wiki revision every time a page is created or updated
- List wiki revisions for the selected page
- Upload wiki media and copy Markdown snippets
- Insert wiki media snippets into the editor body
- Paste or drop wiki media directly into the editor body

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
- Lexical-powered Markdown editor for task descriptions, comments, and wiki pages
- Wiki page list, media attachments, and revision list
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

ProjectFlare follows the same Wrangler-first deployment shape as EmDash. Cloudflare resources are declared in `wrangler.toml`, and the app is built and deployed through `pnpm deploy`. A setup shell script or Terraform module is intentionally not required for the default OSS flow.

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

`wrangler.toml` remains the source of truth for Worker bindings. Use Cloudflare dashboard or Wrangler CLI for one-time account resources such as D1, R2, Queues, Access, and secrets.

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
