export function createApiToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `pfl_${arrayBufferToHex(bytes.buffer)}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return arrayBufferToHex(digest);
}

export async function verifyGitHubSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = `sha256=${arrayBufferToHex(digest)}`;
  return timingSafeEqual(expected, signature);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
