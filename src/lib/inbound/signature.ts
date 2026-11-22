import { createHmac, timingSafeEqual } from "node:crypto";

// The Worker's side of this lives in workers/inbound-email/src/sign.ts; change both together.
export const SIGNATURE_HEADER = "x-otto-signature";
export const TIMESTAMP_HEADER = "x-otto-timestamp";
export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

const TIMESTAMP = /^\d{1,12}$/;
const SIGNATURE = /^v1=([0-9a-f]{64})$/;

export type InboundCheck = "valid" | "missing" | "malformed" | "mismatch" | "stale";

export function inboundMac(secret: string, timestamp: string, body: string): Buffer {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
}

export function verifyInbound(
  body: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): InboundCheck {
  const timestamp = headers.get(TIMESTAMP_HEADER);
  const signature = headers.get(SIGNATURE_HEADER);
  if (!timestamp || !signature) return "missing";
  const hex = SIGNATURE.exec(signature.trim())?.[1];
  if (!TIMESTAMP.test(timestamp) || !hex) return "malformed";
  if (!timingSafeEqual(Buffer.from(hex, "hex"), inboundMac(secret, timestamp, body))) {
    return "mismatch";
  }
  // Checked after the MAC, so only a request this secret signed learns that it's late.
  if (Math.abs(now - Number(timestamp) * 1000) > SIGNATURE_TOLERANCE_MS) return "stale";
  return "valid";
}
