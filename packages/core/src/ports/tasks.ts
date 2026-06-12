import type { Task } from "../domain/task";

export type TaskCreateInput = {
  projectId: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: unknown;
  assigneeUserId?: string | null;
  startsOn?: string | null;
  dueOn?: string | null;
  progress?: number | null;
  parentTaskId?: string | null;
  categoryId?: string | null;
  milestoneId?: string | null;
  tags?: unknown;
  source?: string | null;
  externalUrl?: string | null;
  githubIssueUrl?: string | null;
  backlogIssueUrl?: string | null;
};

export type TaskUpdateInput = {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: unknown;
  assigneeUserId?: string | null;
  startsOn?: string | null;
  dueOn?: string | null;
  progress?: number | null;
  parentTaskId?: string | null;
  categoryId?: string | null;
  milestoneId?: string | null;
  tags?: unknown;
};

export type TaskUpdatePatch = {
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  assignee_user_id: string | null;
  starts_on: string | null;
  due_on: string | null;
  progress: number;
  parent_task_id: string | null;
  category_id: string | null;
  milestone_id: string | null;
  tags: string[];
};

export type TaskRepository = {
  listByProjectId(projectId: string): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(task: Task): Promise<void>;
  update(id: string, patch: TaskUpdatePatch): Promise<void>;
};

export type TaskUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  tasks: TaskRepository;
};
