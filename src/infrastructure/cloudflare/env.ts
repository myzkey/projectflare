import type { ProjectFlareQueueMessage } from "../../ports/queue";

export type Env = {
  DB?: D1Database;
  FILES?: R2Bucket;
  PROJECTFLARE_QUEUE?: Queue<ProjectFlareQueueMessage>;
  GITHUB_WEBHOOK_SECRET?: string;
};
