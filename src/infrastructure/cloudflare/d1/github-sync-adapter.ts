import type {
  GitHubNotificationInput,
  GitHubSyncPorts,
  GitHubTaskCreateInput,
  GitHubTaskRecord,
  GitHubTaskUpdateInput,
} from "../../../ports/github-sync";
import type { Env } from "../env";

export function createGitHubSyncPorts(
  env: Env,
  notifyProject: (projectId: string, input: GitHubNotificationInput) => Promise<void>,
): GitHubSyncPorts {
  return {
    ids: {
      create: () => crypto.randomUUID(),
    },
    projects: {
      findIdByRepositoryFullName: (repositoryFullName) => findProjectIdForGitHubRepository(env, repositoryFullName),
    },
    webhookEvents: {
      markProcessed: (eventId, status) => markWebhookEventProcessed(env, eventId, status),
    },
    tasks: {
      findByGitHubIssueUrl: (issueUrl) => findTaskByGitHubIssueUrl(env, issueUrl),
      createFromIssue: (input) => createTaskFromGitHubIssue(env, input),
      updateFromIssue: (id, input) => updateTaskFromGitHubIssue(env, id, input),
      updateLinkedIssueStatus: async (issueUrl, status, progress) => {
        if (!env.DB) return;

        await env.DB.prepare(
          `UPDATE tasks
           SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
           WHERE github_issue_url = ?`,
        )
          .bind(status, progress, issueUrl)
          .run();
      },
    },
    comments: {
      createGitHubComment: async (input) => {
        if (!env.DB) return;

        await env.DB.prepare(
          `INSERT INTO task_comments (id, task_id, author_user_id, body)
           VALUES (?, ?, NULL, ?)`,
        )
          .bind(input.id, input.taskId, `[GitHub:${input.author}] ${input.body}`)
          .run();
      },
    },
    notifications: {
      notifyProject,
    },
  };
}

async function findProjectIdForGitHubRepository(env: Env, repositoryFullName: string): Promise<string | null> {
  if (!env.DB) return null;

  const [owner, name] = repositoryFullName.split("/");
  if (!owner || !name) return null;

  const repo = await env.DB.prepare(
    `SELECT project_id
     FROM github_repositories
     WHERE owner = ? AND name = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(owner, name)
    .first<{ project_id: string | null }>();

  return repo?.project_id || null;
}

async function markWebhookEventProcessed(env: Env, eventId: string, status: string): Promise<void> {
  if (!env.DB) return;

  await env.DB.prepare(
    `UPDATE webhook_events
     SET status = ?, processed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(status, eventId)
    .run();
}

async function findTaskByGitHubIssueUrl(env: Env, issueUrl: string): Promise<GitHubTaskRecord | null> {
  if (!env.DB) return null;

  return env.DB.prepare("SELECT id, project_id, title FROM tasks WHERE github_issue_url = ? LIMIT 1")
    .bind(issueUrl)
    .first<GitHubTaskRecord>();
}

async function createTaskFromGitHubIssue(env: Env, input: GitHubTaskCreateInput): Promise<void> {
  if (!env.DB) return;

  await env.DB.prepare(
    `INSERT INTO tasks (
       id, project_id, title, description, status, priority, progress, source, external_url, github_issue_url
     )
     VALUES (?, ?, ?, ?, ?, 'medium', ?, 'github', ?, ?)`,
  )
    .bind(
      input.id,
      input.projectId,
      input.title,
      input.description,
      input.status,
      input.progress,
      input.issueUrl,
      input.issueUrl,
    )
    .run();
}

async function updateTaskFromGitHubIssue(env: Env, id: string, input: GitHubTaskUpdateInput): Promise<void> {
  if (!env.DB) return;

  await env.DB.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, source = 'github', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(input.title, input.description, input.status, id)
    .run();
}
