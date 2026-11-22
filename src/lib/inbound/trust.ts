import type { EmailTrust } from "./types";
import { domainIs, parseSender } from "./parse/text";
import { systemOfSender } from "./parse/systems";
import { companyKey } from "./match";

// Addresses are guessable, so a change goes through on its own only when the mail provably came
// from the person's own Gmail or from a hiring sender that signed it. Anything else waits in Check this.

export type MailAuth = {
  from: string;
  envelopeFrom: string;
  headers: Readonly<Record<string, string>>;
  auth: { dkim: readonly string[]; arc: readonly string[] };
};

export type TrustInput = MailAuth & {
  // Gmail addresses the person confirmed, and the email they sign in with.
  sources: readonly string[];
  accountEmail: string;
  // The company read in the email, and the companies on the board.
  companies: readonly string[];
};

const GOOGLE = ["google.com", "gmail.com", "googlemail.com"];

// Scheduling and test services that send for employers.
const HIRING_SERVICES = [
  "calendly.com",
  "goodtime.io",
  "gem.com",
  "hackerrank.com",
  "hackerrankforwork.com",
  "codility.com",
  "codesignal.com",
  "hackerearth.com",
  "mettl.com",
  "testgorilla.com",
  "hirevue.com",
];

export function registrable(domain: string): string {
  const labels = domain.toLowerCase().split(".").filter(Boolean);
  const second = labels.at(-2) ?? "";
  const keep = /^(?:co|com|org|net|ac|gov|edu)$/.test(second) && labels.length > 2 ? 3 : 2;
  return labels.slice(-keep).join(".");
}

function signedFor(domain: string, dkim: readonly string[]): boolean {
  const own = registrable(domain);
  return dkim.some((signer) => registrable(signer) === own);
}

// Gmail's own forward: Google sealed it, X-Forwarded-For names the mailbox, and the envelope agrees.
export function forwardedFrom(mail: MailAuth): string | null {
  const named = (mail.headers["x-forwarded-for"] ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!named.includes("@")) return null;
  const envelope = /^<?([^+@\s]+)\+caf_=[^@\s]*@([^>\s]+)>?$/i.exec(mail.envelopeFrom.trim());
  const envelopeSource = envelope ? `${envelope[1]}@${envelope[2]}`.toLowerCase() : null;
  if (envelopeSource !== null && envelopeSource !== named) return null;
  const sealed = mail.auth.arc.some((domain) => domainIs(domain, GOOGLE));
  const signed =
    envelopeSource !== null && mail.auth.dkim.some((domain) => domainIs(domain, GOOGLE));
  return sealed || signed ? named : null;
}

function employerDomain(domain: string, companies: readonly string[]): boolean {
  const label = registrable(domain).split(".")[0] ?? "";
  return companies.some((company) => {
    const key = companyKey(company).replace(/\s+/g, "");
    return key.length >= 3 && (label === key || label === `${key}careers` || label === `${key}hr`);
  });
}

export function trustOf(input: TrustInput): EmailTrust | null {
  const mine = new Set(
    [...input.sources, input.accountEmail].map((address) => address.toLowerCase()),
  );
  const forwarded = forwardedFrom(input);
  if (forwarded && mine.has(forwarded)) return "source";
  const sender = parseSender(input.from);
  if (!sender.domain || !signedFor(sender.domain, input.auth.dkim)) return null;
  // Forwarded by hand from the person's own mailbox, which signed it.
  if (mine.has(sender.address)) return "source";
  const hiring =
    systemOfSender(sender) !== null ||
    domainIs(sender.domain, HIRING_SERVICES) ||
    employerDomain(sender.domain, input.companies);
  return hiring ? "sender" : null;
}

// Forwarding from a Gmail the person hasn't confirmed: that mailbox's mail isn't theirs to see.
export function forwardedByStranger(input: TrustInput): boolean {
  const forwarded = forwardedFrom(input);
  if (!forwarded) return false;
  const mine = new Set(
    [...input.sources, input.accountEmail].map((address) => address.toLowerCase()),
  );
  return !mine.has(forwarded);
}
