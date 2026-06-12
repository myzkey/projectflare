# ProjectFlare

Cloudflareだけで動く、軽量プロジェクト管理OSS。

ProjectFlare は、Cloudflare Workers、D1、R2、Queues、Zero Trust を前提にした小規模チーム向けの軽量なプロジェクトOSです。VPS、Docker、PostgreSQL、Redis、Nginx、SSL証明書の運用を避けながら、タスク管理、ガントチャート、Wiki、GitHub/Webhook連携、多言語対応の管理画面、将来的なMCPアクセスをまとめて扱うことを目指します。

Jira、Linear、Notion、Redmine、OpenProject の完全な置き換えを最初から目指すのではなく、Cloudflare だけで運用できる軽い業務管理レイヤーとして設計しています。エンジニア、非エンジニア、GitHub、外部Webhook、AIエージェントが同じプロジェクト情報を扱えることを重視します。

## 位置づけ

- GitHub: 実装管理
- ProjectFlare: プロジェクト管理と進行状況の可視化
- Wiki: 仕様、背景、意思決定、運用手順の記録
- Gantt: スケジュールと依存関係の可視化
- Webhook: 外部サービスからのタスク登録
- MCP: 将来的なAIエージェントからの操作口

## 現在できること

- Cloudflare Worker で API と React 管理画面を配信
- D1 schema によるワークスペース、プロジェクト、タスク、コメント、Wiki、Webhook、GitHub連携、添付、監査ログの土台
- Cloudflare Access のヘッダーを使ったユーザー自動作成
- ワークスペースとプロジェクト作成
- タスク作成、ステータス/優先度/進捗率の更新、ステータス集計、簡易ガントタイムライン
- ガント計画向けのタスク依存関係
- タスク説明、タスクコメント、Wikiページ向けのMarkdown保存リッチエディタ
- Markdown Wikiページ一覧、編集、プレビュー、更新履歴
- R2 object storage と D1 metadata によるタスク/Wikiの画像・軽量動画添付
- アップロード済みメディアのMarkdownをコメント/Wikiエディタへ挿入
- コメント/Wikiエディタへの画像・軽量動画のペースト/ドロップによる自動アップロードとMarkdown挿入
- GitHub Repository連携、Webhook受信、Issue/コメント/PR同期、Queue処理
- トークン付きGeneric Webhook endpoint、アプリ内通知、Slack/Lark/Webhook通知チャンネル
- JSONからタスクを作成できる Generic Webhook
- Webhook/GitHub連携の非同期処理に向けた Queue producer
- React/Vite による密度高めのプロジェクト管理UI
- `ar`、`de`、`en`、`es-419`、`es-ES`、`eu`、`fa`、`fr`、`id`、`ja`、`ko`、`nb`、`pl`、`pseudo`、`pt-BR`、`th`、`zh-CN`、`zh-TW` の18ロケール対応
- アラビア語とペルシア語のRTL表示
- EmDash を参考にした plugin foundation。manifest、capability、lifecycle/task hook、plugin route、plugin scoped KV/event table を持つ
- Biome、Vitest、TypeScript typecheck、Conventional Commits

## アーキテクチャ

ProjectFlare は Clean Architecture の方向性で、小さな pnpm workspace として構成しています。

```txt
apps/web                 React 管理画面
packages/admin          管理画面向け API client、UI type、locale catalog
packages/core           domain model、use case、port
packages/cloudflare     Worker entrypoint、HTTP presentation、D1 adapter、Cloudflare binding
packages/plugin-api     first-party / 将来の third-party plugin 向け definePlugin API
packages/plugins        first-party plugin
migrations              統合済み D1 initial schema と seed data
test                    unit test と Worker/API test
```

依存方向は以下を意識しています。

```txt
apps/web -> HTTP API
packages/cloudflare -> packages/core
packages/cloudflare -> packages/plugin-api + packages/plugins
apps/web -> packages/admin
packages/core -> Cloudflare runtime に依存しない
```

ビジネスルールは `packages/core` に置き、Cloudflare 固有の処理、D1 SQL、Queue連携、HTTP request/response は `packages/cloudflare` に分離しています。React app は HTTP API 経由で ProjectFlare を操作し、UI都合を domain package に持ち込まない方針です。

## プラグインアーキテクチャ

ProjectFlare には EmDash を参考にした最初のプラグイン基盤を入れています。

- `definePlugin()` で plugin descriptor と任意の route/hook handler を宣言
- `PluginDescriptor` で id、version、entrypoint、capability、hook、route、settings schema、storage collection を宣言
- install 時に capability を承認し、workspace ごとの installed plugin として保存
- `plugin:install`、`plugin:activate`、`plugin:deactivate` の lifecycle hook
- `task:created` に反応できる task hook
- `/api/workspaces/:workspaceId/plugins/:pluginId/routes/:routeName` で plugin route を呼び出し
- installed plugin、plugin KV、plugin event は D1 table で workspace/plugin 単位に分離

現時点では `packages/plugins` の first-party plugin を host runtime adapter で実行します。runtime は Clean Architecture の port として分離しているため、将来的には EmDash と同じ方向で Cloudflare Dynamic Workers による isolated execution と明示的な権限制御へ差し替えられる設計です。

## MCP / Agent surface

最初の MCP tool schema descriptor を `packages/core/src/mcp-api` に置いています。現時点では project list、task list/create、notification send を capability とセットで定義しています。AI agent からのアクセスも plugin と同じ capability model に揃える方針です。

