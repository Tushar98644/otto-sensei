import { createHmac, timingSafeEqual } from "node:crypto";

// Anyone can put ids in checkout metadata, so the webhook trusts only ids our server signed.
export function signBillingId(id: string, secret: string): string {
  return createHmac("sha256", secret).update(`otto-billing:${id}`).digest("hex");
}

export function verifyBillingId(id: string, sig: unknown, secret: string): boolean {
  if (!secret || typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(signBillingId(id, secret), "hex"), Buffer.from(sig, "hex"));
}
