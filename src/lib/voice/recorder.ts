import { isApiError } from "@/lib/api/client";
import type { VoiceProblem } from "./problems";

export const MAX_RECORDING_MS = 120_000;
// Too short to hold a word, and speech models make up text for near-silent clips.
const MIN_RECORDING_MS = 500;
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"];
// Speech needs little; this keeps 2 minutes near 1 MB, well under hosting body limits.
const AUDIO_BITS_PER_SECOND = 64_000;

export type VoiceClip = { audio: Blob; seconds: number };

export type VoiceDeps = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  Recorder: typeof MediaRecorder;
  transcribe: (clip: VoiceClip, signal: AbortSignal) => Promise<string>;
};

export type VoiceEvents = {
  onRecording: (startedAt: number) => void;
  onSending: () => void;
  onText: (text: string) => void;
  onProblem: (problem: VoiceProblem) => void;
  onEnd: () => void;
};

export type VoiceSession = { stop: () => void; cancel: () => void };

type RecordScope = {
  navigator?: { mediaDevices?: { getUserMedia?: unknown } };
  MediaRecorder?: unknown;
};

export function canRecord(scope: object): boolean {
  const { navigator, MediaRecorder } = scope as RecordScope;
  return (
    typeof navigator?.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder === "function"
  );
}

export function audioTypeFor(Recorder: Pick<typeof MediaRecorder, "isTypeSupported">): string {
  if (typeof Recorder.isTypeSupported !== "function") return "";
  return AUDIO_TYPES.find((type) => Recorder.isTypeSupported(type)) ?? "";
}

export function elapsedText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

let active: VoiceSession | null = null;

export function startVoice(deps: VoiceDeps, events: VoiceEvents): VoiceSession {
  active?.stop();
  const chunks: Blob[] = [];
  const upload = new AbortController();
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let audioType = "";
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let over = false;

  function release() {
    clearTimeout(timer);
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
  }

  function end(problem?: VoiceProblem) {
    if (over) return;
    over = true;
    release();
    if (active === session) active = null;
    if (problem) events.onProblem(problem);
    events.onEnd();
  }

  function stop() {
    if (over) return;
    if (!recorder) return cancel();
    if (recorder.state !== "inactive") recorder.stop();
    release();
  }

  function cancel() {
    if (over) return;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    upload.abort();
    end();
  }

  async function send() {
    const seconds = Math.min(Date.now() - startedAt, MAX_RECORDING_MS) / 1000;
    const audio = new Blob(chunks, { type: recorder?.mimeType || audioType });
    if (audio.size === 0 || seconds * 1000 < MIN_RECORDING_MS) return end({ code: "no-speech" });
    events.onSending();
    try {
      const text = await deps.transcribe({ audio, seconds }, upload.signal);
      if (over) return;
      if (!text.trim()) return end({ code: "no-speech" });
      events.onText(text);
      end();
    } catch (error) {
      end(problemFromError(error));
    }
  }

  async function open() {
    let opened: MediaStream;
    try {
      opened = await deps.getUserMedia({ audio: true });
    } catch (error) {
      return end(micProblem(error));
    }
    if (over) {
      for (const track of opened.getTracks()) track.stop();
      return;
    }
    stream = opened;
    audioType = audioTypeFor(deps.Recorder);
    try {
      recorder = makeRecorder(deps.Recorder, opened, audioType);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        release();
        void send();
      };
      recorder.onerror = () => cancelWith({ code: "failed" });
      recorder.start();
    } catch {
      return cancelWith({ code: "failed" });
    }
    startedAt = Date.now();
    timer = setTimeout(stop, MAX_RECORDING_MS);
    events.onRecording(startedAt);
  }

  function cancelWith(problem: VoiceProblem) {
    if (over) return;
    events.onProblem(problem);
    cancel();
  }

  const session: VoiceSession = { stop, cancel };
  active = session;
  // Deferred so no event fires before the caller holds the session.
  void Promise.resolve().then(open);
  return session;
}

function makeRecorder(
  Recorder: typeof MediaRecorder,
  stream: MediaStream,
  mimeType: string,
): MediaRecorder {
  try {
    return new Recorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
  } catch {
    return new Recorder(stream);
  }
}

function micProblem(error: unknown): VoiceProblem {
  const name = error && typeof error === "object" && "name" in error ? error.name : null;
  if (name === "NotAllowedError" || name === "SecurityError") return { code: "mic-blocked" };
  if (name === "NotFoundError" || name === "NotReadableError" || name === "OverconstrainedError") {
    return { code: "no-mic" };
  }
  return { code: "failed" };
}

export function problemFromError(error: unknown): VoiceProblem {
  if (isApiError(error, "unauthorized")) return { code: "sign-in", message: error.message };
  if (isApiError(error, "rate_limited")) return { code: "too-many", message: error.message };
  if (isApiError(error, "no_speech")) return { code: "no-speech" };
  return { code: "failed" };
}
