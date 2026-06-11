import { normalizePriority, type TaskPriority } from "./task";

export type WebhookMapping = {
  source: string;
  defaultPriority: TaskPriority;
};

export function parseWebhookMapping(mappingJson: string | null): WebhookMapping {
  if (!mappingJson) return { source: "generic_webhook", defaultPriority: "medium" };

  try {
    const parsed = JSON.parse(mappingJson) as { source?: string; defaultPriority?: string };
    return {
      source: parsed.source || "generic_webhook",
      defaultPriority: normalizePriority(parsed.defaultPriority),
    };
  } catch {
    return { source: "generic_webhook", defaultPriority: "medium" };
  }
}

export function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
