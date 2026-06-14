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

## 機能

- Cloudflare 上で動く管理画面からワークスペースとプロジェクトを管理
- ステータス、優先度、担当者、カテゴリ、タグ、マイルストーン、日付、進捗率、親タスクを持つタスク作成
- プロジェクトごとのタスクステータス、色、並び順、完了/アーカイブ扱いの管理
- ネストしたタスク、依存関係、ステータス集計、カンバン風ボード、簡易ガント風の計画ビュー
- 最新順、件数制限、長文展開に対応したタスクコメント
- タスク説明、タスクコメント、Wikiページを Markdown 保存のリッチエディタで編集
- タスクとWikiページに画像・軽量動画をアップロード
- アップロード済みメディアを Markdown としてコメント/Wikiに挿入
- コメント/Wikiエディタへ画像・動画をペースト/ドロップして自動アップロードと挿入
- 更新履歴付きの Markdown Wiki ページ作成/編集
- GitHub Repository を連携し、Issue、コメント、Pull Request webhook を受信
- 外部JSONからタスクを作成するトークン付き Generic Webhook endpoint
- アプリ内通知、Slack、Lark、汎用 Webhook への送信通知
- capability、hook、route、plugin scoped storage を宣言する first-party plugin
- 管理画面を PWA としてインストールし、オフライン時の app shell fallback と更新通知に対応
- `ar`、`de`、`en`、`es-419`、`es-ES`、`eu`、`fa`、`fr`、`id`、`ja`、`ko`、`nb`、`pl`、`pseudo`、`pt-BR`、`th`、`zh-CN`、`zh-TW` の18ロケール対応
- アラビア語とペルシア語のRTL表示

## 詳細ドキュメント

- [開発者向け](./docs/development.md)
- [デプロイ](./docs/deployment.md)
- [アーキテクチャ](./docs/architecture.md)

## GitHub同期

- GitHub RepositoryをProjectFlareプロジェクトへ紐づけ
- `/api/github/webhook` でGitHub Webhookを受信
- `GITHUB_WEBHOOK_SECRET` 設定時に `X-Hub-Signature-256` を検証
- Cloudflare Queues 経由でGitHub Webhookを非同期処理
- GitHub Issueをタスクへ同期
- GitHub Issue Commentをタスクコメントへ同期
- PR本文にGitHub Issue URLが含まれる場合、PRイベントから関連タスクの状態を更新

ローカル開発ではGitHub Webhook secretは任意です。本番ではWorker secretとして設定してください。

## Webhookと通知

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

## デプロイ

ProjectFlare は `wrangler.toml` に定義した Cloudflare resource binding と Wrangler でデプロイします。標準の OSS フローでは Terraform や setup shell は必須にしません。

D1、R2、Queues、Access、secrets、migration、deploy command は [デプロイドキュメント](./docs/deployment.md) を参照してください。

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

## 作らないもの

初期段階では、Jira、Linear、Notion、Redmineの完全代替は目指しません。ProjectFlareは、機能量よりも「Cloudflareだけで運用できる軽さ」と「GitHub、Webhook、Wiki、ガントをつなぐ補助レイヤー」であることを優先します。
