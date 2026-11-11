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

export type DictationEvents = {
  onText: (chunk: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
};

export type DictationSession = {
  stop: () => void;
  cancel: () => void;
};

export type DictationProblem = { title: string; description: string };

export const VOICE_LABELS = { start: "Speak instead of typing", stop: "Stop listening" } as const;

type SpeechScope = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

export function getRecognition(scope: object): RecognitionConstructor | null {
  const { SpeechRecognition, webkitSpeechRecognition } = scope as SpeechScope;
  const found = SpeechRecognition ?? webkitSpeechRecognition;
  return typeof found === "function" ? (found as RecognitionConstructor) : null;
}

let active: DictationSession | null = null;

export function startDictation(
  Recognition: RecognitionConstructor,
  lang: string,
  events: DictationEvents,
): DictationSession | null {
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

  const session: DictationSession = {
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

const PROBLEMS: Record<string, DictationProblem> = {
  "not-allowed": {
    title: "Otto can't hear you",
    description: "Allow the microphone in your browser to talk to Otto.",
  },
  "service-not-allowed": {
    title: "Voice typing is turned off",
    description: "Turn on dictation in your browser or device settings, or type instead.",
  },
  "audio-capture": {
    title: "No microphone found",
    description: "Plug one in or check your sound settings, then try again.",
  },
  "no-speech": {
    title: "Otto didn't hear anything",
    description:
      "Press the microphone and start talking. Speak a little closer if it happens again.",
  },
  network: {
    title: "Voice typing needs the internet",
    description: "Check your connection and try again, or type instead.",
  },
  "language-not-supported": {
    title: "Your language isn't available",
    description: "Your browser can't turn this language into text yet. Type instead.",
  },
};

const UNKNOWN_PROBLEM: DictationProblem = {
  title: "Voice typing stopped",
  description: "Try again, or type instead.",
};

export function dictationProblem(code: string): DictationProblem | null {
  if (code === "aborted") return null;
  return PROBLEMS[code] ?? UNKNOWN_PROBLEM;
}
