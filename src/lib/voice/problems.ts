import type { Messages } from "@/i18n/messages";
import EN_UI from "@/i18n/messages/en/ui";

export type VoiceProblemCode =
  "mic-blocked" | "no-mic" | "no-speech" | "offline" | "sign-in" | "too-many" | "failed";
export type VoiceProblem = { code: VoiceProblemCode; message?: string };

export type VoiceProblemCopy = { title: string; description: string };

export type VoiceProblemWords = Messages["ui"]["voice"]["problems"];

// A server message (sign-in, too many) is already in the reader's language, so it wins.
export function voiceProblemCopy(
  { code, message }: VoiceProblem,
  words: VoiceProblemWords = EN_UI.voice.problems,
): VoiceProblemCopy {
  switch (code) {
    case "mic-blocked":
      return words.micBlocked;
    case "no-mic":
      return words.noMic;
    case "no-speech":
      return words.noSpeech;
    case "offline":
      return words.offline;
    case "sign-in":
      return { title: words.signIn.title, description: message ?? words.signIn.description };
    case "too-many":
      return { title: words.tooMany.title, description: message ?? words.tooMany.description };
    case "failed":
      return words.failed;
  }
}
