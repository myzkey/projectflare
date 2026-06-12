export type WebhookEndpoint = {
  id: string;
  project_id: string;
  name: string;
  secret_hash: string;
  mapping_json: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type PublicWebhookEndpoint = WebhookEndpoint & {
  token?: string;
  endpoint_url?: string;
};

export type WebhookMapping = {
  source: string;
  defaultPriority: string;
};

export function parseWebhookMapping(mappingJson: string | null): WebhookMapping {
  if (!mappingJson) return { source: "generic_webhook", defaultPriority: "medium" };
  try {
    const parsed = JSON.parse(mappingJson) as Partial<WebhookMapping>;
    return {
      source: stringFrom(parsed.source) ?? "generic_webhook",
      defaultPriority: stringFrom(parsed.defaultPriority) ?? "medium",
    };
  } catch {
    return { source: "generic_webhook", defaultPriority: "medium" };
  }
}

export function stringFrom(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
