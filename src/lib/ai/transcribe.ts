import { z } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { ErrorBodySchema, statusFailure, thrownFailure, type AICallFields } from "./errors";
import { AIError } from "./types";

const ENDPOINT = "https://openrouter.ai/api/v1/audio/transcriptions";
export const TRANSCRIBE_MODEL = "openai/whisper-large-v3-turbo";
const TIMEOUT_MS = 30_000;

export const AUDIO_FORMATS = ["webm", "mp4", "m4a", "ogg", "mp3", "wav"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

const FORMAT_BY_TYPE: Record<string, AudioFormat> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/mp4": "mp4",
  "video/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
};

export function audioFormat(mimeType: string, fileName = ""): AudioFormat | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const byType = FORMAT_BY_TYPE[base];
  if (byType) return byType;
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return AUDIO_FORMATS.find((format) => format === extension) ?? null;
}

const TranscriptSchema = z.object({
  text: z.string().nullish(),
  usage: z.object({ seconds: z.number().nullish() }).nullish(),
  error: ErrorBodySchema.nullish(),
});

export type Transcript = { text: string; seconds: number | null };

export async function transcribeAudio(audio: Uint8Array, format: AudioFormat): Promise<Transcript> {
  const apiKey = env().OPENROUTER_API_KEY;
  if (!apiKey) throw new AIError("unavailable", "OPENROUTER_API_KEY is not set");
  const fields: AICallFields = { task: "transcribe", model: TRANSCRIBE_MODEL };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TRANSCRIBE_MODEL,
        input_audio: { data: Buffer.from(audio).toString("base64"), format },
        provider: { data_collection: "deny" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw thrownFailure(error, fields).error;
  }

  let raw: string;
  try {
    raw = await res.text();
  } catch (error) {
    throw thrownFailure(error, fields).error;
  }
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {}

  if (!res.ok) {
    const parsed = z.object({ error: ErrorBodySchema }).safeParse(json);
    throw statusFailure(res.status, parsed.success ? parsed.data.error : null, fields).error;
  }
  const parsed = TranscriptSchema.safeParse(json);
  if (!parsed.success) {
    log.warn("ai.malformed_response", fields);
    throw new AIError("unavailable", "The speech-to-text provider sent an unreadable response");
  }
  const { error, text, usage } = parsed.data;
  if (error) {
    const code = Number(error.code);
    const status = Number.isInteger(code) && code >= 400 ? code : 502;
    throw statusFailure(status, error, fields).error;
  }
  const spoken = (text ?? "").trim();
  return { text: isSilenceGuess(spoken) ? "" : spoken, seconds: usage?.seconds ?? null };
}

// Whisper fills silence with stock phrases like "Thank you."
const SILENCE_GUESSES = new Set([
  "thank you",
  "thanks",
  "thanks for watching",
  "thank you for watching",
  "you",
  "bye",
]);

export function isSilenceGuess(text: string): boolean {
  return SILENCE_GUESSES.has(
    text
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim(),
  );
}
