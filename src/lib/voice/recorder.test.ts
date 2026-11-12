import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import {
  audioTypeFor,
  canRecord,
  elapsedText,
  MAX_RECORDING_MS,
  problemFromError,
  startVoice,
  voiceProblemCopy,
  type VoiceClip,
  type VoiceDeps,
  type VoiceEvents,
  type VoiceProblem,
  type VoiceSession,
} from "./recorder";

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
  get released() {
    return this.tracks.every((track) => track.stopped);
  }
}

class FakeRecorder {
  static made: FakeRecorder[] = [];
  static supported = new Set(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]);
  static isTypeSupported(type: string) {
    return FakeRecorder.supported.has(type);
  }

  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  bytes = "spoken words";

  constructor(
    readonly stream: FakeStream,
    readonly options?: { mimeType?: string; audioBitsPerSecond?: number },
  ) {
    this.mimeType = options?.mimeType ?? "audio/webm";
    FakeRecorder.made.push(this);
  }

  start() {
    this.state = "recording";
  }

  // A real recorder hands over its data and stops a moment later, not inside stop().
  stop() {
    this.state = "inactive";
    void Promise.resolve().then(() => {
      this.ondataavailable?.({ data: new Blob([this.bytes], { type: this.mimeType }) });
      this.onstop?.();
    });
  }
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

type Log = { events: string[]; texts: string[]; problems: VoiceProblem[] };

function listen(): VoiceEvents & Log {
  const log: Log = { events: [], texts: [], problems: [] };
  return {
    ...log,
    onRecording: () => log.events.push("recording"),
    onSending: () => log.events.push("sending"),
    onText: (text) => {
      log.events.push("text");
      log.texts.push(text);
    },
    onProblem: (problem) => {
      log.events.push(`problem:${problem.code}`);
      log.problems.push(problem);
    },
    onEnd: () => log.events.push("end"),
  };
}

let stream: FakeStream;
type Transcribe = (clip: VoiceClip, signal: AbortSignal) => Promise<string>;

let transcribe: Mock<Transcribe>;
let getUserMedia: Mock<VoiceDeps["getUserMedia"]>;
let session: VoiceSession | null = null;

function deps(): VoiceDeps {
  return {
    getUserMedia,
    Recorder: FakeRecorder as unknown as typeof MediaRecorder,
    transcribe,
  };
}

function lastRecorder(): FakeRecorder {
  const recorder = FakeRecorder.made.at(-1);
  if (!recorder) throw new Error("no recorder was made");
  return recorder;
}

async function record(events: VoiceEvents, seconds = 3): Promise<VoiceSession> {
  session = startVoice(deps(), events);
  await flush();
  vi.advanceTimersByTime(seconds * 1000);
  return session;
}

beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 10, 12, 9) });
  FakeRecorder.made = [];
  FakeRecorder.supported = new Set(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]);
  stream = new FakeStream();
  getUserMedia = vi.fn<VoiceDeps["getUserMedia"]>(async () => stream as unknown as MediaStream);
  transcribe = vi.fn<Transcribe>(async () => "led the team of five");
});

afterEach(() => {
  session?.cancel();
  session = null;
  vi.useRealTimers();
});

describe("canRecord", () => {
  it("needs both the microphone and a recorder", () => {
    const mediaDevices = { getUserMedia: () => {} };
    expect(canRecord({ navigator: { mediaDevices }, MediaRecorder: class {} })).toBe(true);
    expect(canRecord({ navigator: { mediaDevices }, MediaRecorder: undefined })).toBe(false);
    expect(canRecord({ navigator: {}, MediaRecorder: class {} })).toBe(false);
    expect(canRecord({})).toBe(false);
  });
});

describe("audioTypeFor", () => {
  it("prefers webm, then mp4 (Safari), then ogg", () => {
    expect(audioTypeFor(FakeRecorder)).toBe("audio/webm;codecs=opus");
    FakeRecorder.supported = new Set(["audio/mp4"]);
    expect(audioTypeFor(FakeRecorder)).toBe("audio/mp4");
    FakeRecorder.supported = new Set(["audio/ogg"]);
    expect(audioTypeFor(FakeRecorder)).toBe("audio/ogg");
    FakeRecorder.supported = new Set();
    expect(audioTypeFor(FakeRecorder)).toBe("");
  });
});

