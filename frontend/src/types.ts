export type AccessUser = {
  id: string;
  email: string;
  name: string;
  group: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  name: string;
  description: string | null;
  status: string;
  starts_on: string | null;
  due_on: string | null;
  github_repository_url: string | null;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  starts_on: string | null;
  due_on: string | null;
  progress: number;
  source: string | null;
};

export type TaskDependency = {
  task_id: string;
  depends_on_task_id: string;
  task_title?: string;
  depends_on_title?: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_name?: string | null;
  body: string;
  created_at: string;
};

export type WikiPage = {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  body_markdown: string;
  updated_at: string;
};

export type WikiRevision = {
  id: string;
  wiki_page_id: string;
  author_name?: string | null;
  created_at: string;
};

export type GitHubRepository = {
  id: string;
  project_id: string | null;
  owner: string;
  name: string;
  repository_url: string;
};

export type GitHubEvent = {
  id: string;
  event_type: string;
  status: string;
  created_at: string;
};

export type WebhookEndpoint = {
  id: string;
  name: string;
  endpoint_url?: string;
  token?: string;
};

export type NotificationChannel = {
  id: string;
  name: string;
  channel_type: string;
  target_url: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  source: string;
  read_at: string | null;
  created_at: string;
};
