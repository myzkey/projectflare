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
      listStatuses: vi.fn(async (projectId) => [
        {
          id: "todo",
          project_id: projectId,
          name: "Todo",
          color: "#64748b",
          position: 1,
          is_done: 0,
          is_archived: 0,
          created_at: "2026-06-11T00:00:00.000Z",
          updated_at: "2026-06-11T00:00:00.000Z",
        },
        {
          id: "review",
          project_id: projectId,
          name: "Review",
          color: "#d97706",
          position: 2,
          is_done: 0,
          is_archived: 0,
          created_at: "2026-06-11T00:00:00.000Z",
          updated_at: "2026-06-11T00:00:00.000Z",
        },
      ]),
      createStatus: vi.fn(async () => undefined),
      updateStatus: vi.fn(async () => undefined),
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
        categoryId: "cat_delivery",
        milestoneId: "ms_launch",
        tags: " launch, qa, launch ",
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
        category_id: "cat_delivery",
        milestone_id: "ms_launch",
        tags: ["launch", "qa"],
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
      parent_task_id: null,
      category_id: null,
      milestone_id: null,
      tags: [],
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

  it("creates a child task when the parent belongs to the same project", async () => {
    const parent = taskFixture({ id: "task_parent", project_id: "project_1" });
    const { ports, tasks } = createPorts([parent]);

    const task = await createProjectTaskUseCase(
      {
        projectId: "project_1",
        title: "Child task",
        parentTaskId: "task_parent",
      },
      ports,
    );

    expect(task.parent_task_id).toBe("task_parent");
    expect(tasks.get("task_new")?.parent_task_id).toBe("task_parent");
  });

  it("rejects a parent task from another project", async () => {
    const otherProjectParent = taskFixture({ id: "task_other", project_id: "project_2" });
    const { ports } = createPorts([otherProjectParent]);

    await expect(
      createProjectTaskUseCase(
        {
          projectId: "project_1",
          title: "Invalid child",
          parentTaskId: "task_other",
        },
        ports,
      ),
    ).rejects.toEqual(new ApplicationError("parent_task_not_found", 404));
  });

  it("rejects nesting deeper than three levels", async () => {
    const root = taskFixture({ id: "task_root", project_id: "project_1" });
    const child = taskFixture({ id: "task_child", project_id: "project_1", parent_task_id: "task_root" });
    const grandchild = taskFixture({ id: "task_grandchild", project_id: "project_1", parent_task_id: "task_child" });
    const { ports } = createPorts([root, child, grandchild]);

    await expect(
      createProjectTaskUseCase(
        {
          projectId: "project_1",
          title: "Too deep",
          parentTaskId: "task_grandchild",
        },
        ports,
      ),
    ).rejects.toEqual(new ApplicationError("task_nesting_limit_exceeded", 400));
  });

  it("rejects moving a task under one of its descendants", async () => {
    const root = taskFixture({ id: "task_root", project_id: "project_1" });
    const child = taskFixture({ id: "task_child", project_id: "project_1", parent_task_id: "task_root" });
    const { ports } = createPorts([root, child]);

    await expect(updateTaskUseCase("task_root", { parentTaskId: "task_child" }, ports)).rejects.toEqual(
      new ApplicationError("task_parent_cycle", 400),
    );
  });

  it("clears a parent task when updated with null", async () => {
    const root = taskFixture({ id: "task_root", project_id: "project_1" });
    const child = taskFixture({ id: "task_child", project_id: "project_1", parent_task_id: "task_root" });
    const { ports } = createPorts([root, child]);

    const updated = await updateTaskUseCase("task_child", { parentTaskId: null }, ports);

    expect(updated.parent_task_id).toBeNull();
  });

  it("updates taxonomy metadata independently from task hierarchy", async () => {
    const existing = taskFixture({ id: "task_1", project_id: "project_1" });
    const { ports } = createPorts([existing]);

    const updated = await updateTaskUseCase(
      "task_1",
      {
        assigneeUserId: "usr_owner",
        categoryId: "cat_product",
        milestoneId: "ms_beta",
        tags: ["frontend", "frontend", "qa"],
      },
      ports,
    );

    expect(updated).toEqual(
      expect.objectContaining({
        category_id: "cat_product",
        assignee_user_id: "usr_owner",
        milestone_id: "ms_beta",
        tags: ["frontend", "qa"],
      }),
    );
  });
});

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: "task_1",
    project_id: "project_1",
    title: "Task",
    description: null,
    status: "todo",
    priority: "medium",
    assignee_user_id: null,
    parent_task_id: null,
    category_id: null,
    milestone_id: null,
    tags: [],
    starts_on: null,
    due_on: null,
    progress: 0,
    source: "app",
    external_url: null,
    github_issue_url: null,
    backlog_issue_url: null,
    created_at: "2026-06-11T00:00:00.000Z",
    updated_at: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}
