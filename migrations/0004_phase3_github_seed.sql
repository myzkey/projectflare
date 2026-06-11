INSERT OR IGNORE INTO github_integrations (id, workspace_id)
VALUES ('github_integration_demo', 'ws_demo');

INSERT OR IGNORE INTO github_repositories (id, github_integration_id, project_id, owner, name, repository_url)
VALUES (
  'github_repo_demo',
  'github_integration_demo',
  'prj_launch',
  'example',
  'projectflare',
  'https://github.com/example/projectflare'
);