## 実装済みAPI

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
- `GET /api/tasks/:taskId/attachments`
- `POST /api/tasks/:taskId/attachments`
- `GET /api/wiki/:pageId`
- `PATCH /api/wiki/:pageId`
- `GET /api/wiki/:pageId/revisions`
- `GET /api/wiki/:pageId/attachments`
- `POST /api/wiki/:pageId/attachments`
- `GET /api/attachments/:attachmentId/content`
- `GET /api/workspaces/:workspaceId/github/repositories`
- `POST /api/workspaces/:workspaceId/github/repositories`
- `GET /api/plugins/catalog`
- `GET /api/workspaces/:workspaceId/plugins`
- `POST /api/workspaces/:workspaceId/plugins`
- `PATCH /api/workspaces/:workspaceId/plugins/:pluginId`
- `POST /api/workspaces/:workspaceId/plugins/:pluginId/routes/:routeName`
- `GET /api/projects/:projectId/github/events`
- `POST /api/github/webhook`
- `GET /api/projects/:projectId/webhook-endpoints`
- `POST /api/projects/:projectId/webhook-endpoints`
- `GET /api/projects/:projectId/notification-channels`
- `POST /api/projects/:projectId/notification-channels`
- `GET /api/projects/:projectId/notifications`
- `PATCH /api/notifications/:notificationId`

## Phase 1: ワークスペース、プロジェクト、タスク、コメント

- Cloudflare Access header から現在のユーザーを自動作成
- ワークスペースとプロジェクトの作成/一覧
- ステータス、優先度、担当者、開始日、期限日、進捗率、source、label、外部URLを持つタスク作成
- タスクのステータス、優先度、進捗率、日付、メタデータ更新
- 最新順・件数制限・本文省略に対応したタスクコメントの追加/一覧
- タスクへの画像・軽量動画添付
- タスク添付のMarkdownをコメントへ挿入
- タスクコメントエディタへのメディアのペースト/ドロップ
- ステータス集計とタスク表を含む概要画面

## Phase 2: 計画とWiki

- タスク依存関係を追加し、ガント領域に表示
- Lexical リッチエディタによる Markdown Wikiページの作成と編集
- Wiki本文はMarkdown文字列として保存
- Wikiページ作成/更新ごとのrevision保存
- 選択中Wikiページのrevision一覧表示
- Wikiへのメディア添付とMarkdown snippetの利用
- Wikiメディアsnippetを本文エディタへ挿入
- Wiki本文エディタへのメディアのペースト/ドロップ

## Phase 3: GitHub同期

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

## Phase 4: Webhookと通知

- プロジェクトごとのトークン付きGeneric Webhook endpoint作成
- `Authorization: Bearer <token>` または `X-ProjectFlare-Token` による受信認証
- endpoint単位で `source` とデフォルト優先度の簡易mapping
- Webhookタスク、コメント、GitHub Issue/Comment/PRイベントからアプリ内通知を保存
- Slack/Lark互換URLまたは汎用Webhook URLへの通知チャンネル追加
- Slack Incoming Webhook向けblock payload、または汎用JSON通知payloadを設定済みチャンネルへ送信

UIで作成したGeneric Webhook tokenは一度だけ表示されます。外部サービス側に保存して利用してください。

## フロントエンド

管理画面は `apps/web` の React/Vite app です。

- プロジェクト切替、サマリー指標、タスク一覧、コメントパネル
- 依存関係ラベル付きの簡易ガント/計画ビュー
- タスク説明、コメント、Wikiページ向けの Lexical-powered Markdown editor
- Wikiページ一覧、メディア添付、revision一覧
- GitHub event、Generic Webhook endpoint、通知チャンネル、アプリ内通知を扱う連携ビュー
- 18ロケール対応の言語セレクタ

言語設定は `localStorage` の `projectflare.locale` に保存します。

## ローカルセットアップ

このリポジトリでは asdf で Node.js を管理します。

```sh
asdf install
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` は Vite で React app を build してから Wrangler を起動します。Wrangler が表示するローカルURLを開くと、ProjectFlareの初期画面を確認できます。

UI だけを素早く確認したい場合は Vite dev server を起動できます。

```sh
pnpm dev:ui
```

## 品質チェック

push 前の確認には以下を使います。

```sh
pnpm check
pnpm build
pnpm test:e2e
```

個別には以下も使えます。

```sh
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
```

## コミットメッセージ

ProjectFlare は Conventional Commits に準拠します。コミットメッセージは Husky 経由の commitlint で検証されます。

例:

```txt
feat: add workspace invitations
fix: handle missing webhook endpoint
refactor: extract task use cases
test: cover github webhook processing
```

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

- Phase 1: Workers API、D1 schema、Accessユーザー自動作成、ワークスペース/プロジェクト/タスク/コメントUI - 実装済み
- Phase 2: ガント依存関係、Markdown Wiki編集、Wiki revision - 実装済み
- Phase 3: GitHub Repository連携、Issue/Comment/PR同期、Webhook署名検証、Queue処理 - 実装済み
- Phase 4: Generic Webhook mapping、API token、Slack/Lark/アプリ内通知 - 実装済み
- Phase 5: プロジェクト/タスク/Wikiの読み取りとタスク作成に対応したMCP server
- Phase 6: Backlog連携の検討

## 作らないもの

初期段階では、Jira、Linear、Notion、Redmineの完全代替は目指しません。ProjectFlareは、機能量よりも「Cloudflareだけで運用できる軽さ」と「GitHub、Webhook、Wiki、ガントをつなぐ補助レイヤー」であることを優先します。
