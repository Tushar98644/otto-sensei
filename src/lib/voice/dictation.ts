import { readItem, writeItem } from "@/lib/browser-storage";
import type { VoiceProblem } from "./problems";
import { canRecord, startVoice, type VoiceClip, type VoiceDeps } from "./recorder";
import {
  getRecognition,
  speechProblem,
  speechUnavailable,
  startSpeech,
  type RecognitionConstructor,
  type SpeechSession,
} from "./speech";

export type VoiceEngine = "speech" | "recorder";

export type VoicePhase = "idle" | "starting" | "listening" | "recording" | "sending";

export const VOICE_LABELS = {
  start: "Speak instead of typing",
  listening: "Stop listening",
  recording: "Stop recording",
  sending: "Turning speech into text…",
} as const;

export const ENGINE_KEY = "otto-voice-engine-v1";

export function isListening(phase: VoicePhase): boolean {
  return phase === "starting" || phase === "listening" || phase === "recording";
}

export type DictationOptions = {
  signedOut: boolean;
  transcribe: (clip: VoiceClip, signal: AbortSignal) => Promise<string>;
};

export type DictationEvents = {
  onPhase: (phase: VoicePhase, startedAt?: number) => void;
  onText: (text: string) => void;
  onProblem: (problem: VoiceProblem) => void;
  onEnd: () => void;
};

export type DictationSession = { stop: () => void; cancel: () => void };

type BrowserScope = {
  navigator?: {
    userAgent?: string;
    language?: string;
    onLine?: boolean;
    brave?: { isBrave?: unknown };
  };
};

type MediaScope = { navigator: Navigator; MediaRecorder: typeof MediaRecorder };

let active: DictationSession | null = null;

export function canDictate(scope: object): boolean {
  return getRecognition(scope) !== null || canRecord(scope);
}

// Brave and Opera expose SpeechRecognition with no speech service behind it, so every start fails.
function speechBroken(scope: object): boolean {
  const { navigator } = scope as BrowserScope;
  return (
    typeof navigator?.brave?.isBrave === "function" ||
    /\bOPR\//.test(navigator?.userAgent ?? "") ||
    readItem(ENGINE_KEY) === "recorder"
  );
}

export function chooseEngine(scope: object): VoiceEngine | null {
  const record = canRecord(scope);
  if (getRecognition(scope) && !(record && speechBroken(scope))) return "speech";
  return record ? "recorder" : null;
}

export function startDictation(
  scope: object,
  options: DictationOptions,
  events: DictationEvents,
): DictationSession | null {
  const engine = chooseEngine(scope);
  if (!engine) return null;
  if (engine === "recorder" && options.signedOut) {
    events.onProblem({ code: "sign-in" });
    return null;
  }

  active?.stop();
  let inner: DictationSession | null = null;
  let stopped = false;
  let over = false;

  function end() {
    if (over) return;
    over = true;
    if (active === session) active = null;
    events.onEnd();
  }

  function record() {
    if (options.signedOut) {
      events.onProblem({ code: "sign-in" });
      return end();
    }
    events.onPhase("starting");
    inner = startVoice(recorderDeps(scope, options.transcribe), {
      onRecording: (at) => events.onPhase("recording", at),
      onSending: () => events.onPhase("sending"),
      onText: events.onText,
      onProblem: events.onProblem,
      onEnd: end,
    });
  }

  function listen(Recognition: RecognitionConstructor) {
    let speech: SpeechSession | null = null;
    let switched = false;
    speech = startSpeech(Recognition, languageOf(scope), {
      onText: events.onText,
      onError: (code) => {
        if (switched) return;
        // Offline, the recorder can't help either, so this browser isn't marked as broken.
        if (speechUnavailable(code) && canRecord(scope) && isOnline(scope)) {
          switched = true;
          writeItem(ENGINE_KEY, "recorder");
          speech?.cancel();
          if (stopped) end();
          else record();
          return;
        }
        const problem = speechProblem(code);
        if (problem) events.onProblem(problem);
      },
      onEnd: () => {
        if (!switched) end();
      },
    });
    if (switched) return;
    if (!speech) return end();
    inner = speech;
    events.onPhase("listening");
  }

  function finish(how: "stop" | "cancel") {
    stopped = true;
    if (inner) inner[how]();
    else end();
  }

  const session: DictationSession = { stop: () => finish("stop"), cancel: () => finish("cancel") };
  active = session;
  // Deferred so no event fires before the caller holds the session.
  void Promise.resolve().then(() => {
    if (stopped) return;
    const Recognition = engine === "speech" ? getRecognition(scope) : null;
    if (Recognition) listen(Recognition);
    else record();
  });
  return session;
}

function recorderDeps(scope: object, transcribe: DictationOptions["transcribe"]): VoiceDeps {
  const { navigator, MediaRecorder } = scope as MediaScope;
  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    Recorder: MediaRecorder,
    transcribe,
  };
}

function languageOf(scope: object): string {
  return (scope as BrowserScope).navigator?.language || "en-US";
}

function isOnline(scope: object): boolean {
  return (scope as BrowserScope).navigator?.onLine !== false;
}
