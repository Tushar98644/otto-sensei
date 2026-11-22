import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resetEnvForTests } from "@/lib/env";
import { signedHeaders } from "../../../workers/inbound-email/src/sign";
import type { MailInput } from "./parse";

export const TEST_SIGNING_SECRET = "inbound-signing-secret-for-tests-only-0123456789";

const FIXTURES = fileURLToPath(new URL("./parse/fixtures", import.meta.url));

export function useInboundSecrets(on = true): void {
  if (on) process.env.INBOUND_EMAIL_SECRET = TEST_SIGNING_SECRET;
  else delete process.env.INBOUND_EMAIL_SECRET;
  resetEnvForTests();
}

// A fixture is the headers the Worker passes on, a blank line, then the text it made of the mail.
export function loadFixture(name: string): MailInput & { messageId: string | null } {
  const raw = readFileSync(path.join(FIXTURES, name), "utf8");
  const split = raw.indexOf("\n\n");
  const headers: Record<string, string> = {};
  for (const line of raw.slice(0, split).split("\n")) {
    const colon = line.indexOf(":");
    headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  const { from = "", subject = "", date = null, "message-id": messageId = null, ...rest } = headers;
  return { from, subject, date, messageId, headers: rest, text: raw.slice(split + 2) };
}

export type WorkerAuth = {
  envelopeFrom?: string;
  dkim?: string[];
  arc?: string[];
};

// What the Worker sends for Gmail's own filter forward from this mailbox: Google's ARC seal and its +caf_ envelope.
export function gmailForward(mailbox: string, to: string): WorkerAuth {
  const [local, domain] = mailbox.split("@");
  return { envelopeFrom: `${local}+caf_=${to.replace("@", "=")}@${domain}`, arc: ["google.com"] };
}

// Built and signed the way the Worker does it, with the Worker's own signing code.
export async function inboundRequest(
  to: string,
  mail: MailInput & { messageId?: string | null },
  {
    now = Date.now(),
    secret = TEST_SIGNING_SECRET,
    auth = {},
  }: { now?: number; secret?: string; auth?: WorkerAuth } = {},
): Promise<Request> {
  const body = JSON.stringify({
    v: 1,
    to,
    envelopeFrom: auth.envelopeFrom ?? "",
    auth: { dkim: auth.dkim ?? [], arc: auth.arc ?? [] },
    from: mail.from,
    subject: mail.subject,
    date: mail.date,
    messageId: mail.messageId ?? `<${crypto.randomUUID()}@test>`,
    headers: mail.headers,
    text: mail.text,
    truncated: false,
  });
  return new Request("http://localhost/api/inbound/email", {
    method: "POST",
    headers: await signedHeaders(secret, body, now),
    body,
  });
}
