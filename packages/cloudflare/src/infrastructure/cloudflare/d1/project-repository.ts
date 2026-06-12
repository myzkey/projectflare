import type { Project, Workspace } from "../../../../../core/src/domain/project";
import type {
  ProjectRepository,
  ProjectUpdatePatch,
  ProjectUseCasePorts,
} from "../../../../../core/src/ports/projects";
import type { Env } from "../env";
import { slugify } from "../ids";

export function createProjectUseCasePorts(env: Env): ProjectUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    projects: createD1ProjectRepository(env),
  };
}

export function createD1ProjectRepository(env: Env): ProjectRepository {
  return {
    listWorkspaces: async () => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT *
         FROM workspaces
         ORDER BY created_at DESC`,
      ).all<Workspace>();
      return results;
    },
    createWorkspace: async (workspace, ownerUserId) => {
      if (!env.DB) return;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO workspaces (id, name, slug)
           VALUES (?, ?, ?)`,
        ).bind(workspace.id, workspace.name, slugify(workspace.slug)),
        env.DB.prepare(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES (?, ?, 'owner')`,
        ).bind(workspace.id, ownerUserId),
      ]);
    },
    listProjects: async (workspaceId) => {
      if (!env.DB) return [];
      const query = workspaceId
        ? `SELECT p.*, w.name AS workspace_name
           FROM projects p
           JOIN workspaces w ON w.id = p.workspace_id
           WHERE p.workspace_id = ?
           ORDER BY p.created_at DESC`
        : `SELECT p.*, w.name AS workspace_name
           FROM projects p
           JOIN workspaces w ON w.id = p.workspace_id
           ORDER BY p.created_at DESC`;
      const statement = env.DB.prepare(query);
      const { results } = workspaceId
        ? await statement.bind(workspaceId).all<Project>()
        : await statement.all<Project>();
      return results;
    },
    findProject: async (projectId) => {
      if (!env.DB) return null;
      return env.DB.prepare(
        `SELECT p.*, w.name AS workspace_name
         FROM projects p
         JOIN workspaces w ON w.id = p.workspace_id
         WHERE p.id = ?`,
      )
        .bind(projectId)
        .first<Project>();
    },
    createProject: async (project, ownerUserId) => {
      if (!env.DB) return;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO projects (id, workspace_id, name, description, status, starts_on, due_on, github_repository_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          project.id,
          project.workspace_id,
          project.name,
          project.description,
          project.status,
          project.starts_on,
          project.due_on,
          project.github_repository_url,
        ),
        env.DB.prepare(
          `INSERT INTO project_members (project_id, user_id, role)
           VALUES (?, ?, 'owner')`,
        ).bind(project.id, ownerUserId),
      ]);
    },
    updateProject: async (projectId, patch: ProjectUpdatePatch) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `UPDATE projects
         SET name = ?, description = ?, status = ?, starts_on = ?, due_on = ?, github_repository_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(
          patch.name,
          patch.description,
          patch.status,
          patch.starts_on,
          patch.due_on,
          patch.github_repository_url,
          projectId,
        )
        .run();
    },
  };
}
