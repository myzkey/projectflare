import type { GitHubRepository } from "../../../../core/src/domain/github";
import type { Project, Workspace } from "../../../../core/src/domain/project";
import type { Task } from "../../../../core/src/domain/task";
import type { WikiPage, WikiRevision } from "../../../../core/src/domain/wiki";
import type { TaskComment, TaskDependency, WebhookEndpoint } from "./types";

export function demoWorkspaces(): Workspace[] {
  return [
    {
      id: "ws_demo",
      name: "ProjectFlare Demo",
      slug: "demo",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function demoProjects(): Project[] {
  return [
    {
      id: "prj_launch",
      workspace_id: "ws_demo",
      workspace_name: "ProjectFlare Demo",
      name: "Cloudflare Native MVP",
      description: "Tasks, gantt, wiki, webhooks, and Access-backed users.",
      status: "active",
      starts_on: "2026-06-01",
      due_on: "2026-07-15",
      github_repository_url: "https://github.com/example/projectflare",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function demoTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: "tsk_schema",
      project_id: "prj_launch",
      title: "Design D1 schema",
      description: "Model the core project OS entities.",
      status: "done",
      priority: "high",
      assignee_user_id: "usr_engineer",
      assignee_name: "Platform Engineer",
      parent_task_id: null,
      category_id: "cat_platform",
      category_name: "Platform",
      category_color: "#2563eb",
      milestone_id: "ms_mvp",
      milestone_name: "MVP",
      milestone_due_on: "2026-07-15",
      tags: ["schema", "cloudflare"],
      starts_on: "2026-06-01",
      due_on: "2026-06-05",
      progress: 100,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "tsk_ui",
      project_id: "prj_launch",
      title: "Build project command center",
      description: "Dense scanning surface for task and schedule work.",
      status: "in_progress",
      priority: "high",
      assignee_user_id: "usr_pm",
      assignee_name: "Project Manager",
      parent_task_id: "tsk_schema",
      category_id: "cat_product",
      category_name: "Product",
      category_color: "#16a34a",
      milestone_id: "ms_mvp",
      milestone_name: "MVP",
      milestone_due_on: "2026-07-15",
      tags: ["ui", "react"],
      starts_on: "2026-06-04",
      due_on: "2026-06-20",
      progress: 55,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "tsk_webhooks",
      project_id: "prj_launch",
      title: "Accept generic webhook tasks",
      description: "Turn JSON payloads into triage tasks.",
      status: "todo",
      priority: "medium",
      assignee_user_id: "usr_engineer",
      assignee_name: "Platform Engineer",
      parent_task_id: "tsk_ui",
      category_id: "cat_integrations",
      category_name: "Integrations",
      category_color: "#9333ea",
      milestone_id: "ms_integrations",
      milestone_name: "Integrations",
      milestone_due_on: "2026-07-01",
      tags: ["webhook", "automation"],
      starts_on: "2026-06-18",
      due_on: "2026-06-28",
      progress: 10,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function demoComments(taskId: string): TaskComment[] {
  if (taskId !== "tsk_ui") return [];

  const now = new Date().toISOString();
  return [
    {
      id: "comment_demo",
      task_id: taskId,
      author_user_id: "usr_demo",
      author_name: "ProjectFlare",
      body: "Phase 1 should make task updates and comments usable from the first screen.",
      created_at: now,
      updated_at: now,
    },
  ];
}

export function demoDependencies(): TaskDependency[] {
  const now = new Date().toISOString();
  return [
    {
      task_id: "tsk_ui",
      depends_on_task_id: "tsk_schema",
      task_title: "Build project command center",
      depends_on_title: "Design D1 schema",
      created_at: now,
    },
    {
      task_id: "tsk_webhooks",
      depends_on_task_id: "tsk_schema",
      task_title: "Accept generic webhook tasks",
      depends_on_title: "Design D1 schema",
      created_at: now,
    },
  ];
}

export function demoWikiPages(projectId: string): WikiPage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "wiki_overview",
      project_id: projectId,
      parent_page_id: null,
      title: "MVP Scope",
      slug: "mvp-scope",
      body_markdown:
        "# MVP Scope\n\nProjectFlare starts as a Cloudflare-only project OS.\n\n- Task board\n- Gantt timeline\n- Markdown wiki\n- Webhook intake",
      created_by_user_id: null,
      updated_by_user_id: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function demoWikiRevisions(pageId: string): WikiRevision[] {
  return [
    {
      id: "wiki_revision_demo",
      wiki_page_id: pageId,
      body_markdown: "# MVP Scope\n\nInitial demo revision.",
      author_user_id: "usr_demo",
      author_name: "ProjectFlare",
      created_at: new Date().toISOString(),
    },
  ];
}

export function demoGitHubRepositories(workspaceId: string): GitHubRepository[] {
  const now = new Date().toISOString();
  return [
    {
      id: "github_repo_demo",
      github_integration_id: "github_integration_demo",
      project_id: "prj_launch",
      owner: "example",
      name: "projectflare",
      repository_url: "https://github.com/example/projectflare",
      created_at: now,
      updated_at: now,
    },
  ].filter(() => workspaceId === "ws_demo");
}

export function demoWebhookEndpoints(projectId: string): WebhookEndpoint[] {
  if (projectId !== "prj_launch") return [];

  const now = new Date().toISOString();
  return [
    {
      id: "webhook_endpoint_demo",
      project_id: projectId,
      name: "Demo intake",
      secret_hash: "stored",
      mapping_json: JSON.stringify({ source: "demo", defaultPriority: "medium" }),
      enabled: 1,
      created_at: now,
      updated_at: now,
    },
  ];
}