describe("startVoice", () => {
  it("records until stopped, sends the clip once, hands back the text and frees the mic", async () => {
    const events = listen();
    session = startVoice(deps(), events);
    expect(events.events).toEqual([]);
    await flush();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    const recorder = lastRecorder();
    expect(recorder.options).toEqual({
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 64_000,
    });
    expect(recorder.state).toBe("recording");
    expect(events.events).toEqual(["recording"]);

    vi.advanceTimersByTime(4_200);
    session.stop();
    expect(stream.released).toBe(true);
    await flush();

    expect(transcribe).toHaveBeenCalledOnce();
    const [clip, signal] = transcribe.mock.calls[0]!;
    expect(clip.audio.type).toBe("audio/webm;codecs=opus");
    expect(await clip.audio.text()).toBe("spoken words");
    expect(clip.seconds).toBeCloseTo(4.2);
    expect(signal.aborted).toBe(false);
    expect(events.texts).toEqual(["led the team of five"]);
    expect(events.events).toEqual(["recording", "sending", "text", "end"]);
  });

  it("records mp4 where webm isn't supported", async () => {
    FakeRecorder.supported = new Set(["audio/mp4"]);
    session = await record(listen());
    session.stop();
    await flush();
    expect(transcribe.mock.calls[0]![0].audio.type).toBe("audio/mp4");
  });

  it("stops by itself after 2 minutes and still sends", async () => {
    const events = listen();
    session = startVoice(deps(), events);
    await flush();
    vi.advanceTimersByTime(MAX_RECORDING_MS - 1);
    expect(lastRecorder().state).toBe("recording");
    vi.advanceTimersByTime(1);
    expect(lastRecorder().state).toBe("inactive");
    expect(stream.released).toBe(true);
    await flush();
    expect(transcribe.mock.calls[0]![0].seconds).toBe(120);
    expect(events.events).toEqual(["recording", "sending", "text", "end"]);
  });

  it("throws the clip away on cancel: no upload, no text, mic freed", async () => {
    const events = listen();
    session = await record(events);
    session.cancel();
    await flush();
    expect(transcribe).not.toHaveBeenCalled();
    expect(stream.released).toBe(true);
    expect(events.events).toEqual(["recording", "end"]);
  });

  it("cancels the upload while sending and drops a late answer", async () => {
    let answer: (text: string) => void = () => {};
    transcribe.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    const events = listen();
    session = await record(events);
    session.stop();
    await flush();
    expect(events.events).toEqual(["recording", "sending"]);

    session.cancel();
    expect(transcribe.mock.calls[0]![1].aborted).toBe(true);
    answer("too late");
    await flush();
    expect(events.texts).toEqual([]);
    expect(events.events).toEqual(["recording", "sending", "end"]);
  });

  it("stops asking for the mic when cancelled before it's allowed", async () => {
    let allow: (value: MediaStream) => void = () => {};
    getUserMedia.mockImplementationOnce(() => new Promise((resolve) => (allow = resolve)));
    const events = listen();
    session = startVoice(deps(), events);
    await flush();
    session.stop();
    expect(events.events).toEqual(["end"]);

    allow(stream as unknown as MediaStream);
    await flush();
    expect(FakeRecorder.made).toHaveLength(0);
    expect(stream.released).toBe(true);
  });

  it.each([
    ["NotAllowedError", "mic-blocked"],
    ["SecurityError", "mic-blocked"],
    ["NotFoundError", "no-mic"],
    ["NotReadableError", "no-mic"],
    ["AbortError", "failed"],
  ])("turns a %s from the mic into %s", async (name, code) => {
    getUserMedia.mockRejectedValueOnce(new DOMException("blocked", name));
    const events = listen();
    session = startVoice(deps(), events);
    await flush();
    expect(events.problems).toEqual([{ code }]);
    expect(events.events).toEqual([`problem:${code}`, "end"]);
  });

  it("says nothing was heard for a quick tap, without sending it", async () => {
    const events = listen();
    session = await record(events, 0.3);
    session.stop();
    await flush();
    expect(transcribe).not.toHaveBeenCalled();
    expect(events.events).toEqual(["recording", "problem:no-speech", "end"]);
  });

  it("says nothing was heard for an empty recording or empty text", async () => {
    const empty = listen();
    session = await record(empty);
    lastRecorder().bytes = "";
    session.stop();
    await flush();
    expect(transcribe).not.toHaveBeenCalled();
    expect(empty.problems).toEqual([{ code: "no-speech" }]);

    transcribe.mockResolvedValueOnce("   ");
    const blank = listen();
    session = await record(blank);
    session.stop();
    await flush();
    expect(blank.events).toEqual(["recording", "sending", "problem:no-speech", "end"]);
  });

  it("reports a failed upload and frees the mic", async () => {
    transcribe.mockRejectedValueOnce(new ApiClientError("network_error", "offline", 0));
    const events = listen();
    session = await record(events);
    session.stop();
    await flush();
    expect(events.events).toEqual(["recording", "sending", "problem:failed", "end"]);
    expect(stream.released).toBe(true);
  });

  it("gives up cleanly when the recorder fails", async () => {
    const events = listen();
    session = await record(events);
    lastRecorder().onerror?.();
    await flush();
    expect(transcribe).not.toHaveBeenCalled();
    expect(stream.released).toBe(true);
    expect(events.events).toEqual(["recording", "problem:failed", "end"]);
  });

  it("stops the other box's recording when a second one starts", async () => {
    const first = listen();
    const firstSession = await record(first);
    const second = listen();
    session = startVoice(deps(), second);
    await flush();
    expect(first.events).toEqual(["recording", "sending", "text", "end"]);
    expect(second.events).toEqual(["recording"]);
    firstSession.cancel();
  });
});

