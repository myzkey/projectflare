export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
};
