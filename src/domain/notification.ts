export type NotificationChannel = {
  id: string;
  project_id: string;
  name: string;
  channel_type: "webhook" | "slack" | "lark";
  target_url: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  source: string;
  read_at: string | null;
  created_at: string;
};