describe("problemFromError", () => {
  it("keeps the server's words for sign-in and limits", () => {
    expect(
      problemFromError(new ApiClientError("unauthorized", "Sign in to talk to Otto.", 401)),
    ).toEqual({
      code: "sign-in",
      message: "Sign in to talk to Otto.",
    });
    expect(
      problemFromError(new ApiClientError("rate_limited", "Try again in 4 minutes.", 429)),
    ).toEqual({
      code: "too-many",
      message: "Try again in 4 minutes.",
    });
    expect(problemFromError(new ApiClientError("no_speech", "nothing", 422))).toEqual({
      code: "no-speech",
    });
    expect(problemFromError(new ApiClientError("ai_unavailable", "down", 502))).toEqual({
      code: "failed",
    });
    expect(problemFromError(new Error("boom"))).toEqual({ code: "failed" });
  });
});

describe("voiceProblemCopy", () => {
  it("says each problem in plain words", () => {
    expect(voiceProblemCopy({ code: "mic-blocked" }).description).toBe(
      "Allow the microphone in your browser to talk to Otto.",
    );
    expect(voiceProblemCopy({ code: "no-speech" })).toEqual({
      title: "Otto didn't catch anything",
      description: "Try again a little closer to the mic.",
    });
    expect(voiceProblemCopy({ code: "failed" })).toEqual({
      title: "Couldn't turn that into text",
      description: "Try again, or type instead.",
    });
    expect(
      voiceProblemCopy({ code: "sign-in", message: "Sign in to talk to Otto." }).description,
    ).toBe("Sign in to talk to Otto.");
  });
});

describe("elapsedText", () => {
  it("shows minutes and seconds", () => {
    expect(elapsedText(0)).toBe("0:00");
    expect(elapsedText(7_900)).toBe("0:07");
    expect(elapsedText(119_000)).toBe("1:59");
    expect(elapsedText(MAX_RECORDING_MS)).toBe("2:00");
  });
});
