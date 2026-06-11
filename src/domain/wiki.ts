export type WikiPage = {
  id: string;
  project_id: string;
  parent_page_id: string | null;
  title: string;
  slug: string;
  body_markdown: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WikiRevision = {
  id: string;
  wiki_page_id: string;
  body_markdown: string;
  author_user_id: string | null;
  author_name?: string | null;
  created_at: string;
};
