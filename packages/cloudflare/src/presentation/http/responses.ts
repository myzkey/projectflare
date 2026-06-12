const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function jsonError(error: string, status: number): Response {
  return json({ error }, status);
}

export function json(data: unknown, status = 200): Response {
  if (data instanceof Response) return data;
  return new Response(JSON.stringify(camelCaseKeys(data), null, 2), { status, headers: jsonHeaders });
}

export function htmlResponse(markup: string): Response {
  return new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelCaseKeys);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [toCamelCase(key), camelCaseKeys(child)]));
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
