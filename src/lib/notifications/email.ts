import { Resend } from "resend";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  // ASCII letters, digits, "_" and "-" only.
  tags?: { name: string; value: string }[];
};

// refused: Resend answered that it took none of the batch, so nothing went out and it can be tried again.
export type BatchResult = { sent: number; failed: number; refused?: true };

export type EmailSender = {
  // The same idempotency key within 24 hours never sends twice, so a retry is safe.
  sendBatch(messages: EmailMessage[], idempotencyKey: string): Promise<BatchResult>;
};

export const EMAIL_BATCH_MAX = 100;
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 1_500;

type EmailConfig = { apiKey: string; from: string };

function emailConfig(): EmailConfig | null {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  return RESEND_API_KEY && EMAIL_FROM ? { apiKey: RESEND_API_KEY, from: EMAIL_FROM } : null;
}

export function emailConfigured(): boolean {
  return emailConfig() !== null;
}

// The sender's postal address for the footer of optional emails, which US law asks of promotional ones.
export function senderPostalAddress(): string | null {
  const address = process.env.EMAIL_POSTAL_ADDRESS?.replace(/\s+/g, " ").trim().slice(0, 200);
  return address || null;
}

type Attempt =
  | { ok: true; result: BatchResult }
  | { ok: false; retry: boolean; refused: boolean; reason: string };

export function emailSender(): EmailSender | null {
  const config = emailConfig();
  if (!config) return null;
  const { apiKey, from } = config;
  const resend = new Resend(apiKey);

  async function attempt(messages: EmailMessage[], idempotencyKey: string): Promise<Attempt> {
    try {
      const { data, error } = await resend.batch.send(
        messages.map((message) => ({ from, ...message })),
        { idempotencyKey, batchValidation: "permissive", signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      if (error) {
        const status = error.statusCode ?? 0;
        // A 409 can mean an earlier try with this key is still going through.
        const refused = status >= 400 && status < 500 && status !== 409;
        const retry = status === 0 || status === 429 || status >= 500;
        return { ok: false, retry, refused, reason: error.name };
      }
      const errors = data.errors ?? [];
      // Not the messages themselves: they can quote the address they rejected.
      if (errors.length > 0) log.warn("email.batch_rejected_some", { failed: errors.length });
      const failed = errors.length;
      return { ok: true, result: { sent: data.data.length, failed } };
    } catch (error) {
      log.warn("email.batch_request_failed", {}, error);
      return { ok: false, retry: true, refused: false, reason: "network" };
    }
  }

  return {
    async sendBatch(messages, idempotencyKey) {
      if (messages.length === 0) return { sent: 0, failed: 0 };
      if (messages.length > EMAIL_BATCH_MAX) throw new RangeError("sendBatch: too many messages");
      let outcome = await attempt(messages, idempotencyKey);
      let refused = !outcome.ok && outcome.refused;
      if (!outcome.ok && outcome.retry) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        outcome = await attempt(messages, idempotencyKey);
        refused &&= !outcome.ok && outcome.refused;
      }
      if (outcome.ok) return outcome.result;
      log.warn("email.batch_failed", { reason: outcome.reason, messages: messages.length });
      return { sent: 0, failed: messages.length, ...(refused ? { refused: true as const } : {}) };
    },
  };
}
