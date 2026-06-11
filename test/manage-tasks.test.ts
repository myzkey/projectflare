import { describe, expect, it, vi } from "vitest";
import { createProjectTaskUseCase, updateTaskUseCase } from "../packages/core/src/application/usecases/manage-tasks";
import { ApplicationError } from "../packages/core/src/domain/errors";
import type { Task } from "../packages/core/src/domain/task";
import type { TaskUpdatePatch, TaskUseCasePorts } from "../packages/core/src/ports/tasks";

function createPorts(seedTasks: Task[] = []) {
  const tasks = new Map(seedTasks.map((task) => [task.id, task]));

  const ports: TaskUseCasePorts = {
    ids: {
      create: vi.fn(() => "task_new"),
    },
    clock: {
      now: vi.fn(() => "2026-06-11T00:00:00.000Z"),
    },
    tasks: {
      listByProjectId: vi.fn(async (projectId) => [...tasks.values()].filter((task) => task.project_id === projectId)),
      findById: vi.fn(async (id) => tasks.get(id) ?? null),
      create: vi.fn(async (task) => {
        tasks.set(task.id, task);
      }),
      update: vi.fn(async (id, patch: TaskUpdatePatch) => {
        const existing = tasks.get(id);
        if (!existing) return;
        tasks.set(id, { ...existing, ...patch });
      }),
    },
  };

  return { ports, tasks };
}

describe("task use cases", () => {
  it("normalizes task creation input before persistence", async () => {
    const { ports, tasks } = createPorts();

    const task = await createProjectTaskUseCase(
      {
        projectId: "project_1",
        title: "  Launch checklist  ",
        priority: "urgent",
        progress: 142,
        dueOn: "2026-07-01",
      },
      ports,
    );

    expect(task).toEqual(
      expect.objectContaining({
        id: "task_new",
        project_id: "project_1",
        title: "Launch checklist",
        priority: "urgent",
        progress: 100,
        due_on: "2026-07-01",
      }),
    );
    expect(tasks.get("task_new")).toEqual(task);
  });

  it("updates an existing task using validated fields", async () => {
    const existing: Task = {
      id: "task_1",
      project_id: "project_1",
      title: "Old title",
      description: null,
      status: "todo",
      priority: "medium",
      assignee_user_id: null,
      starts_on: null,
      due_on: null,
      progress: 0,
      source: "app",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: "2026-06-11T00:00:00.000Z",
      updated_at: "2026-06-11T00:00:00.000Z",
    };
    const { ports } = createPorts([existing]);

    const task = await updateTaskUseCase(
      "task_1",
      {
        title: "  New title  ",
        status: "review",
        priority: "invalid",
        progress: -10,
      },
      ports,
    );

    expect(task).toEqual(
      expect.objectContaining({
        title: "New title",
        status: "review",
        priority: "medium",
        progress: 0,
      }),
    );
  });

  it("rejects missing tasks", async () => {
    const { ports } = createPorts();

    await expect(updateTaskUseCase("missing", { title: "Nope" }, ports)).rejects.toEqual(
      new ApplicationError("task_not_found", 404),
    );
  });
});
