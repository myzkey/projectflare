import type { ProjectFlareQueueMessage } from "../../ports/queue";

export type Env = {
  ASSETS?: Fetcher;
  DB?: D1Database;
  FILES?: R2Bucket;
  PROJECTFLARE_QUEUE?: Queue<ProjectFlareQueueMessage>;
  GITHUB_WEBHOOK_SECRET?: string;
};
