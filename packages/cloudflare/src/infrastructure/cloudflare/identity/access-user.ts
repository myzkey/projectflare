import type { Env } from "../env";
import { stableId } from "../ids";

export type AccessUser = {
  id: string;
  email: string;
  name: string;
  group: string | null;
};

export async function getOrCreateAccessUser(request: Request, env: Env): Promise<AccessUser> {
  const email = request.headers.get("CF-Access-Authenticated-User-Email") ?? "local@example.com";
  const name = request.headers.get("CF-Access-Authenticated-User-Name") ?? email.split("@")[0];
  const group = request.headers.get("Cf-Access-Groups")?.split(",")[0]?.trim() || null;
  const id = stableId("usr", email);
  const user = { id, email, name, group };

  if (!env.DB) return user;

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, access_group, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, access_group = excluded.access_group, updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(id, email, name, group)
    .run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role)
     VALUES ('ws_demo', ?, 'owner')`,
  )
    .bind(id)
    .run();

  return user;
}
