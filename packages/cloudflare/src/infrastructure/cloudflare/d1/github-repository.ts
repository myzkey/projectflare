import type { GitHubRepository } from "../../../../../core/src/domain/github";
import type {
  GitHubRepositoryStore,
  GitHubRepositoryUseCasePorts,
} from "../../../../../core/src/ports/github-repositories";
import type { Env } from "../env";

export function createGitHubRepositoryUseCasePorts(env: Env): GitHubRepositoryUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    repositories: createD1GitHubRepositoryStore(env),
  };
}

export function createD1GitHubRepositoryStore(env: Env): GitHubRepositoryStore {
  return {
    listRepositories: async (workspaceId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT r.*
         FROM github_repositories r
         JOIN github_integrations i ON i.id = r.github_integration_id
         WHERE i.workspace_id = ?
         ORDER BY r.updated_at DESC`,
      )
        .bind(workspaceId)
        .all<GitHubRepository>();
      return results;
    },
    ensureIntegration: async (workspaceId) => {
      if (!env.DB) return "github_integration_demo";
      const existing = await env.DB.prepare("SELECT id FROM github_integrations WHERE workspace_id = ? LIMIT 1")
        .bind(workspaceId)
        .first<{ id: string }>();
      if (existing) return existing.id;

      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO github_integrations (id, workspace_id) VALUES (?, ?)")
        .bind(id, workspaceId)
        .run();
      return id;
    },
    upsertRepository: async (repository) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `INSERT INTO github_repositories (id, github_integration_id, project_id, owner, name, repository_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(github_integration_id, owner, name) DO UPDATE SET
           project_id = excluded.project_id,
           repository_url = excluded.repository_url,
           updated_at = CURRENT_TIMESTAMP`,
      )
        .bind(
          repository.id,
          repository.github_integration_id,
          repository.project_id,
          repository.owner,
          repository.name,
          repository.repository_url,
        )
        .run();
    },
    linkProjectRepository: async (projectId, repositoryUrl) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `UPDATE projects
         SET github_repository_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(repositoryUrl, projectId)
        .run();
    },
  };
}
