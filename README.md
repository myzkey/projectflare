# ProjectFlare

Cloudflare-native project management for small teams.

[日本語README](./README.ja.md)

ProjectFlare is a lightweight project OS designed to run on Cloudflare Workers, D1, R2, Queues, and Zero Trust. It is meant for teams that want tasks, gantt planning, wiki notes, GitHub/webhook intake, and eventually MCP access without operating a VPS, Docker host, PostgreSQL, Redis, Nginx, or certificates.

## MVP Surface

- Cloudflare Worker serving both API and the first app screen
- D1 schema for workspaces, projects, tasks, comments, wiki, webhooks, GitHub integration records, attachments, and audit logs
- Cloudflare Access-aware user bootstrap from request headers
- Task list, status summary, and simple gantt timeline
- Wiki page listing
- Generic webhook endpoint that can create tasks from JSON
- Queue producer hook for webhook/GitHub-style async processing

## Local Setup

```sh
pnpm install
pnpm db:migrate:local
pnpm dev
```

Then open the URL printed by Wrangler.

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
