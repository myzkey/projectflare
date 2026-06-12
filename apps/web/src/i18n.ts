import type { TaskPriority, TaskStatus } from "./types";

export type Locale = "en" | "ja";

export type Messages = {
  appSubtitle: string;
  loading: string;
  signedIn: string;
  noWorkspace: string;
  createProjectTitle: string;
  projectFallback: string;
  githubLinked: string;
  ready: string;
  dismiss: string;
  tabs: Record<"overview" | "plan" | "wiki" | "integrations", string>;
  status: Record<TaskStatus, string>;
  priority: Record<TaskPriority, string>;
  metrics: {
    open: string;
    review: string;
    done: string;
    overdue: string;
  };
  overview: {
    tasks: string;
    taskCount: (count: number) => string;
    noDescription: string;
    create: string;
    createMeta: string;
    taskTitle: string;
    description: string;
    addTask: string;
    newProjectName: string;
    shortDescription: string;
    addProject: string;
    comments: string;
    noTask: string;
    unknown: string;
    emptyComments: string;
    writeComment: string;
  };
  plan: {
    timeline: string;
    dependencyCount: (count: number) => string;
    dependencies: string;
    planningLinks: string;
    linkTasks: string;
    before: string;
    needs: string;
  };
  wiki: {
    pages: string;
    pageCount: (count: number) => string;
    editor: string;
    revisionCount: (count: number) => string;
    pageTitle: string;
    slug: string;
    markdownBody: string;
    savePage: string;
    revisions: string;
    history: string;
    unknown: string;
  };
  integrations: {
    eventCount: (count: number) => string;
    owner: string;
    repo: string;
    repositoryUrl: string;
    linkRepository: string;
    genericWebhooks: string;
    endpointCount: (count: number) => string;
    endpointName: string;
    source: string;
    createEndpoint: string;
    notifications: string;
    unreadCount: (count: number) => string;
    channelName: string;
    targetUrl: string;
    addChannel: string;
    newToken: (token: string, endpoint: string) => string;
    hidden: string;
  };
  language: {
    label: string;
    switchTo: string;
  };
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
};

