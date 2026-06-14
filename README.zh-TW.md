# ProjectFlare

面向小型團隊的 Cloudflare 原生輕量專案管理 OSS。

ProjectFlare 是一個輕量專案 OS，設計執行於 Cloudflare Workers、D1、R2、Queues 和 Zero Trust。它適合希望在不維運 VPS、Docker host、PostgreSQL、Redis、Nginx 或憑證的情況下，整合任務、甘特計畫、Wiki、GitHub/Webhook 輸入、多語管理畫面，以及未來 MCP 存取的團隊。

ProjectFlare 不打算一次取代 Jira、Linear、Notion、Redmine 或 OpenProject。目標是小型 Cloudflare 原生營運層，讓工程師、非工程師、Webhook、GitHub 和 AI agent 都能看見同一份專案資訊。

## 定位

- GitHub：實作追蹤
- ProjectFlare：專案追蹤與交付狀態
- Wiki：規格、背景、決策與 runbook
- Gantt：排程與相依關係可視化
- Webhooks：外部系統輸入
- MCP：未來 AI agent 操作介面

## 功能

- 透過 Cloudflare 託管的管理 UI 管理工作區和專案
- 建立包含狀態、優先順序、負責人、分類、標籤、里程碑、日期、進度和父任務的任務
- 管理專案專屬任務狀態，包括顏色、順序、完成/封存語意
- 追蹤巢狀任務、相依關係、狀態指標、看板式視圖和簡單甘特式計畫視圖
- 最新優先的任務留言，支援限制載入和長文展開
- 使用 Markdown 支援的富文字編輯器撰寫任務描述、任務留言和 Wiki 頁面
- 將圖片和輕量影片上傳到任務和 Wiki 頁面
- 將已上傳媒體以 Markdown 插入留言或 Wiki 頁面
- 在留言/Wiki 編輯器貼上或拖放圖片/影片並自動上傳與插入
- 建立和編輯有修訂歷史的 Markdown Wiki 頁面
- 連結 GitHub repository 並接收 issue、comment、pull request webhook events
- 建立帶 token 的 Generic Webhook endpoint，將外部 JSON 轉換成任務
- 傳送應用內通知，以及 Slack、Lark 或 Generic Webhook 外送通知
- 安裝宣告 capability、hook、route 和 plugin-scoped storage 的 first-party plugin
- 將管理 UI 安裝為 PWA，支援離線 app shell fallback 和更新通知
- 管理 UI 支援 18 個 locale：`ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN`, `zh-TW`
- 支援阿拉伯語和波斯語 RTL layout

## 文件

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## GitHub 同步

- 將 GitHub repository 連結到 ProjectFlare 專案
- 在 `/api/github/webhook` 接收 GitHub Webhook
- 設定 `GITHUB_WEBHOOK_SECRET` 時驗證 `X-Hub-Signature-256`
- 透過 Cloudflare Queues 處理 GitHub webhook
- 將 GitHub issues 同步為任務
- 將 GitHub issue comments 同步為任務留言
- 當 PR 內文包含 GitHub issue URL 時，由 pull request event 更新相關任務

本機開發中 GitHub webhook secret 是選用項。正式環境請將 `GITHUB_WEBHOOK_SECRET` 設為 Worker secret。

## Webhook 與通知

- 為每個專案建立帶 token 的 Generic Webhook endpoint
- 接受 `Authorization: Bearer <token>` 或 `X-ProjectFlare-Token`
- 為 endpoint 套用簡單的 `source` 和預設優先順序 mapping
- 為 Webhook 任務、留言、GitHub issue/comment/PR event 儲存應用內通知
- 為 Generic Webhook、Slack 或 Lark 相容 URL 新增外送通知頻道
- 將 Slack Incoming Webhook block payload 或精簡 JSON payload 傳送到已設定頻道

在 UI 建立的 Generic Webhook token 只會顯示一次。請保存到會送出任務的外部系統。

## 前端

管理 UI 是 `apps/web` 下的 React/Vite app。

- 專案切換器、摘要指標、任務表格和留言面板
- 帶有相依標籤的簡單甘特式計畫視圖
- 用於任務描述、留言和 Wiki 頁面的 Lexical Markdown editor
- Wiki 頁面列表、媒體附件和 revision list
- 管理 GitHub events、Generic Webhook endpoint、通知頻道和應用內通知的整合視圖
- 覆蓋目前支援 18 個 locale 的語言選擇器

語言選擇會儲存在 `localStorage` 的 `projectflare.locale`。

## 部署

ProjectFlare 使用 Wrangler 和 `wrangler.toml` 中宣告的 Cloudflare resources 部署。預設 OSS 流程不需要 Terraform 或 setup shell script。

D1、R2、Queues、Access、secrets、migrations 和 deploy commands 請參閱 [Deployment](./docs/deployment.md)。

## Generic Webhook

POST JSON 到：

```txt
/api/webhooks/generic/:projectId
```

範例：

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

## 非目標

ProjectFlare 早期範圍刻意避免成為完整的 Jira、Linear、Notion 或 Redmine clone。優先順序是建立 Cloudflare-only 的輕量基礎，以低維運成本連接任務、GitHub、Wiki、甘特計畫和 Webhook 輸入。
