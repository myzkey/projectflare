import type { GitHubRepository } from "../domain/github";

export type GitHubRepositoryStore = {
  listRepositories(workspaceId: string): Promise<GitHubRepository[]>;
  ensureIntegration(workspaceId: string): Promise<string>;
  upsertRepository(repository: GitHubRepository): Promise<void>;
  linkProjectRepository(projectId: string, repositoryUrl: string): Promise<void>;
};

export type GitHubRepositoryUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  repositories: GitHubRepositoryStore;
};
