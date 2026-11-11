import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dictationProblem,
  getRecognition,
  startDictation,
  type DictationEvents,
  type Recognition,
  type RecognitionResult,
} from "./dictation";

class FakeRecognition implements Recognition {
  static made: FakeRecognition[] = [];
  static failStart = false;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: Recognition["onend"] = null;
  started = false;
  stopped = false;
  aborted = false;

  constructor() {
    FakeRecognition.made.push(this);
  }

  start() {
    if (FakeRecognition.failStart) throw new Error("InvalidStateError");
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }

  abort() {
    this.aborted = true;
  }

  hear(...results: Array<[transcript: string, isFinal: boolean]>) {
    const list = results.map(([transcript, isFinal]): RecognitionResult => ({
      isFinal,
      length: 1,
      0: { transcript },
    }));
    this.onresult?.({ resultIndex: 0, results: list });
  }

  end() {
    this.onend?.();
  }
}

function events(): DictationEvents & { said: string[] } {
  const said: string[] = [];
  return {
    said,
    onText: vi.fn((chunk: string) => {
      said.push(chunk);
    }),
    onError: vi.fn(),
    onEnd: vi.fn(),
  };
}

function last(): FakeRecognition {
  const recognition = FakeRecognition.made.at(-1);
  if (!recognition) throw new Error("No recognition was made");
  return recognition;
}

afterEach(() => {
  for (const recognition of FakeRecognition.made) recognition.end();
  FakeRecognition.made = [];
  FakeRecognition.failStart = false;
});

describe("getRecognition", () => {
  it("finds the standard or the prefixed constructor, and nothing in Firefox", () => {
    class Standard {}
    class Prefixed {}
    expect(getRecognition({})).toBeNull();
    expect(getRecognition({ webkitSpeechRecognition: Prefixed })).toBe(Prefixed);
    expect(getRecognition({ SpeechRecognition: Standard, webkitSpeechRecognition: Prefixed })).toBe(
      Standard,
    );
    expect(getRecognition({ webkitSpeechRecognition: "not a constructor" })).toBeNull();
  });
});

describe("startDictation", () => {
  it("listens continuously, with interim results, in the given language", () => {
    const session = startDictation(FakeRecognition, "pt-BR", events());
    expect(session).not.toBeNull();
    expect(last()).toMatchObject({
      continuous: true,
      interimResults: true,
      lang: "pt-BR",
      started: true,
    });
  });

  it("passes on final words only, once each", () => {
    const handlers = events();
    startDictation(FakeRecognition, "en-US", handlers);
    last().hear(["trained three", false]);
    expect(handlers.said).toEqual([]);
    last().hear(["trained three new hires", true]);
    last().hear(["trained three new hires", true], [" in my first month", false]);
    last().hear(["trained three new hires", true], [" in my first month", true]);
    expect(handlers.said).toEqual(["trained three new hires", "in my first month"]);
  });

  it("keeps only the new words when a final result repeats the last one", () => {
    const handlers = events();
    startDictation(FakeRecognition, "en-US", handlers);
    last().hear(["cut costs", true]);
    last().hear(["cut costs", true], ["cut costs by half", true]);
    last().hear(["cut costs", true], ["cut costs by half", true], ["cut costs by half", true]);
    expect(handlers.said).toEqual(["cut costs", "by half"]);
  });

  it("stops on request and keeps words the browser never marked final", () => {
    const handlers = events();
    const session = startDictation(FakeRecognition, "en-US", handlers);
    last().hear(["led the move to", false]);
    session?.stop();
    expect(last().stopped).toBe(true);
    expect(handlers.onEnd).not.toHaveBeenCalled();
    last().end();
    expect(handlers.said).toEqual(["led the move to"]);
    expect(handlers.onEnd).toHaveBeenCalledOnce();
  });

  it("cancels without adding anything more", () => {
    const handlers = events();
    const session = startDictation(FakeRecognition, "en-US", handlers);
    const recognition = last();
    recognition.hear(["half a sentence", false]);
    session?.cancel();
    expect(recognition.aborted).toBe(true);
    expect(handlers.onEnd).toHaveBeenCalledOnce();
    recognition.hear(["half a sentence", true]);
    recognition.end();
    session?.cancel();
    expect(handlers.said).toEqual([]);
    expect(handlers.onEnd).toHaveBeenCalledOnce();
  });

  it("reports errors by their code", () => {
    const handlers = events();
    startDictation(FakeRecognition, "en-US", handlers);
    last().onerror?.({ error: "not-allowed" });
    expect(handlers.onError).toHaveBeenCalledWith("not-allowed");
  });

  it("stops the session already running when another field starts", () => {
    startDictation(FakeRecognition, "en-US", events());
    const first = last();
    startDictation(FakeRecognition, "en-US", events());
    expect(first.stopped).toBe(true);
    expect(last()).not.toBe(first);
  });

  it("gives up cleanly when the browser refuses to start", () => {
    FakeRecognition.failStart = true;
    const handlers = events();
    expect(startDictation(FakeRecognition, "en-US", handlers)).toBeNull();
    expect(handlers.onError).toHaveBeenCalledWith("start-failed");
    expect(handlers.onEnd).not.toHaveBeenCalled();
  });
});

describe("dictationProblem", () => {
  it("says what to do in plain words", () => {
    expect(dictationProblem("not-allowed")?.description).toBe(
      "Allow the microphone in your browser to talk to Otto.",
    );
    expect(dictationProblem("no-speech")?.title).toBe("Otto didn't hear anything");
    expect(dictationProblem("something-new")?.title).toBe("Voice typing stopped");
  });

  it("stays quiet when the session was stopped on purpose", () => {
    expect(dictationProblem("aborted")).toBeNull();
  });
});
