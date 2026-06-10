# ProjectFlare

Cloudflareだけで動く、軽量プロジェクト管理OSS。

ProjectFlare は、Cloudflare Workers、D1、R2、Queues、Zero Trust を前提にした小規模チーム向けの軽量なプロジェクトOSです。VPS、Docker、PostgreSQL、Redis、Nginx、SSL証明書の運用を避けながら、タスク管理、ガントチャート、Wiki、GitHub/Webhook連携、将来的なMCPアクセスをまとめて扱うことを目指します。

## MVPでできること

- Cloudflare Worker で API と最初のアプリ画面を配信
- D1 schema によるワークスペース、プロジェクト、タスク、コメント、Wiki、Webhook、GitHub連携、添付、監査ログの土台
- Cloudflare Access のヘッダーを使ったユーザー自動作成
- タスク一覧、ステータス集計、簡易ガントタイムライン
- Wikiページ一覧
- JSONからタスクを作成できる Generic Webhook
- Webhook/GitHub連携の非同期処理に向けた Queue producer

## ローカルセットアップ

このリポジトリでは asdf で Node.js を管理します。

```sh
asdf install
pnpm install
pnpm db:migrate:local
pnpm dev
```

Wrangler が表示するローカルURLを開くと、ProjectFlareの初期画面を確認できます。

## Cloudflareへのセットアップ

1. D1 database を作成します。

```sh
wrangler d1 create projectflare
```

2. 生成された `database_id` を `wrangler.toml` に設定します。
3. R2 bucket を作成します。

```sh
wrangler r2 bucket create projectflare-files
```

4. Queue を作成します。

```sh
wrangler queues create projectflare-events
```

5. マイグレーションを適用してデプロイします。

```sh
pnpm db:migrate
pnpm deploy
```

6. Worker を Cloudflare Access の背後に置きます。ProjectFlare は `CF-Access-Authenticated-User-Email`、`CF-Access-Authenticated-User-Name`、`Cf-Access-Groups` があれば読み取り、内部ユーザーとして扱います。

## Generic Webhook

以下にJSONをPOSTすると、指定プロジェクトにタスクを作成できます。

```txt
/api/webhooks/generic/:projectId
```

例:

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

## ロードマップ

- Phase 1: Workers API、D1 schema、Accessユーザー自動作成、ワークスペース/プロジェクト/タスク/コメントUI
- Phase 2: ガント依存関係、Markdown Wiki編集、Wiki revision
- Phase 3: GitHub App、Issue/PR同期、Webhook署名検証、Queue consumer
- Phase 4: Generic Webhook mapping、API token、Slack/Lark/アプリ内通知
- Phase 5: プロジェクト/タスク/Wikiの読み取りとタスク作成に対応したMCP server
- Phase 6: Backlog連携の検討

## 作らないもの

初期段階では、Jira、Linear、Notion、Redmineの完全代替は目指しません。ProjectFlareは、機能量よりも「Cloudflareだけで運用できる軽さ」と「GitHub、Webhook、Wiki、ガントをつなぐ補助レイヤー」であることを優先します。
