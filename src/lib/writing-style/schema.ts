export const WRITING_TONES = ["natural", "warm", "direct", "formal"] as const;
export type WritingTone = (typeof WRITING_TONES)[number];

export const WRITING_LENGTHS = ["standard", "shorter"] as const;
export type WritingLength = (typeof WRITING_LENGTHS)[number];

export const SPELLINGS = ["us", "uk"] as const;
export type Spelling = (typeof SPELLINGS)[number];

export const STYLE_LIMITS = { signOff: 40, notes: 500 } as const;

export type WritingStyle = {
  tone: WritingTone;
  length: WritingLength;
  spelling: Spelling;
  signOff: string;
  notes: string;
  updatedAt: number | null;
};

export type WritingStyleBody = Omit<WritingStyle, "updatedAt">;

export const DEFAULT_WRITING_STYLE: WritingStyle = {
  tone: "natural",
  length: "standard",
  spelling: "us",
  signOff: "",
  notes: "",
  updatedAt: null,
};

type Choice = { label: string; hint: string };

export const TONE_CHOICES: Record<WritingTone, Choice> = {
  natural: { label: "Natural", hint: "Plain and friendly, like a careful person writes." },
  warm: { label: "Warm", hint: "Friendly and personal, still professional." },
  direct: { label: "Direct", hint: "Short sentences, straight to the point." },
  formal: { label: "Formal", hint: "Polished and traditional, no contractions." },
};

export const LENGTH_CHOICES: Record<WritingLength, Choice> = {
  standard: { label: "Standard", hint: "About 200 words for a letter, 120 for a message." },
  shorter: { label: "Shorter", hint: "About 140 words for a letter, 80 for a message." },
};

export const SPELLING_CHOICES: Record<Spelling, Choice> = {
  us: { label: "US English", hint: "organize, color, résumé" },
  uk: { label: "UK English", hint: "organise, colour, CV" },
};

export function isDefaultStyle(style: WritingStyleBody): boolean {
  return (
    style.tone === DEFAULT_WRITING_STYLE.tone &&
    style.length === DEFAULT_WRITING_STYLE.length &&
    style.spelling === DEFAULT_WRITING_STYLE.spelling &&
    style.signOff.trim() === "" &&
    style.notes.trim() === ""
  );
}

// A short summary for hints, such as "Warm · Shorter · UK English · your notes".
export type StyleSummaryWords = {
  tones: Record<WritingTone, string>;
  lengths: Record<WritingLength, string>;
  spellings: Record<Spelling, string>;
  notes: string;
  join: string;
};

const ENGLISH_SUMMARY: StyleSummaryWords = {
  tones: { natural: "Natural", warm: "Warm", direct: "Direct", formal: "Formal" },
  lengths: { standard: "Standard", shorter: "Shorter" },
  spellings: { us: "US English", uk: "UK English" },
  notes: "your notes",
  join: " · ",
};

export function styleSummary(
  style: WritingStyleBody,
  words: StyleSummaryWords = ENGLISH_SUMMARY,
): string {
  const parts: string[] = [words.tones[style.tone]];
  if (style.length !== "standard") parts.push(words.lengths[style.length]);
  if (style.spelling !== "us") parts.push(words.spellings[style.spelling]);
  if (style.notes.trim()) parts.push(words.notes);
  return parts.join(words.join);
}

export type WritingStyleResponse = { ok: true; style: WritingStyle };
