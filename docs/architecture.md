# Architecture

ProjectFlare follows a Clean Architecture style adapted for Cloudflare Workers.

## Layers

```txt
apps/
  web/                             # Vite + React admin client
packages/
  admin/                           # shared admin API client, UI types, locale catalogs
  core/                            # domain, application use cases, ports
  cloudflare/                      # Worker entrypoint, D1/R2/Queue adapters, HTTP presentation
  plugin-api/                      # definePlugin API and plugin author surface
  plugins/                         # first-party plugins
```

## Dependency Direction

```txt
apps/web -> /api/*
apps/web -> packages/admin
packages/cloudflare -> packages/core
packages/cloudflare -> packages/plugin-api
packages/cloudflare -> packages/plugins
packages/core/application -> packages/core/domain
packages/core/application -> packages/core/ports
packages/cloudflare/infrastructure -> packages/core/ports
```

Domain and application code must not depend on `Request`, `Response`, D1, R2, Queues, Wrangler, or Cloudflare-specific bindings.

The React client is built by Vite into `dist/client` and served through the Worker assets binding. API routes remain under `/api/*`.

This is intentionally a small pnpm workspace inspired by EmDash's package-oriented layout: core behavior is portable, while Cloudflare-specific code sits in a dedicated adapter package.

ProjectFlare borrows EmDash's strongest architectural ideas for its project-management domain:

- first-party plugins are authored through `definePlugin()` in `packages/plugin-api`
- plugin manifests declare capabilities, hooks, routes, settings, and storage before installation
- future third-party execution can swap the host runtime for Cloudflare Dynamic Worker isolation
- agent/MCP tools are described in core with explicit required capabilities

## Extracted Slices

Generic Webhook intake:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/handle-generic-webhook.ts
    -> packages/core/src/domain/task.ts
    -> packages/core/src/domain/webhook.ts
    -> packages/core/src/ports/generic-webhook.ts
```

The Worker adapter builds the port implementation using Cloudflare D1, Queues, and notification delivery. The use case owns the business flow:

- resolve endpoint or legacy project URL
- verify token if endpoint exists
- apply mapping
- create task
- record webhook event
- enqueue or create notification

Task management:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-tasks.ts
    -> packages/core/src/domain/task.ts
    -> packages/core/src/ports/tasks.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/task-repository.ts
```

Task collaboration:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-task-collaboration.ts
    -> packages/core/src/domain/task-collaboration.ts
    -> packages/core/src/ports/task-collaboration.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/task-collaboration-repository.ts
```

Project management:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-projects.ts
    -> packages/core/src/domain/project.ts
    -> packages/core/src/ports/projects.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/project-repository.ts
```

Wiki management:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-wiki.ts
    -> packages/core/src/domain/wiki.ts
    -> packages/core/src/ports/wiki.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/wiki-repository.ts
```

Attachments:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-attachments.ts
    -> packages/core/src/domain/attachment.ts
    -> packages/core/src/ports/attachments.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/attachment-repository.ts
      <- Cloudflare R2 FILES binding
```

Attachment use cases validate image and lightweight video uploads and keep ownership rules in core. D1 stores metadata and R2 stores object content.

GitHub webhook processing:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/process-github-webhook.ts
    -> packages/core/src/domain/github.ts
    -> packages/core/src/ports/github-sync.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/github-sync-adapter.ts
```

GitHub repository management:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-github-repositories.ts
    -> packages/core/src/domain/github.ts
    -> packages/core/src/ports/github-repositories.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/github-repository.ts
```

Webhook endpoint management:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-webhook-endpoints.ts
    -> packages/core/src/domain/webhook.ts
    -> packages/core/src/ports/webhook-endpoints.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/webhook-endpoint-repository.ts
```

Notifications:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/manage-notifications.ts
    -> packages/core/src/domain/notification.ts
    -> packages/core/src/ports/notifications.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/notification-repository.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/notifications/delivery.ts
```

Slack, generic webhook, and Lark-compatible outbound delivery are provider-shaped infrastructure concerns. Core use cases create app notifications and request delivery through ports, without knowing about `fetch` or Slack block payloads.

Cloudflare Access user bootstrap and local demo data also live outside the Worker handler:

```txt
packages/cloudflare/src/infrastructure/cloudflare/identity/access-user.ts
packages/cloudflare/src/presentation/http/demo-data.ts
```

Plugin runtime:

```txt
packages/plugins/src/*
  -> packages/plugin-api/src/definePlugin
packages/cloudflare/src/infrastructure/cloudflare/plugins/builtin.ts
  -> packages/core/src/domain/plugin.ts
  -> packages/core/src/ports/plugins.ts
```

MCP / agent schema:

```txt
packages/core/src/mcp-api/schema.ts
```

The MCP descriptors intentionally live in core because they are a product contract, not an implementation detail of the Cloudflare Worker.

React admin UI:

```txt
apps/web/src/App.tsx          # data loading, route/tab state, event wiring
apps/web/src/views.tsx        # Overview, Plan, Wiki, Integrations, Plugins
apps/web/src/MarkdownEditor.tsx # Lexical editor that imports/exports Markdown
apps/web/src/components.tsx   # shared presentational primitives
packages/admin/src/*          # API client, DTO types, locale catalogs
```

API responses are camelCase at the HTTP boundary. The admin client adapts them back into the current UI model while the D1 adapters keep snake_case close to SQL.

The editor UI uses Lexical for rich editing, Markdown shortcuts, history, links, lists, quotes, headings, and code blocks. Persistence stays Markdown-first so D1 records and webhook/API payloads remain portable text.

## Refactoring Rule

When adding or changing behavior:

- Put pure business rules in `packages/core/src/domain/`.
- Put orchestration in `packages/core/src/application/usecases/`.
- Define required IO as `packages/core/src/ports/`.
- Implement Cloudflare-specific IO in `packages/cloudflare/src/infrastructure/`.
- Keep `packages/cloudflare/src/index.ts` as a thin composition root.
- Keep HTTP handlers responsible only for request parsing, response formatting, and adapter wiring.

## Next Extraction Targets

- Optional: split `apps/web/src/views.tsx` into per-tab files once each view grows further
- Optional: move remaining GitHub event lookup and webhook signature receipt details behind smaller ports
