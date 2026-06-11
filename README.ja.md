# ProjectFlare

Cloudflareだけで動く、軽量プロジェクト管理OSS。

ProjectFlare は、Cloudflare Workers、D1、R2、Queues、Zero Trust を前提にした小規模チーム向けの軽量なプロジェクトOSです。VPS、Docker、PostgreSQL、Redis、Nginx、SSL証明書の運用を避けながら、タスク管理、ガントチャート、Wiki、GitHub/Webhook連携、将来的なMCPアクセスをまとめて扱うことを目指します。

## MVPでできること

- Cloudflare Worker で API と最初のアプリ画面を配信
- D1 schema によるワークスペース、プロジェクト、タスク、コメント、Wiki、Webhook、GitHub連携、添付、監査ログの土台
- Cloudflare Access のヘッダーを使ったユーザー自動作成
- ワークスペースとプロジェクト作成
- タスク作成、ステータス/優先度/進捗率の更新、ステータス集計、簡易ガントタイムライン
- ガント計画向けのタスク依存関係
- タスクコメント
- Markdown Wikiページ一覧、編集、プレビュー、更新履歴
- GitHub Repository連携、Webhook受信、Issue/コメント/PR同期、Queue処理
- トークン付きGeneric Webhook endpoint、アプリ内通知、Slack/Lark/Webhook通知チャンネル
- JSONからタスクを作成できる Generic Webhook
- Webhook/GitHub連携の非同期処理に向けた Queue producer

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

## Phase 2でできること

- タスク依存関係を追加し、ガント領域に表示
- Markdown Wikiページの作成と編集
- 編集中Markdownのプレビュー
- Wikiページ作成/更新ごとのrevision保存
- 選択中Wikiページのrevision一覧表示

## Phase 3でできること

- GitHub RepositoryをProjectFlareプロジェクトへ紐づけ
- `/api/github/webhook` でGitHub Webhookを受信
- `GITHUB_WEBHOOK_SECRET` 設定時に `X-Hub-Signature-256` を検証
- Cloudflare Queues 経由でGitHub Webhookを非同期処理
- GitHub Issueをタスクへ同期
- GitHub Issue Commentをタスクコメントへ同期
- PR本文にGitHub Issue URLが含まれる場合、PRイベントから関連タスクの状態を更新

ローカル開発ではGitHub Webhook secretは任意です。本番ではWorker secretとして設定してください。

```sh
wrangler secret put GITHUB_WEBHOOK_SECRET
```

## Phase 4でできること

- プロジェクトごとのトークン付きGeneric Webhook endpoint作成
- `Authorization: Bearer <token>` または `X-ProjectFlare-Token` による受信認証
- endpoint単位で `source` とデフォルト優先度の簡易mapping
- Webhookタスク、コメント、GitHub Issue/Comment/PRイベントからアプリ内通知を保存
- Slack/Lark互換URLまたは汎用Webhook URLへの通知チャンネル追加
- 設定済みチャンネルへ短いJSON通知payloadを送信

UIで作成したGeneric Webhook tokenは一度だけ表示されます。外部サービス側に保存して利用してください。

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
