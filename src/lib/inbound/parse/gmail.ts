import type { Sender } from "./text";

export type GmailRequest = { code: string | null; url: string; source: string | null };

const SUBJECT =
  /gmail forwarding confirmation|forwarding confirmation\s*-\s*receive (?:mail|messages) from/i;
const CODE = /\bconfirmation code:?\s*(\d{6,12})\b|\(#(\d{6,12})\)/i;
// Only Google's own confirm links are shown: a lookalike email can't put anyone's link on the button.
const LINK =
  /https:\/\/(?:mail-settings\.google\.com|mail\.google\.com|isolated\.mail\.google\.com)\/mail\/(?:u\/\d+\/)?vf-[^\s<>"')\]]+/i;

export function gmailConfirmation(
  sender: Sender,
  subject: string,
  text: string,
): GmailRequest | null {
  const fromGoogle = sender.address === "forwarding-noreply@google.com";
  if (!fromGoogle && !SUBJECT.test(subject)) return null;
  const link = LINK.exec(text)?.[0];
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const code = CODE.exec(subject) ?? CODE.exec(text);
  // The mailbox that asked to forward here, so the person can see it's theirs before confirming.
  const source =
    /receive (?:mail|messages) from\s+([^\s@<>]+@[^\s<>]+)/i.exec(subject)?.[1] ??
    /([^\s@<>]+@[^\s<>]+)\s+has requested to automatically forward/i.exec(text)?.[1] ??
    null;
  return {
    code: code?.[1] ?? code?.[2] ?? null,
    url: url.toString(),
    source: source ? source.toLowerCase().replace(/[.,;]+$/, "") : null,
  };
}
