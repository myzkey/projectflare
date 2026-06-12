import { ApplicationError } from "../../domain/errors";
import type { Project, Workspace } from "../../domain/project";
import type { ProjectUseCasePorts } from "../../ports/projects";

export async function listWorkspacesUseCase(ports: ProjectUseCasePorts): Promise<Workspace[]> {
  return ports.projects.listWorkspaces();
}

export async function createWorkspaceUseCase(
  input: { name?: string | null; slug?: string | null; ownerUserId: string },
  ports: ProjectUseCasePorts,
): Promise<Workspace> {
  const name = input.name?.trim() || "Untitled workspace";
  const workspace: Workspace = {
    id: ports.ids.create(),
    name,
    slug: input.slug?.trim() || name,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  await ports.projects.createWorkspace(workspace, input.ownerUserId);
  return workspace;
}

export async function listProjectsUseCase(
  input: { workspaceId?: string },
  ports: ProjectUseCasePorts,
): Promise<Project[]> {
  return ports.projects.listProjects(input.workspaceId);
}

export async function getProjectUseCase(projectId: string, ports: ProjectUseCasePorts): Promise<Project | null> {
  return ports.projects.findProject(projectId);
}

export async function createProjectUseCase(
  input: {
    workspaceId: string;
    ownerUserId: string;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    startsOn?: string | null;
    dueOn?: string | null;
    githubRepositoryUrl?: string | null;
  },
  ports: ProjectUseCasePorts,
): Promise<Project> {
  const project: Project = {
    id: ports.ids.create(),
    workspace_id: input.workspaceId,
    name: input.name?.trim() || "Untitled project",
    description: input.description || null,
    status: input.status || "active",
    starts_on: input.startsOn || null,
    due_on: input.dueOn || null,
    github_repository_url: input.githubRepositoryUrl || null,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  await ports.projects.createProject(project, input.ownerUserId);
  return project;
}

export async function updateProjectUseCase(
  projectId: string,
  input: {
    name?: string | null;
    description?: string | null;
    status?: string | null;
    startsOn?: string | null;
    dueOn?: string | null;
    githubRepositoryUrl?: string | null;
  },
  ports: ProjectUseCasePorts,
): Promise<Project> {
  const existing = await ports.projects.findProject(projectId);
  if (!existing) throw new ApplicationError("project_not_found", 404);

  await ports.projects.updateProject(projectId, {
    name: input.name?.trim() || existing.name,
    description: input.description ?? existing.description,
    status: input.status || existing.status,
    starts_on: input.startsOn ?? existing.starts_on,
    due_on: input.dueOn ?? existing.due_on,
    github_repository_url: input.githubRepositoryUrl ?? existing.github_repository_url,
  });

  const updated = await ports.projects.findProject(projectId);
  if (!updated) throw new ApplicationError("project_not_found", 404);
  return updated;
}
