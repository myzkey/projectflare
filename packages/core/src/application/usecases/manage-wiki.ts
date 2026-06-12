import { ApplicationError } from "../../domain/errors";
import type { WikiPage, WikiRevision } from "../../domain/wiki";
import type { WikiUseCasePorts } from "../../ports/wiki";

export async function listWikiPagesUseCase(projectId: string, ports: WikiUseCasePorts): Promise<WikiPage[]> {
  return ports.wiki.listPages(projectId);
}

export async function getWikiPageUseCase(pageId: string, ports: WikiUseCasePorts): Promise<WikiPage | null> {
  return ports.wiki.findPage(pageId);
}

export async function createWikiPageUseCase(
  input: {
    projectId: string;
    authorUserId: string;
    title?: string | null;
    slug?: string | null;
    bodyMarkdown?: string | null;
    parentPageId?: string | null;
  },
  ports: WikiUseCasePorts,
): Promise<WikiPage> {
  const title = input.title?.trim() || "Untitled page";
  const page: WikiPage = {
    id: ports.ids.create(),
    project_id: input.projectId,
    parent_page_id: input.parentPageId || null,
    title,
    slug: input.slug?.trim() || title,
    body_markdown: input.bodyMarkdown || "",
    created_by_user_id: input.authorUserId,
    updated_by_user_id: input.authorUserId,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };
  const revision = createRevision(page.id, page.body_markdown, input.authorUserId, ports);

  await ports.wiki.createPage(page, revision);
  return page;
}

export async function updateWikiPageUseCase(
  pageId: string,
  input: {
    authorUserId: string;
    title?: string | null;
    slug?: string | null;
    bodyMarkdown?: string | null;
    parentPageId?: string | null;
  },
  ports: WikiUseCasePorts,
): Promise<WikiPage> {
  const existing = await ports.wiki.findPage(pageId);
  if (!existing) throw new ApplicationError("wiki_page_not_found", 404);

  const title = input.title?.trim() || existing.title;
  const bodyMarkdown = input.bodyMarkdown ?? existing.body_markdown;
  const patch = {
    title,
    slug: input.slug?.trim() || existing.slug,
    body_markdown: bodyMarkdown,
    parent_page_id: input.parentPageId ?? existing.parent_page_id,
    updated_by_user_id: input.authorUserId,
  };
  const revision = createRevision(pageId, bodyMarkdown, input.authorUserId, ports);

  await ports.wiki.updatePage(pageId, patch, revision);
  const updated = await ports.wiki.findPage(pageId);
  if (!updated) throw new ApplicationError("wiki_page_not_found", 404);
  return updated;
}

export async function listWikiRevisionsUseCase(pageId: string, ports: WikiUseCasePorts): Promise<WikiRevision[]> {
  return ports.wiki.listRevisions(pageId);
}

function createRevision(
  pageId: string,
  bodyMarkdown: string,
  authorUserId: string,
  ports: WikiUseCasePorts,
): WikiRevision {
  return {
    id: ports.ids.create(),
    wiki_page_id: pageId,
    body_markdown: bodyMarkdown,
    author_user_id: authorUserId,
    created_at: ports.clock.now(),
  };
}
