import { z } from "zod";
import { INBOUND_LIMITS } from "./types";

const line = (max: number) => z.string().max(max);

// What the Cloudflare Worker posts: the message as text and a few headers, never the raw mail.
const domains = z.array(z.string().max(253)).max(10).default([]);

export const InboundEmailSchema = z.object({
  v: z.literal(1),
  to: line(320),
  // The SMTP sender, and the DKIM and ARC signatures the Worker checked itself.
  envelopeFrom: line(1_000).default(""),
  auth: z.object({ dkim: domains, arc: domains }).default({ dkim: [], arc: [] }),
  from: line(1_000).default(""),
  subject: line(2_000).default(""),
  date: line(200).nullable().default(null),
  messageId: line(1_000).nullable().default(null),
  text: line(INBOUND_LIMITS.text * 2).default(""),
  headers: z.record(z.string().max(60), line(1_000)).default({}),
  truncated: z.boolean().default(false),
});

export type InboundEmail = z.output<typeof InboundEmailSchema>;

const handleField = z.string().max(60);

export const TrackingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), handle: handleField }),
  z.object({ action: z.literal("handle"), handle: handleField }),
  z.object({ action: z.literal("confirmed") }),
  z.object({ action: z.literal("not_mine") }),
]);

export const EmailActionSchema = z.object({ action: z.enum(["undo", "apply"]) });
