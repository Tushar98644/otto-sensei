import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  canDictate,
  chooseEngine,
  ENGINE_KEY,
  startDictation,
  type DictationEvents,
  type DictationSession,
} from "./dictation";
import type { VoiceProblem } from "./problems";
import type { VoiceClip } from "./recorder";
import { FakeRecognition, FakeRecorder, FakeStream, flush } from "./test-helpers";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const OPERA = `${CHROME} OPR/127.0.0.0`;
const FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0";

type Transcribe = (clip: VoiceClip, signal: AbortSignal) => Promise<string>;
type GetUserMedia = (constraints: MediaStreamConstraints) => Promise<MediaStream>;

let stored: Map<string, string>;
let transcribe: Mock<Transcribe>;
let getUserMedia: Mock<GetUserMedia>;
let session: DictationSession | null = null;

function recorderOnly(userAgent: string, extra: Record<string, unknown> = {}) {
  return {
    MediaRecorder: FakeRecorder,
    navigator: {
      userAgent,
      language: "en-GB",
      onLine: true,
      mediaDevices: { getUserMedia },
      ...extra,
    },
  };
}

function browser(userAgent: string, extra: Record<string, unknown> = {}) {
  return { ...recorderOnly(userAgent, extra), webkitSpeechRecognition: FakeRecognition };
}

const BRAVE = { brave: { isBrave: async () => true } };
const chrome = () => browser(CHROME);
const brave = () => browser(CHROME, BRAVE);
const opera = () => browser(OPERA);
const firefox = () => recorderOnly(FIREFOX);

type Log = { events: string[]; texts: string[]; problems: VoiceProblem[] };

function listen(): DictationEvents & Log {
  const log: Log = { events: [], texts: [], problems: [] };
  return {
    ...log,
    onPhase: (phase) => log.events.push(phase),
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

function start(scope: object, events: DictationEvents, signedOut = false) {
  session = startDictation(scope, { signedOut, transcribe }, events);
  return session;
}

beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 10, 12, 9) });
  stored = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
    },
  });
  FakeRecorder.reset();
  const stream = new FakeStream();
  getUserMedia = vi.fn<GetUserMedia>(async () => stream as unknown as MediaStream);
  transcribe = vi.fn<Transcribe>(async () => "led the team of five");
});

