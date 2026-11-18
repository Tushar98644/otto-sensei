import { z } from "zod";
import { SPELLINGS, STYLE_LIMITS, WRITING_LENGTHS, WRITING_TONES } from "./schema";

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export const WritingStyleSchema = z.object({
  tone: z.enum(WRITING_TONES),
  length: z.enum(WRITING_LENGTHS),
  spelling: z.enum(SPELLINGS),
  signOff: z.string().max(STYLE_LIMITS.signOff).transform(oneLine),
  notes: z
    .string()
    .max(STYLE_LIMITS.notes)
    .transform((value) => value.trim()),
});
