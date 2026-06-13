# ProjectFlare

面向小团队的 Cloudflare 原生轻量项目管理 OSS。

ProjectFlare 是一个轻量项目 OS，设计运行在 Cloudflare Workers、D1、R2、Queues 和 Zero Trust 上。它面向希望在不运维 VPS、Docker 主机、PostgreSQL、Redis、Nginx 或证书的情况下，统一管理任务、甘特计划、Wiki、GitHub/Webhook 输入、多语言管理界面以及未来 MCP 访问的团队。

ProjectFlare 不试图一次性替代 Jira、Linear、Notion、Redmine 或 OpenProject。目标是一个小型 Cloudflare 原生运营层，让工程师、非工程师、Webhook、GitHub 和 AI agent 都能看到同一份项目信息。

## 定位

- GitHub：实现跟踪
- ProjectFlare：项目跟踪和交付状态
- Wiki：规格、背景、决策和运行手册
- Gantt：计划和依赖可视化
- Webhooks：外部系统输入
- MCP：未来的 AI agent 操作接口

## 功能

- 通过 Cloudflare 托管的管理 UI 管理工作区和项目
- 创建带有状态、优先级、负责人、分类、标签、里程碑、日期、进度和父任务的任务
- 管理项目专属任务状态，包括颜色、顺序、完成/归档语义
- 跟踪嵌套任务、依赖、状态指标、看板式视图和简单甘特式计划视图
- 最新优先的任务评论，支持限制加载和长文本展开
- 使用 Markdown 支持的富文本编辑器编写任务描述、任务评论和 Wiki 页面
- 将图片和轻量视频上传到任务和 Wiki 页面
- 将已上传媒体作为 Markdown 插入评论或 Wiki 页面
- 在评论/Wiki 编辑器中粘贴或拖放图片/视频并自动上传和插入
- 创建和编辑带修订历史的 Markdown Wiki 页面
- 连接 GitHub 仓库并接收 issue、comment、pull request webhook 事件
- 创建带 token 的 Generic Webhook endpoint，将外部 JSON 转换为任务
- 发送应用内通知以及 Slack、Lark 或 Generic Webhook 外发通知
- 安装声明 capability、hook、route 和 plugin-scoped storage 的 first-party plugin
- 管理 UI 支持 18 个 locale：`ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN`, `zh-TW`
- 支持阿拉伯语和波斯语 RTL 布局

## 文档

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## GitHub 同步

- 将 GitHub 仓库关联到 ProjectFlare 项目
- 在 `/api/github/webhook` 接收 GitHub Webhook
- 配置 `GITHUB_WEBHOOK_SECRET` 时验证 `X-Hub-Signature-256`
- 通过 Cloudflare Queues 处理 GitHub webhook
- 将 GitHub issues 同步为任务
- 将 GitHub issue comments 同步为任务评论
- 当 PR 正文包含 GitHub issue URL 时，通过 pull request 事件更新关联任务

本地开发中 GitHub webhook secret 是可选的。生产环境中请将 `GITHUB_WEBHOOK_SECRET` 设置为 Worker secret。

## Webhook 和通知

- 为每个项目创建带 token 的 Generic Webhook endpoint
- 接受 `Authorization: Bearer <token>` 或 `X-ProjectFlare-Token`
- 为 endpoint 应用简单的 `source` 和默认优先级映射
- 为 Webhook 任务、评论、GitHub issue/comment/PR 事件保存应用内通知
- 为 Generic Webhook、Slack 或 Lark 兼容 URL 添加外发通知频道
- 向配置的频道发送 Slack Incoming Webhook block payload 或紧凑 JSON payload

在 UI 中创建的 Generic Webhook token 只显示一次。请保存到发送任务的外部系统中。

## 前端

管理 UI 是 `apps/web` 下的 React/Vite 应用。

- 项目切换器、摘要指标、任务表格和评论面板
- 带依赖标签的简单甘特式计划视图
- 用于任务描述、评论和 Wiki 页面的 Lexical Markdown 编辑器
- Wiki 页面列表、媒体附件和修订列表
- 管理 GitHub 事件、Generic Webhook endpoint、通知频道和应用内通知的集成视图
- 覆盖当前支持 18 个 locale 的语言选择器

语言选择保存在 `localStorage` 的 `projectflare.locale` 中。

## 部署

ProjectFlare 使用 Wrangler 和 `wrangler.toml` 中声明的 Cloudflare 资源部署。默认 OSS 流程不需要 Terraform 或 setup shell script。

D1、R2、Queues、Access、secrets、migrations 和 deploy commands 请参阅 [Deployment](./docs/deployment.md)。

## Generic Webhook

POST JSON 到：

```txt
/api/webhooks/generic/:projectId
```

示例：

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

## 非目标

ProjectFlare 早期范围刻意避免成为完整的 Jira、Linear、Notion 或 Redmine 克隆。优先级是一个 Cloudflare-only 的轻量基础，用低运维成本连接任务、GitHub、Wiki、甘特计划和 Webhook 输入。