export const dictionaries: Record<Locale, Messages> = {
  en: {
    appSubtitle: "Cloudflare-native project OS",
    loading: "Loading ProjectFlare",
    signedIn: "Signed in",
    noWorkspace: "No workspace",
    createProjectTitle: "Create a project",
    projectFallback: "Tasks, notes, webhooks, and delivery signals in one Worker.",
    githubLinked: "GitHub linked",
    ready: "Ready",
    dismiss: "Dismiss",
    tabs: {
      overview: "Overview",
      plan: "Plan",
      wiki: "Wiki",
      integrations: "Integrations",
    },
    status: {
      todo: "Todo",
      in_progress: "In Progress",
      review: "Review",
      done: "Done",
      archived: "Archived",
    },
    priority: {
      low: "low",
      medium: "medium",
      high: "high",
      urgent: "urgent",
    },
    metrics: {
      open: "Open",
      review: "Review",
      done: "Done",
      overdue: "Overdue",
    },
    overview: {
      tasks: "Tasks",
      taskCount: (count) => `${count} tasks`,
      noDescription: "No description",
      create: "Create",
      createMeta: "project / task",
      taskTitle: "Task title",
      description: "Description",
      addTask: "Add task",
      newProjectName: "New project name",
      shortDescription: "Short description",
      addProject: "Add project",
      comments: "Comments",
      noTask: "No task",
      unknown: "Unknown",
      emptyComments: "Select a task and add the first note.",
      writeComment: "Write a comment",
    },
    plan: {
      timeline: "Timeline",
      dependencyCount: (count) => `${count} dependencies`,
      dependencies: "Dependencies",
      planningLinks: "planning links",
      linkTasks: "Link tasks",
      before: "before",
      needs: "needs",
    },
    wiki: {
      pages: "Pages",
      pageCount: (count) => `${count} pages`,
      editor: "Editor",
      revisionCount: (count) => `${count} revisions`,
      pageTitle: "Page title",
      slug: "slug",
      markdownBody: "Markdown body",
      savePage: "Save page",
      revisions: "Revisions",
      history: "history",
      unknown: "Unknown",
    },
    integrations: {
      eventCount: (count) => `${count} events`,
      owner: "owner",
      repo: "repo",
      repositoryUrl: "https://github.com/owner/repo",
      linkRepository: "Link repository",
      genericWebhooks: "Generic Webhooks",
      endpointCount: (count) => `${count} endpoints`,
      endpointName: "Endpoint name",
      source: "source",
      createEndpoint: "Create endpoint",
      notifications: "Notifications",
      unreadCount: (count) => `${count} unread`,
      channelName: "Channel name",
      targetUrl: "target URL",
      addChannel: "Add channel",
      newToken: (token, endpoint) => `New token: ${token} / ${endpoint}`,
      hidden: "hidden",
    },
    language: {
      label: "Language",
      switchTo: "日本語",
    },
  },
  ja: {
    appSubtitle: "Cloudflare ネイティブなプロジェクト OS",
    loading: "ProjectFlare を読み込み中",
    signedIn: "サインイン中",
    noWorkspace: "ワークスペースなし",
    createProjectTitle: "プロジェクトを作成",
    projectFallback: "タスク、ノート、Webhook、進行シグナルを 1 つの Worker にまとめます。",
    githubLinked: "GitHub 連携済み",
    ready: "準備完了",
    dismiss: "閉じる",
    tabs: {
      overview: "概要",
      plan: "計画",
      wiki: "Wiki",
      integrations: "連携",
    },
    status: {
      todo: "未着手",
      in_progress: "進行中",
      review: "レビュー",
      done: "完了",
      archived: "アーカイブ",
    },
    priority: {
      low: "低",
      medium: "中",
      high: "高",
      urgent: "緊急",
    },
    metrics: {
      open: "未完了",
      review: "レビュー",
      done: "完了",
      overdue: "期限超過",
    },
    overview: {
      tasks: "タスク",
      taskCount: (count) => `${count} 件`,
      noDescription: "説明なし",
      create: "作成",
      createMeta: "プロジェクト / タスク",
      taskTitle: "タスク名",
      description: "説明",
      addTask: "タスクを追加",
      newProjectName: "新しいプロジェクト名",
      shortDescription: "短い説明",
      addProject: "プロジェクトを追加",
      comments: "コメント",
      noTask: "タスク未選択",
      unknown: "不明",
      emptyComments: "タスクを選択して最初のコメントを追加してください。",
      writeComment: "コメントを書く",
    },
    plan: {
      timeline: "タイムライン",
      dependencyCount: (count) => `${count} 件の依存関係`,
      dependencies: "依存関係",
      planningLinks: "計画リンク",
      linkTasks: "タスクをリンク",
      before: "先行",
      needs: "必要",
    },
    wiki: {
      pages: "ページ",
      pageCount: (count) => `${count} ページ`,
      editor: "エディタ",
      revisionCount: (count) => `${count} 件の履歴`,
      pageTitle: "ページタイトル",
      slug: "スラッグ",
      markdownBody: "Markdown 本文",
      savePage: "ページを保存",
      revisions: "更新履歴",
      history: "履歴",
      unknown: "不明",
    },
    integrations: {
      eventCount: (count) => `${count} 件のイベント`,
      owner: "owner",
      repo: "repo",
      repositoryUrl: "https://github.com/owner/repo",
      linkRepository: "リポジトリを連携",
      genericWebhooks: "Generic Webhook",
      endpointCount: (count) => `${count} endpoint`,
      endpointName: "Endpoint 名",
      source: "source",
      createEndpoint: "Endpoint を作成",
      notifications: "通知",
      unreadCount: (count) => `${count} 件未読`,
      channelName: "チャンネル名",
      targetUrl: "送信先 URL",
      addChannel: "チャンネルを追加",
      newToken: (token, endpoint) => `新しい token: ${token} / ${endpoint}`,
      hidden: "非表示",
    },
    language: {
      label: "言語",
      switchTo: "English",
    },
  },
};

export function detectInitialLocale(): Locale {
  const stored = globalThis.localStorage?.getItem("projectflare.locale");
  if (stored === "en" || stored === "ja") return stored;
  return globalThis.navigator?.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}
