import { SUBADDRESS_DOMAIN, SUBADDRESS_LOCAL, type AddressShape } from "./config";
import { handleProblem } from "./handle";

export type AddressParts = { before: string; after: string };

export function addressParts(shape: AddressShape): AddressParts {
  return shape.style === "domain"
    ? { before: "", after: `@${shape.domain}` }
    : { before: `${SUBADDRESS_LOCAL}+`, after: `@${shape.domain}` };
}

export function addressOf(handle: string, shape: AddressShape): string {
  const { before, after } = addressParts(shape);
  return `${before}${handle}${after}`;
}

// Both styles are read whichever one is shown, so switching styles never strands a Gmail filter.
export function handleOfRecipient(recipient: string, shape: AddressShape): string | null {
  const bare = recipient.trim().replace(/^<|>$/g, "").toLowerCase();
  const at = bare.lastIndexOf("@");
  if (at < 1) return null;
  const local = bare.slice(0, at);
  const domain = bare.slice(at + 1);
  const sub = new Set([SUBADDRESS_DOMAIN, shape.domain]);
  let handle: string | null = null;
  if (local.startsWith(`${SUBADDRESS_LOCAL}+`) && sub.has(domain))
    handle = local.slice(SUBADDRESS_LOCAL.length + 1);
  else if (shape.style === "domain" && domain === shape.domain)
    handle = local.split("+")[0] ?? null;
  return handle && handleProblem(handle) !== "shape" && handle.length <= 30 ? handle : null;
}
