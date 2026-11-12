import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRecognition,
  speechProblem,
  speechUnavailable,
  startSpeech,
  type SpeechEvents,
} from "./speech";
import { FakeRecognition } from "./test-helpers";

function events(): SpeechEvents & { said: string[] } {
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

const last = () => FakeRecognition.last();

afterEach(() => {
  FakeRecognition.reset();
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

describe("startSpeech", () => {
  it("listens continuously, with interim results, in the given language", () => {
    const session = startSpeech(FakeRecognition, "pt-BR", events());
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
    startSpeech(FakeRecognition, "en-US", handlers);
    last().hear(["trained three", false]);
    expect(handlers.said).toEqual([]);
    last().hear(["trained three new hires", true]);
    last().hear(["trained three new hires", true], [" in my first month", false]);
    last().hear(["trained three new hires", true], [" in my first month", true]);
    expect(handlers.said).toEqual(["trained three new hires", "in my first month"]);
  });

  it("keeps only the new words when a final result repeats the last one", () => {
    const handlers = events();
    startSpeech(FakeRecognition, "en-US", handlers);
    last().hear(["cut costs", true]);
    last().hear(["cut costs", true], ["cut costs by half", true]);
    last().hear(["cut costs", true], ["cut costs by half", true], ["cut costs by half", true]);
    expect(handlers.said).toEqual(["cut costs", "by half"]);
  });

  it("stops on request and keeps words the browser never marked final", () => {
    const handlers = events();
    const session = startSpeech(FakeRecognition, "en-US", handlers);
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
    const session = startSpeech(FakeRecognition, "en-US", handlers);
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
    startSpeech(FakeRecognition, "en-US", handlers);
    last().fail("not-allowed");
    expect(handlers.onError).toHaveBeenCalledWith("not-allowed");
  });

  it("stops the session already running when another field starts", () => {
    startSpeech(FakeRecognition, "en-US", events());
    const first = last();
    startSpeech(FakeRecognition, "en-US", events());
    expect(first.stopped).toBe(true);
    expect(last()).not.toBe(first);
  });

  it("gives up cleanly when the browser refuses to start", () => {
    FakeRecognition.failStart = true;
    const handlers = events();
    expect(startSpeech(FakeRecognition, "en-US", handlers)).toBeNull();
    expect(handlers.onError).toHaveBeenCalledWith("start-failed");
    expect(handlers.onEnd).not.toHaveBeenCalled();
  });
});

describe("speechProblem", () => {
  it("turns the browser's error codes into problems", () => {
    expect(speechProblem("not-allowed")).toEqual({ code: "mic-blocked" });
    expect(speechProblem("audio-capture")).toEqual({ code: "no-mic" });
    expect(speechProblem("no-speech")).toEqual({ code: "no-speech" });
    expect(speechProblem("network")).toEqual({ code: "offline" });
    expect(speechProblem("something-new")).toEqual({ code: "failed" });
  });

  it("stays quiet when the session was stopped on purpose", () => {
    expect(speechProblem("aborted")).toBeNull();
  });
});

describe("speechUnavailable", () => {
  it("is true only when the browser has no speech service to use", () => {
    for (const code of [
      "network",
      "service-not-allowed",
      "language-not-supported",
      "start-failed",
    ]) {
      expect(speechUnavailable(code)).toBe(true);
    }
    for (const code of ["not-allowed", "audio-capture", "no-speech", "aborted"]) {
      expect(speechUnavailable(code)).toBe(false);
    }
  });
});
