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
  startsOn?: string | null;
  dueOn?: string | null;
  progress?: number | null;
};

export type TaskUpdatePatch = {
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  starts_on: string | null;
  due_on: string | null;
  progress: number;
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
