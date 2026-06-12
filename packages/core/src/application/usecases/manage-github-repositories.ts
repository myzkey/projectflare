import { ApplicationError } from "../../domain/errors";
import type { GitHubRepository } from "../../domain/github";
import type { GitHubRepositoryUseCasePorts } from "../../ports/github-repositories";

export async function listGitHubRepositoriesUseCase(
  workspaceId: string,
  ports: GitHubRepositoryUseCasePorts,
): Promise<GitHubRepository[]> {
  return ports.repositories.listRepositories(workspaceId);
}

export async function createGitHubRepositoryUseCase(
  input: {
    workspaceId: string;
    projectId?: string | null;
    owner?: string | null;
    name?: string | null;
    repositoryUrl?: string | null;
  },
  ports: GitHubRepositoryUseCasePorts,
): Promise<GitHubRepository> {
  const owner = input.owner?.trim();
  const name = input.name?.trim();
  if (!owner || !name) throw new ApplicationError("github_owner_and_name_required", 400);

  const integrationId = await ports.repositories.ensureIntegration(input.workspaceId);
  const repository: GitHubRepository = {
    id: ports.ids.create(),
    github_integration_id: integrationId,
    project_id: input.projectId || null,
    owner,
    name,
    repository_url: input.repositoryUrl?.trim() || `https://github.com/${owner}/${name}`,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  await ports.repositories.upsertRepository(repository);
  if (repository.project_id) {
    await ports.repositories.linkProjectRepository(repository.project_id, repository.repository_url);
  }
  return repository;
}
