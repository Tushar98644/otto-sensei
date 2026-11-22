import { env } from "@/lib/env";
import { log } from "@/lib/log";

export const SUBADDRESS_DOMAIN = "track.ottosensei.com";
// Email Routing has no catch-all on a subdomain, so one rule for this name takes every otto+handle address.
export const SUBADDRESS_LOCAL = "otto";
export const MIN_INBOUND_SECRET_LENGTH = 32;

export type AddressStyle = "subaddress" | "domain";

let warned = false;

// Shared with the Cloudflare Worker: it signs every email it hands over.
export function inboundSigningSecret(): string | null {
  const value = env().INBOUND_EMAIL_SECRET ?? "";
  if (value.length >= MIN_INBOUND_SECRET_LENGTH) return value;
  if (value && !warned) {
    warned = true;
    log.warn("inbound.secret_too_short", { minLength: MIN_INBOUND_SECRET_LENGTH });
  }
  return null;
}

export type AddressShape = { style: AddressStyle; domain: string };

// "subaddress" (the default): otto+handle@track.ottosensei.com. "domain": handle@INBOUND_DOMAIN, for a short domain with a catch-all.
export function addressShape(): AddressShape | null {
  const { INBOUND_ADDRESS_STYLE: style, INBOUND_DOMAIN: domain } = env();
  if (style === "domain") return domain ? { style, domain: domain.toLowerCase() } : null;
  return { style: "subaddress", domain: (domain ?? SUBADDRESS_DOMAIN).toLowerCase() };
}

export function emailTrackingAvailable(): boolean {
  return inboundSigningSecret() !== null && addressShape() !== null;
}
