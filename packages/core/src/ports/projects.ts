import type { Project, Workspace } from "../domain/project";

export type ProjectRepository = {
  listWorkspaces(): Promise<Workspace[]>;
  createWorkspace(workspace: Workspace, ownerUserId: string): Promise<void>;
  listProjects(workspaceId?: string): Promise<Project[]>;
  findProject(projectId: string): Promise<Project | null>;
  createProject(project: Project, ownerUserId: string): Promise<void>;
  updateProject(projectId: string, patch: ProjectUpdatePatch): Promise<void>;
};

export type ProjectUpdatePatch = {
  name: string;
  description: string | null;
  status: string;
  starts_on: string | null;
  due_on: string | null;
  github_repository_url: string | null;
};

export type ProjectUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  projects: ProjectRepository;
};