afterEach(() => {
  session?.cancel();
  session = null;
  FakeRecognition.reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("chooseEngine", () => {
  it("uses the browser's speech service where it works, and records elsewhere", () => {
    expect(chooseEngine(chrome())).toBe("speech");
    expect(chooseEngine(brave())).toBe("recorder");
    expect(chooseEngine(opera())).toBe("recorder");
    expect(chooseEngine(firefox())).toBe("recorder");
    expect(chooseEngine({})).toBeNull();
  });

  it("records in a browser whose speech service failed before", () => {
    stored.set(ENGINE_KEY, "recorder");
    expect(chooseEngine(chrome())).toBe("recorder");
  });

  it("keeps the speech service when the browser can't record anyway", () => {
    stored.set(ENGINE_KEY, "recorder");
    expect(chooseEngine({ webkitSpeechRecognition: FakeRecognition, navigator: BRAVE })).toBe(
      "speech",
    );
  });

  it("still works when site data is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    expect(chooseEngine(chrome())).toBe("speech");
  });
});

describe("canDictate", () => {
  it("shows the mic when either engine is there", () => {
    expect(canDictate(chrome())).toBe(true);
    expect(canDictate(firefox())).toBe(true);
    expect(canDictate({ webkitSpeechRecognition: FakeRecognition })).toBe(true);
    expect(canDictate({})).toBe(false);
  });
});

describe("startDictation", () => {
  it("in Chrome, signed out, types with the browser's speech service and sends nothing to us", async () => {
    const events = listen();
    start(chrome(), events, true);
    await flush();
    const recognition = FakeRecognition.last();
    expect(recognition).toMatchObject({ started: true, lang: "en-GB" });
    recognition.hear(["trained three new hires", true]);
    recognition.end();
    expect(events.texts).toEqual(["trained three new hires"]);
    expect(events.events).toEqual(["listening", "text", "end"]);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it.each([
    ["Brave", brave],
    ["Firefox", firefox],
  ])("in %s, records and sends the clip for text", async (_name, scope) => {
    const events = listen();
    start(scope(), events);
    await flush();
    expect(FakeRecognition.made).toHaveLength(0);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    vi.advanceTimersByTime(3_000);
    session?.stop();
    await flush();
    expect(transcribe).toHaveBeenCalledOnce();
    expect(events.events).toEqual(["starting", "recording", "sending", "text", "end"]);
  });

  it("asks you to sign in before recording, without touching the mic", async () => {
    const events = listen();
    expect(start(firefox(), events, true)).toBeNull();
    await flush();
    expect(events.problems).toEqual([{ code: "sign-in" }]);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it.each(["network", "service-not-allowed", "language-not-supported"])(
    "on %s, remembers the speech service doesn't work here and records at once",
    async (code) => {
      const events = listen();
      start(chrome(), events);
      await flush();
      const recognition = FakeRecognition.last();
      recognition.fail(code);
      expect(recognition.aborted).toBe(true);
      expect(stored.get(ENGINE_KEY)).toBe("recorder");
      await flush();
      expect(getUserMedia).toHaveBeenCalledOnce();
      expect(events.events).toEqual(["listening", "starting", "recording"]);
      expect(events.problems).toEqual([]);

      vi.advanceTimersByTime(3_000);
      session?.stop();
      await flush();
      expect(events.texts).toEqual(["led the team of five"]);
      expect(events.events.at(-1)).toBe("end");

      start(chrome(), listen());
      await flush();
      expect(FakeRecognition.made).toHaveLength(1);
      expect(getUserMedia).toHaveBeenCalledTimes(2);
    },
  );

  it("records when the browser won't even start its speech service", async () => {
    FakeRecognition.failStart = true;
    const events = listen();
    start(chrome(), events);
    await flush();
    expect(stored.get(ENGINE_KEY)).toBe("recorder");
    expect(events.events).toEqual(["starting", "recording"]);
  });

  it("asks you to sign in when the speech service fails while signed out", async () => {
    const events = listen();
    start(chrome(), events, true);
    await flush();
    FakeRecognition.last().fail("network");
    await flush();
    expect(events.events).toEqual(["listening", "problem:sign-in", "end"]);
    expect(stored.get(ENGINE_KEY)).toBe("recorder");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("doesn't switch when the mic is blocked, and says how to allow it", async () => {
    const events = listen();
    start(chrome(), events);
    await flush();
    const recognition = FakeRecognition.last();
    recognition.fail("not-allowed");
    recognition.end();
    await flush();
    expect(events.events).toEqual(["listening", "problem:mic-blocked", "end"]);
    expect(stored.has(ENGINE_KEY)).toBe(false);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("doesn't switch for good when the network error is just being offline", async () => {
    const events = listen();
    start(browser(CHROME, { onLine: false }), events);
    await flush();
    FakeRecognition.last().fail("network");
    expect(events.problems).toEqual([{ code: "offline" }]);
    expect(stored.has(ENGINE_KEY)).toBe(false);
  });

  it("doesn't start recording when you already pressed stop", async () => {
    const events = listen();
    start(chrome(), events);
    await flush();
    session?.stop();
    FakeRecognition.last().fail("network");
    await flush();
    expect(events.events).toEqual(["listening", "end"]);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("stops the other box when a second one starts", async () => {
    const first = listen();
    start(chrome(), first);
    await flush();
    const firstRecognition = FakeRecognition.last();
    start(chrome(), listen());
    await flush();
    expect(firstRecognition.stopped).toBe(true);
    firstRecognition.fail("network");
    await flush();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
