export type TaskComment = {
  id: string;
  task_id: string;
  author_user_id: string | null;
  author_name?: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TaskDependency = {
  task_id: string;
  depends_on_task_id: string;
  task_title?: string;
  depends_on_title?: string;
  created_at: string;
};

export type WebhookEndpoint = {
  id: string;
  project_id: string;
  name: string;
  secret_hash: string;
  mapping_json: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
};
