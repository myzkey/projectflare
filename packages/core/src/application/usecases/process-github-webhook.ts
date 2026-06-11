import { extractGitHubIssueUrls, type GitHubWebhookPayload } from "../../domain/github";
import { type TaskStatus, taskStatusLabels } from "../../domain/task";
import type { GitHubSyncPorts, ProcessGitHubWebhookInput } from "../../ports/github-sync";

export async function processGitHubWebhookUseCase(
  input: ProcessGitHubWebhookInput,
  ports: GitHubSyncPorts,
): Promise<void> {
  const projectId = input.repositoryFullName
    ? await ports.projects.findIdByRepositoryFullName(input.repositoryFullName)
    : null;

  if (!projectId) {
    await ports.webhookEvents.markProcessed(input.eventId, "no_project_match");
    return;
  }

  if (input.eventName === "issues" && input.payload.issue) {
    await syncGitHubIssue(projectId, input.payload, ports);
  } else if (input.eventName === "issue_comment" && input.payload.issue && input.payload.comment) {
    await syncGitHubIssueComment(input.payload, ports);
  } else if (input.eventName === "pull_request" && input.payload.pull_request) {
    await syncGitHubPullRequest(input.payload, ports);
  }

  await ports.webhookEvents.markProcessed(input.eventId, "processed");
}

async function syncGitHubIssue(projectId: string, payload: GitHubWebhookPayload, ports: GitHubSyncPorts) {
  if (!payload.issue) return;

  const issue = payload.issue;
  const issueUrl = issue.html_url || "";
  const status: TaskStatus = issue.state === "closed" ? "done" : "todo";
  const title = issue.title || `GitHub Issue #${issue.number || ""}`.trim();
  const description = issue.body || issueUrl;
  const existing = await ports.tasks.findByGitHubIssueUrl(issueUrl);

  if (existing) {
    await ports.tasks.updateFromIssue(existing.id, { title, description, status });
    await ports.notifications.notifyProject(projectId, {
      title: "GitHub issue updated",
      body: title,
      source: "github",
    });
    return;
  }

  await ports.tasks.createFromIssue({
    id: ports.ids.create(),
    projectId,
    title,
    description,
    status,
    progress: status === "done" ? 100 : 0,
    issueUrl,
  });
  await ports.notifications.notifyProject(projectId, {
    title: "GitHub issue synced",
    body: title,
    source: "github",
  });
}

async function syncGitHubIssueComment(payload: GitHubWebhookPayload, ports: GitHubSyncPorts) {
  if (!payload.issue || !payload.comment) return;

  const issueUrl = payload.issue.html_url || "";
  const task = await ports.tasks.findByGitHubIssueUrl(issueUrl);
  if (!task) return;

  const author = payload.comment.user?.login || payload.sender?.login || "github";
  await ports.comments.createGitHubComment({
    id: ports.ids.create(),
    taskId: task.id,
    author,
    body: payload.comment.body || "",
  });
  await ports.notifications.notifyProject(task.project_id, {
    title: "GitHub comment synced",
    body: `${author} commented on ${task.title}.`,
    source: "github",
  });
}

async function syncGitHubPullRequest(payload: GitHubWebhookPayload, ports: GitHubSyncPorts) {
  if (!payload.pull_request) return;

  const linkedIssueUrls = extractGitHubIssueUrls(payload.pull_request.body || "");
  if (!linkedIssueUrls.length) return;

  const status: TaskStatus = payload.pull_request.merged || payload.pull_request.state === "closed" ? "done" : "review";
  const progress = status === "done" ? 100 : 70;

  for (const issueUrl of linkedIssueUrls) {
    await ports.tasks.updateLinkedIssueStatus(issueUrl, status, progress);

    const task = await ports.tasks.findByGitHubIssueUrl(issueUrl);
    if (task) {
      await ports.notifications.notifyProject(task.project_id, {
        title: "GitHub PR updated linked task",
        body: `${task.title} moved to ${taskStatusLabels[status]}.`,
        source: "github",
      });
    }
  }
}
