const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function jsonError(error: string, status: number): Response {
  return json({ error }, status);
}

export function json(data: unknown, status = 200): Response {
  if (data instanceof Response) return data;
  return new Response(JSON.stringify(data, null, 2), { status, headers: jsonHeaders });
}

export function htmlResponse(markup: string): Response {
  return new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
