INSERT OR IGNORE INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
VALUES (
  'wiki_revision_initial_scope',
  'wiki_overview',
  '# MVP Scope

ProjectFlare starts as a Cloudflare-only project OS: task board, gantt timeline, markdown wiki, GitHub/webhook ingestion, and an MCP-friendly API surface.',
  NULL
);
