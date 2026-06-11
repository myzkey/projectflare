# Architecture

ProjectFlare follows a Clean Architecture style adapted for Cloudflare Workers.

## Layers

```txt
src/
  index.ts                         # composition root
  domain/                          # enterprise rules and pure helpers
  application/usecases/            # use cases, depends on ports
  ports/                           # interfaces for persistence, queue, notification
  infrastructure/cloudflare/       # Cloudflare bindings and environment types
  presentation/http/               # Worker HTTP/queue adapter
  presentation/ui/                 # fallback HTML rendering target
frontend/                          # Vite + React client app
```

## Dependency Direction

```txt
presentation -> application -> domain
application -> ports
infrastructure -> ports
```

Domain and application code must not depend on `Request`, `Response`, D1, R2, Queues, Wrangler, or Cloudflare-specific bindings.

The React client is built by Vite into `dist/client` and served through the Worker assets binding. API routes remain under `/api/*`.

## Extracted Slices

Generic Webhook intake:

```txt
presentation/http/worker.ts
  -> application/usecases/handle-generic-webhook.ts
    -> domain/task.ts
    -> domain/webhook.ts
    -> ports/generic-webhook.ts
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
presentation/http/worker.ts
  -> application/usecases/manage-tasks.ts
    -> domain/task.ts
    -> ports/tasks.ts
      <- infrastructure/cloudflare/d1/task-repository.ts
```

GitHub webhook processing:

```txt
presentation/http/worker.ts
  -> application/usecases/process-github-webhook.ts
    -> domain/github.ts
    -> ports/github-sync.ts
      <- infrastructure/cloudflare/d1/github-sync-adapter.ts
```

## Refactoring Rule

When adding or changing behavior:

- Put pure business rules in `domain/`.
- Put orchestration in `application/usecases/`.
- Define required IO as `ports/`.
- Implement Cloudflare-specific IO at the edge adapter boundary.
- Keep `src/index.ts` as a thin composition root.
- Keep HTTP handlers responsible only for request parsing, response formatting, and adapter wiring.

## Next Extraction Targets

- Wiki page create/update use cases
- Notification delivery use case
- Project repositories backed by D1
