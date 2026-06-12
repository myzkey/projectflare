import type { WikiPage, WikiRevision } from "../../../../../core/src/domain/wiki";
import type { WikiPageUpdatePatch, WikiRepository, WikiUseCasePorts } from "../../../../../core/src/ports/wiki";
import type { Env } from "../env";
import { slugify } from "../ids";

export function createWikiUseCasePorts(env: Env): WikiUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    wiki: createD1WikiRepository(env),
  };
}

export function createD1WikiRepository(env: Env): WikiRepository {
  return {
    listPages: async (projectId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id, created_at, updated_at
         FROM wiki_pages
         WHERE project_id = ?
         ORDER BY updated_at DESC`,
      )
        .bind(projectId)
        .all<WikiPage>();
      return results;
    },
    findPage: async (pageId) => {
      if (!env.DB) return null;
      return env.DB.prepare(
        `SELECT id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id, created_at, updated_at
         FROM wiki_pages
         WHERE id = ?`,
      )
        .bind(pageId)
        .first<WikiPage>();
    },
    createPage: async (page, revision) => {
      if (!env.DB) return;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO wiki_pages (
             id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          page.id,
          page.project_id,
          page.parent_page_id,
          page.title,
          slugify(page.slug),
          page.body_markdown,
          page.created_by_user_id,
          page.updated_by_user_id,
        ),
        env.DB.prepare(
          `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
           VALUES (?, ?, ?, ?)`,
        ).bind(revision.id, revision.wiki_page_id, revision.body_markdown, revision.author_user_id),
      ]);
    },
    updatePage: async (pageId, patch: WikiPageUpdatePatch, revision) => {
      if (!env.DB) return;
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE wiki_pages
           SET title = ?, slug = ?, body_markdown = ?, parent_page_id = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        ).bind(
          patch.title,
          slugify(patch.slug),
          patch.body_markdown,
          patch.parent_page_id,
          patch.updated_by_user_id,
          pageId,
        ),
        env.DB.prepare(
          `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
           VALUES (?, ?, ?, ?)`,
        ).bind(revision.id, revision.wiki_page_id, revision.body_markdown, revision.author_user_id),
      ]);
    },
    listRevisions: async (pageId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT r.*, u.name AS author_name
         FROM wiki_revisions r
         LEFT JOIN users u ON u.id = r.author_user_id
         WHERE r.wiki_page_id = ?
         ORDER BY r.created_at DESC`,
      )
        .bind(pageId)
        .all<WikiRevision>();
      return results;
    },
  };
}
