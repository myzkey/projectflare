# Development

This document collects contributor-facing setup, local development, quality checks, and commit rules. The README stays focused on what ProjectFlare does.

## Requirements

- Node.js is managed with asdf. The expected version is defined in `.tool-versions`.
- pnpm is the package manager.
- Wrangler is used for local Worker development, D1 migrations, and deployment.

## Local Setup

Install the configured Node.js version and project dependencies:

```sh
asdf install
pnpm install
```

Apply local D1 migrations, then start the Worker:

```sh
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` builds the React app with Vite, then starts Wrangler. Open the URL printed by Wrangler.

For UI-only iteration, run the Vite dev server:

```sh
pnpm dev:ui
```

The language choice in the admin UI is stored in `localStorage` as `projectflare.locale`.

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

## Code Organization

- Worker entrypoint and HTTP routing live under `packages/cloudflare`.
- Core use cases and ports are kept separate from Cloudflare adapters where practical.
- The React admin UI lives under `apps/web`.
- D1 schema changes live under `migrations`.

See [Architecture](./architecture.md) for the current clean architecture direction.
