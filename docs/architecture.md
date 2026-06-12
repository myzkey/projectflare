# Architecture

ProjectFlare follows a Clean Architecture style adapted for Cloudflare Workers.

## Layers

```txt
apps/
  web/                             # Vite + React admin client
packages/
  core/                            # domain, application use cases, ports
  cloudflare/                      # Worker entrypoint, D1/R2/Queue adapters, HTTP presentation
```

## Dependency Direction

```txt
apps/web -> /api/*
packages/cloudflare -> packages/core
packages/core/application -> packages/core/domain
packages/core/application -> packages/core/ports
packages/cloudflare/infrastructure -> packages/core/ports
```

Domain and application code must not depend on `Request`, `Response`, D1, R2, Queues, Wrangler, or Cloudflare-specific bindings.

The React client is built by Vite into `dist/client` and served through the Worker assets binding. API routes remain under `/api/*`.

This is intentionally a small pnpm workspace inspired by EmDash's package-oriented layout: core behavior is portable, while Cloudflare-specific code sits in a dedicated adapter package.

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

GitHub webhook processing:

```txt
packages/cloudflare/src/presentation/http/worker.ts
  -> packages/core/src/application/usecases/process-github-webhook.ts
    -> packages/core/src/domain/github.ts
    -> packages/core/src/ports/github-sync.ts
      <- packages/cloudflare/src/infrastructure/cloudflare/d1/github-sync-adapter.ts
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

## Refactoring Rule

When adding or changing behavior:

- Put pure business rules in `packages/core/src/domain/`.
- Put orchestration in `packages/core/src/application/usecases/`.
- Define required IO as `packages/core/src/ports/`.
- Implement Cloudflare-specific IO in `packages/cloudflare/src/infrastructure/`.
- Keep `packages/cloudflare/src/index.ts` as a thin composition root.
- Keep HTTP handlers responsible only for request parsing, response formatting, and adapter wiring.

## Next Extraction Targets

- Wiki page create/update use cases
- Project repositories backed by D1
- Task comment and dependency use cases
