import { runInterviewBriefs } from "./cron";
import { dohResolver, verifyAuth, type Resolver } from "./dkim";
import { binary, parseMail } from "./mime";
import { signedHeaders } from "./sign";
import type { Env, IncomingEmail, ScheduledRun } from "./types";

// Mail over this is refused outright; under it, only the first part is read (the text comes first).
export const MAX_MESSAGE_BYTES = 10 * 1024 * 1024;
export const MAX_READ_BYTES = 1024 * 1024;
const TIMEOUT_MS = 20_000;

async function readCapped(
  stream: ReadableStream<Uint8Array>,
  max: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = max - size;
    chunks.push(value.byteLength > room ? value.subarray(0, room) : value);
    size += Math.min(value.byteLength, room);
    if (size >= max) {
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated };
}

// Nothing is stored or logged: the text goes to Otto once, signed, and the Worker forgets it.
export async function handleEmail(
  message: IncomingEmail,
  env: Env,
  send: typeof fetch = fetch,
  now = Date.now(),
  resolve: Resolver = dohResolver(send),
): Promise<void> {
  const domains = env.INBOUND_DOMAINS.split(",").map((domain) => domain.trim().toLowerCase());
  const to = message.to.toLowerCase();
  if (!domains.some((domain) => domain && to.endsWith(`@${domain}`))) {
    message.setReject("Unknown address");
    return;
  }
  if (message.rawSize > MAX_MESSAGE_BYTES) {
    message.setReject("Message too large");
    return;
  }
  const { bytes, truncated } = await readCapped(message.raw, MAX_READ_BYTES);
  const mail = parseMail(bytes);
  // A cut-off message can't pass its body hashes, so it is sent as unverified.
  const auth = truncated ? { dkim: [], arc: [] } : await verifyAuth(binary(bytes), resolve, now);
  const body = JSON.stringify({
    v: 1,
    to: message.to,
    envelopeFrom: message.from,
    auth,
    from: mail.from || message.from,
    subject: mail.subject,
    date: mail.date,
    messageId: mail.messageId,
    headers: mail.headers,
    text: mail.text,
    truncated,
  });
  const response = await send(env.INBOUND_URL, {
    method: "POST",
    headers: await signedHeaders(env.INBOUND_EMAIL_SECRET, body, now),
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.ok) return;
  if (response.status === 404) {
    message.setReject("No such address");
    return;
  }
  if (response.status === 400 || response.status === 413) {
    message.setReject("This message can't be read");
    return;
  }
  // Anything else (a bad secret, a rate limit, Otto down) fails loudly so it shows in the Worker's logs.
  throw new Error(`Otto answered ${response.status}`);
}

const worker = {
  async email(message: IncomingEmail, env: Env): Promise<void> {
    await handleEmail(message, env);
  },
  // Cron Triggers in wrangler.toml: the interview-morning briefs and "How did it go?", hourly.
  async scheduled(_run: ScheduledRun, env: Env): Promise<void> {
    await runInterviewBriefs(env);
  },
};

export default worker;
