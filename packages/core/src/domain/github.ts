export type GitHubRepository = {
  id: string;
  github_integration_id: string;
  project_id: string | null;
  owner: string;
  name: string;
  repository_url: string;
  created_at: string;
  updated_at: string;
};

export type GitHubWebhookPayload = {
  action?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
    owner?: { login?: string };
    name?: string;
  };
  issue?: {
    number?: number;
    title?: string;
    body?: string | null;
    html_url?: string;
    state?: string;
  };
  comment?: {
    body?: string;
    html_url?: string;
    user?: { login?: string };
  };
  pull_request?: {
    title?: string;
    body?: string | null;
    html_url?: string;
    state?: string;
    merged?: boolean;
  };
  sender?: { login?: string };
};

export function repositoryFullNameFromPayload(payload: GitHubWebhookPayload): string | null {
  const owner = payload.repository?.owner?.login;
  const name = payload.repository?.name;
  return owner && name ? `${owner}/${name}` : null;
}

export function extractGitHubIssueUrls(text: string): string[] {
  const matches = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+/g);
  return [...new Set(matches || [])];
}
