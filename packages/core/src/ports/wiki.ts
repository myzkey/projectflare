import type { WikiPage, WikiRevision } from "../domain/wiki";

export type WikiRepository = {
  listPages(projectId: string): Promise<WikiPage[]>;
  findPage(pageId: string): Promise<WikiPage | null>;
  createPage(page: WikiPage, revision: WikiRevision): Promise<void>;
  updatePage(pageId: string, patch: WikiPageUpdatePatch, revision: WikiRevision): Promise<void>;
  listRevisions(pageId: string): Promise<WikiRevision[]>;
};

export type WikiPageUpdatePatch = {
  title: string;
  slug: string;
  body_markdown: string;
  parent_page_id: string | null;
  updated_by_user_id: string | null;
};

export type WikiUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  wiki: WikiRepository;
};
