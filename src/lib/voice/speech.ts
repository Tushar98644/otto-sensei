import type { VoiceProblem } from "./problems";

export type RecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { readonly transcript: string };
};

export type RecognitionResultEvent = {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult };
};

// TypeScript's DOM types describe the events but not SpeechRecognition itself.
export type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type RecognitionConstructor = new () => Recognition;

export type SpeechEvents = {
  onText: (chunk: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
};

export type SpeechSession = { stop: () => void; cancel: () => void };

type SpeechScope = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

export function getRecognition(scope: object): RecognitionConstructor | null {
  const { SpeechRecognition, webkitSpeechRecognition } = scope as SpeechScope;
  const found = SpeechRecognition ?? webkitSpeechRecognition;
  return typeof found === "function" ? (found as RecognitionConstructor) : null;
}

let active: SpeechSession | null = null;

export function startSpeech(
  Recognition: RecognitionConstructor,
  lang: string,
  events: SpeechEvents,
): SpeechSession | null {
  active?.stop();
  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  const heard = new Set<number>();
  let interim = "";
  let lastFinal = "";
  let over = false;

  // Chrome on Android repeats earlier words in each new final result, so only the new part counts.
  function emit(transcript: string) {
    const said = transcript.trim();
    const repeats =
      lastFinal !== "" &&
      said.toLowerCase().startsWith(lastFinal.toLowerCase()) &&
      (said.length === lastFinal.length || /\s/.test(said[lastFinal.length] ?? ""));
    const chunk = (repeats ? said.slice(lastFinal.length) : said).trim();
    lastFinal = said;
    if (chunk) events.onText(chunk);
  }

  function close() {
    over = true;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    if (active === session) active = null;
  }

  recognition.onresult = (event) => {
    let pending = "";
    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript ?? "";
      if (!result?.isFinal) pending += transcript;
      else if (!heard.has(index)) {
        heard.add(index);
        emit(transcript);
      }
    }
    interim = pending;
  };
  recognition.onerror = (event) => events.onError(event.error);
  // Some browsers end without marking the last words final; keep them rather than drop them.
  recognition.onend = () => {
    if (interim.trim()) emit(interim);
    close();
    events.onEnd();
  };

  const session: SpeechSession = {
    stop: () => recognition.stop(),
    cancel: () => {
      if (over) return;
      close();
      recognition.abort();
      events.onEnd();
    },
  };

  try {
    recognition.start();
  } catch {
    close();
    events.onError("start-failed");
    return null;
  }
  active = session;
  return session;
}

// The browser has the API but no speech service behind it (Brave, Vivaldi, Opera) or it's turned off.
const SERVICE_ERRORS = new Set([
  "network",
  "service-not-allowed",
  "language-not-supported",
  "start-failed",
]);

export function speechUnavailable(code: string): boolean {
  return SERVICE_ERRORS.has(code);
}

export function speechProblem(code: string): VoiceProblem | null {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
      return { code: "mic-blocked" };
    case "audio-capture":
      return { code: "no-mic" };
    case "no-speech":
      return { code: "no-speech" };
    case "network":
      return { code: "offline" };
    default:
      return { code: "failed" };
  }
}
