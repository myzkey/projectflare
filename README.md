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

## Documentation

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## GitHub Sync

- Link a GitHub repository to a ProjectFlare project
- Receive GitHub webhooks at `/api/github/webhook`
- Verify `X-Hub-Signature-256` when `GITHUB_WEBHOOK_SECRET` is configured
- Queue GitHub webhook processing through Cloudflare Queues
- Sync GitHub issues into tasks
- Sync GitHub issue comments into task comments
- Update linked tasks from pull request events when the PR body contains GitHub issue URLs

For local development, the GitHub webhook secret is optional. In production, set `GITHUB_WEBHOOK_SECRET` as a Worker secret.

## Webhooks And Notifications

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

## Deployment

ProjectFlare is deployed with Wrangler and the Cloudflare resources declared in `wrangler.toml`. The default OSS flow does not require Terraform or a setup shell script.

See [Deployment](./docs/deployment.md) for D1, R2, Queues, Access, secrets, migrations, and deploy commands.

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

## Non-Goals

The early ProjectFlare scope deliberately avoids becoming a full Jira, Linear, Notion, or Redmine clone. The priority is a lightweight Cloudflare-only base that connects tasks, GitHub, wiki notes, gantt planning, and webhook intake with a low-operations footprint.
