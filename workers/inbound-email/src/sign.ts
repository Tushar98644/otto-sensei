// Otto's side of this lives in src/lib/inbound/signature.ts; change both together.
export const SIGNATURE_HEADER = "x-otto-signature";
export const TIMESTAMP_HEADER = "x-otto-timestamp";

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 over "<unix seconds>.<body>", sent as "v1=<hex>".
export async function sign(secret: string, timestamp: number, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  return `v1=${hex(mac)}`;
}

export async function signedHeaders(
  secret: string,
  body: string,
  now = Date.now(),
): Promise<Record<string, string>> {
  const timestamp = Math.floor(now / 1000);
  return {
    "content-type": "application/json",
    [TIMESTAMP_HEADER]: String(timestamp),
    [SIGNATURE_HEADER]: await sign(secret, timestamp, body),
  };
}
