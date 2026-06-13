# Deployment

ProjectFlare follows a Wrangler-first deployment shape. Cloudflare resource bindings are declared in `wrangler.toml`, and the app is built and deployed through `pnpm deploy`.

The default OSS flow intentionally does not require Terraform or a setup shell script. Use the Cloudflare dashboard or Wrangler CLI for one-time account resources such as D1, R2, Queues, Access, and secrets.

## Cloudflare Resources

Create a D1 database:

```sh
wrangler d1 create projectflare
```

Copy the generated `database_id` into `wrangler.toml`.

Create an R2 bucket:

```sh
wrangler r2 bucket create projectflare-files
```

Create the queue:

```sh
wrangler queues create projectflare-events
```

## Secrets

For GitHub webhook verification in production, set `GITHUB_WEBHOOK_SECRET` as a Worker secret:

```sh
wrangler secret put GITHUB_WEBHOOK_SECRET
```

Local development can omit this secret.

## Migrate And Deploy

Apply remote D1 migrations and deploy:

```sh
pnpm db:migrate
pnpm deploy
```

## Cloudflare Access

Put the Worker behind Cloudflare Access for authenticated use.

ProjectFlare reads these headers when present:

- `CF-Access-Authenticated-User-Email`
- `CF-Access-Authenticated-User-Name`
- `Cf-Access-Groups`

Those values are used to bootstrap and identify internal users.
