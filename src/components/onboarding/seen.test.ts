import { describe, expect, it } from "vitest";
import {
  forgetTours,
  hasSeenTour,
  markTourSeen,
  replayRequested,
  tourDue,
  type TourStorage,
} from "./seen";

function memoryStorage(): TourStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function brokenStorage(): TourStorage {
  const fail = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe("seen tours", () => {
  it("shows each tour once, then remembers it", () => {
    const storage = memoryStorage();
    expect(hasSeenTour(storage, "studio")).toBe(false);
    markTourSeen(storage, "studio", new Date("2026-11-07T10:00:00Z"));
    expect(hasSeenTour(storage, "studio")).toBe(true);
    expect(storage.data.get("otto.tour.studio")).toBe("2026-11-07T10:00:00.000Z");
  });

  it("keeps the studio and dashboard tours apart", () => {
    const storage = memoryStorage();
    markTourSeen(storage, "dashboard");
    expect(hasSeenTour(storage, "dashboard")).toBe(true);
    expect(hasSeenTour(storage, "studio")).toBe(false);
  });

  it("forgets every tour for a show-again control", () => {
    const storage = memoryStorage();
    markTourSeen(storage, "studio");
    markTourSeen(storage, "dashboard");
    forgetTours(storage);
    expect(hasSeenTour(storage, "studio")).toBe(false);
    expect(hasSeenTour(storage, "dashboard")).toBe(false);
  });

  it("can't tell when storage is missing or blocked, and never throws", () => {
    expect(hasSeenTour(null, "studio")).toBeNull();
    expect(hasSeenTour(brokenStorage(), "studio")).toBeNull();
    expect(() => markTourSeen(brokenStorage(), "studio")).not.toThrow();
    expect(() => forgetTours(brokenStorage())).not.toThrow();
  });
});

describe("tourDue", () => {
  it("is due only when this browser says it hasn't been seen", () => {
    expect(tourDue({ seen: false, replay: false })).toBe(true);
    expect(tourDue({ seen: true, replay: false })).toBe(false);
  });

  // Otherwise a browser that can't store the flag would show the tour on every visit.
  it("stays quiet when the browser can't remember", () => {
    expect(tourDue({ seen: null, replay: false })).toBe(false);
  });

  it("replays on request even after it was seen", () => {
    expect(tourDue({ seen: true, replay: true })).toBe(true);
    expect(tourDue({ seen: null, replay: true })).toBe(true);
  });
});

describe("replayRequested", () => {
  it("reads ?tour=1 and nothing else", () => {
    expect(replayRequested("?tour=1")).toBe(true);
    expect(replayRequested("?step=fix&tour=1")).toBe(true);
    expect(replayRequested("")).toBe(false);
    expect(replayRequested("?tour=0")).toBe(false);
    expect(replayRequested("?tour")).toBe(false);
  });
});
