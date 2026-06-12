import { describe, expect, it, vi } from "vitest";
import { processGitHubWebhookUseCase } from "../packages/core/src/application/usecases/process-github-webhook";
import type { GitHubSyncPorts, GitHubTaskRecord } from "../packages/core/src/ports/github-sync";

function createPorts(options: { projectId?: string | null; task?: GitHubTaskRecord | null } = {}) {
  const createdTasks: unknown[] = [];
  const updatedTasks: unknown[] = [];
  const comments: unknown[] = [];
  const notifications: unknown[] = [];
  const processedEvents: unknown[] = [];
  let task = options.task ?? null;

  const ports: GitHubSyncPorts = {
    ids: {
      create: vi.fn(() => `id_${createdTasks.length + comments.length + 1}`),
    },
    projects: {
      findIdByRepositoryFullName: vi.fn(async () =>
        Object.hasOwn(options, "projectId") ? options.projectId || null : "project_1",
      ),
    },
    webhookEvents: {
      markProcessed: vi.fn(async (eventId, status) => {
        processedEvents.push({ eventId, status });
      }),
    },
    tasks: {
      findByGitHubIssueUrl: vi.fn(async () => task),
      createFromIssue: vi.fn(async (input) => {
        createdTasks.push(input);
        task = { id: input.id, project_id: input.projectId, title: input.title };
      }),
      updateFromIssue: vi.fn(async (id, input) => {
        updatedTasks.push({ id, ...input });
      }),
      updateLinkedIssueStatus: vi.fn(async (issueUrl, status, progress) => {
        updatedTasks.push({ issueUrl, status, progress });
      }),
    },
    comments: {
      createGitHubComment: vi.fn(async (input) => {
        comments.push(input);
      }),
    },
    notifications: {
      notifyProject: vi.fn(async (_projectId, input) => {
        notifications.push(input);
      }),
    },
  };

  return { ports, createdTasks, updatedTasks, comments, notifications, processedEvents };
}

describe("processGitHubWebhookUseCase", () => {
  it("creates a task from a new GitHub issue", async () => {
    const { ports, createdTasks, notifications, processedEvents } = createPorts({ task: null });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_1",
        eventName: "issues",
        repositoryFullName: "owner/repo",
        payload: {
          issue: {
            number: 12,
            title: "Fix sync",
            body: "Issue body",
            html_url: "https://github.com/owner/repo/issues/12",
            state: "open",
          },
        },
      },
      ports,
    );

    expect(createdTasks).toContainEqual(
      expect.objectContaining({
        projectId: "project_1",
        title: "Fix sync",
        status: "todo",
        progress: 0,
      }),
    );
    expect(notifications).toContainEqual(expect.objectContaining({ title: "GitHub issue synced" }));
    expect(processedEvents).toContainEqual({ eventId: "event_1", status: "processed" });
  });

  it("marks unmatched repositories without side effects", async () => {
    const { ports, createdTasks, notifications, processedEvents } = createPorts({ projectId: null });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_2",
        eventName: "issues",
        repositoryFullName: "owner/repo",
        payload: {
          issue: {
            title: "No project",
            html_url: "https://github.com/owner/repo/issues/13",
          },
        },
      },
      ports,
    );

    expect(createdTasks).toHaveLength(0);
    expect(notifications).toHaveLength(0);
    expect(processedEvents).toContainEqual({ eventId: "event_2", status: "no_project_match" });
  });

  it("syncs GitHub comments to an existing task", async () => {
    const { ports, comments, notifications } = createPorts({
      task: { id: "task_1", project_id: "project_1", title: "Linked issue" },
    });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_3",
        eventName: "issue_comment",
        repositoryFullName: "owner/repo",
        payload: {
          issue: {
            html_url: "https://github.com/owner/repo/issues/14",
          },
          comment: {
            body: "Looks good",
            user: { login: "octocat" },
          },
        },
      },
      ports,
    );

    expect(comments).toContainEqual(
      expect.objectContaining({
        taskId: "task_1",
        author: "octocat",
        body: "Looks good",
      }),
    );
    expect(notifications).toContainEqual(expect.objectContaining({ title: "GitHub comment synced" }));
  });

  it("updates an existing issue task and marks closed issues done", async () => {
    const { ports, updatedTasks, notifications } = createPorts({
      task: { id: "task_1", project_id: "project_1", title: "Old title" },
    });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_4",
        eventName: "issues",
        repositoryFullName: "owner/repo",
        payload: {
          issue: {
            number: 15,
            title: "Closed issue",
            body: "Done now",
            html_url: "https://github.com/owner/repo/issues/15",
            state: "closed",
          },
        },
      },
      ports,
    );

    expect(updatedTasks).toContainEqual(
      expect.objectContaining({
        id: "task_1",
        title: "Closed issue",
        description: "Done now",
        status: "done",
      }),
    );
    expect(notifications).toContainEqual(expect.objectContaining({ title: "GitHub issue updated" }));
  });

  it("updates linked issue tasks from pull request bodies", async () => {
    const { ports, updatedTasks, notifications } = createPorts({
      task: { id: "task_1", project_id: "project_1", title: "Linked task" },
    });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_5",
        eventName: "pull_request",
        repositoryFullName: "owner/repo",
        payload: {
          pull_request: {
            body: "Closes https://github.com/owner/repo/issues/16",
            state: "open",
          },
        },
      },
      ports,
    );

    expect(updatedTasks).toContainEqual(
      expect.objectContaining({
        issueUrl: "https://github.com/owner/repo/issues/16",
        status: "review",
        progress: 70,
      }),
    );
    expect(notifications).toContainEqual(expect.objectContaining({ title: "GitHub PR updated linked task" }));
  });

  it("marks merged pull request linked tasks done", async () => {
    const { ports, updatedTasks } = createPorts({
      task: { id: "task_1", project_id: "project_1", title: "Merged task" },
    });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_6",
        eventName: "pull_request",
        repositoryFullName: "owner/repo",
        payload: {
          pull_request: {
            body: "Fixes https://github.com/owner/repo/issues/17",
            state: "closed",
            merged: true,
          },
        },
      },
      ports,
    );

    expect(updatedTasks).toContainEqual(
      expect.objectContaining({
        issueUrl: "https://github.com/owner/repo/issues/17",
        status: "done",
        progress: 100,
      }),
    );
  });

  it("ignores issue comments when no linked task exists", async () => {
    const { ports, comments, notifications } = createPorts({ task: null });

    await processGitHubWebhookUseCase(
      {
        eventId: "event_7",
        eventName: "issue_comment",
        repositoryFullName: "owner/repo",
        payload: {
          issue: {
            html_url: "https://github.com/owner/repo/issues/18",
          },
          comment: {
            body: "No local task",
          },
          sender: { login: "sender" },
        },
      },
      ports,
    );

    expect(comments).toHaveLength(0);
    expect(notifications).toHaveLength(0);
  });
});
