export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "archived";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  archived: "Archived",
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_user_id: string | null;
  assignee_name?: string | null;
  parent_task_id: string | null;
  category_id: string | null;
  category_name?: string | null;
  category_color?: string | null;
  milestone_id: string | null;
  milestone_name?: string | null;
  milestone_due_on?: string | null;
  tags: string[];
  starts_on: string | null;
  due_on: string | null;
  progress: number;
  source: string | null;
  external_url: string | null;
  github_issue_url: string | null;
  backlog_issue_url: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizePriority(value: unknown): TaskPriority {
  return value === "low" || value === "medium" || value === "high" || value === "urgent" ? value : "medium";
}

export function createTask(input: {
  id: string;
  projectId: string;
  title?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: unknown;
  assigneeUserId?: string | null;
  parentTaskId?: string | null;
  categoryId?: string | null;
  milestoneId?: string | null;
  tags?: unknown;
  startsOn?: string | null;
  dueOn?: string | null;
  progress?: number | null;
  source?: string | null;
  externalUrl?: string | null;
  githubIssueUrl?: string | null;
  backlogIssueUrl?: string | null;
  now: string;
}): Task {
  return {
    id: input.id,
    project_id: input.projectId,
    title: input.title?.trim() || "Untitled task",
    description: input.description || null,
    status: input.status || "todo",
    priority: normalizePriority(input.priority),
    assignee_user_id: input.assigneeUserId || null,
    parent_task_id: input.parentTaskId || null,
    category_id: input.categoryId || null,
    milestone_id: input.milestoneId || null,
    tags: normalizeTags(input.tags),
    starts_on: input.startsOn || null,
    due_on: input.dueOn || null,
    progress: clamp(input.progress ?? 0, 0, 100),
    source: input.source || "app",
    external_url: input.externalUrl || null,
    github_issue_url: input.githubIssueUrl || null,
    backlog_issue_url: input.backlogIssueUrl || null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(raw.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
