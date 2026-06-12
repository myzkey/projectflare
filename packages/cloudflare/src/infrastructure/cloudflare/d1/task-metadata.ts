import type { Env } from "../env";
import { slugify, stableId } from "../ids";

export async function resolveTaskCategoryId(
  env: Env,
  projectId: string,
  name: string | null | undefined,
): Promise<string | null> {
  const normalized = name?.trim();
  if (!normalized || !env.DB) return null;

  const existing = await env.DB.prepare("SELECT id FROM task_categories WHERE project_id = ? AND name = ?")
    .bind(projectId, normalized)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO task_categories (id, project_id, name) VALUES (?, ?, ?)")
    .bind(id, projectId, normalized)
    .run();
  return id;
}

export async function resolveTaskMilestoneId(
  env: Env,
  projectId: string,
  name: string | null | undefined,
  dueOn: string | null | undefined,
): Promise<string | null> {
  const normalized = name?.trim();
  if (!normalized || !env.DB) return null;

  const existing = await env.DB.prepare("SELECT id FROM task_milestones WHERE project_id = ? AND name = ?")
    .bind(projectId, normalized)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO task_milestones (id, project_id, name, due_on) VALUES (?, ?, ?, ?)")
    .bind(id, projectId, normalized, dueOn || null)
    .run();
  return id;
}

export async function resolveTaskAssigneeId(env: Env, nameOrEmail: string | null | undefined): Promise<string | null> {
  const normalized = nameOrEmail?.trim();
  if (!normalized || !env.DB) return null;

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ? OR name = ? ORDER BY created_at ASC LIMIT 1",
  )
    .bind(normalized, normalized)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const email = normalized.includes("@") ? normalized : `${slugify(normalized)}@projectflare.local`;
  const name = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  const id = stableId("usr", email);
  await env.DB.prepare("INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)").bind(id, email, name).run();
  return id;
}
