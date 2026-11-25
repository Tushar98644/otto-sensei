import { describe, expect, it } from "vitest";
import { CHORDS, chordAt, holdSeconds, midiToHz, MUSIC, VOICES, voiceHz } from "./plan";

describe("focus music plan", () => {
  it("turns MIDI notes into pitches", () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(57)).toBeCloseTo(220);
    expect(midiToHz(50)).toBeCloseTo(146.83, 2);
  });

  it("cycles through the chords, also backwards", () => {
    expect(chordAt(CHORDS.length)).toBe(CHORDS[0]);
    expect(chordAt(-1)).toBe(CHORDS.at(-1));
  });

  it("gives every voice a warm, low pitch, the root twice", () => {
    for (let step = 0; step < CHORDS.length; step += 1) {
      const pitches = VOICES.map((voice) => voiceHz(step, voice));
      expect(pitches[0]).toBe(pitches[1]);
      for (const hz of pitches) {
        expect(hz).toBeGreaterThan(80);
        expect(hz).toBeLessThan(400);
      }
    }
  });

  it("holds each chord 8 to 16 seconds, long enough for the crossfade to finish", () => {
    for (let step = 0; step < 8; step += 1) {
      const hold = holdSeconds(step);
      expect(hold).toBeGreaterThanOrEqual(8);
      expect(hold).toBeLessThanOrEqual(16);
      expect(hold).toBeGreaterThan(MUSIC.crossfadeS);
    }
  });

  it("stays quiet and fades in and out gently", () => {
    expect(MUSIC.volume).toBeGreaterThanOrEqual(0.08);
    expect(MUSIC.volume).toBeLessThanOrEqual(0.12);
    for (const fade of [MUSIC.fadeInS, MUSIC.fadeOutS]) {
      expect(fade).toBeGreaterThanOrEqual(2);
      expect(fade).toBeLessThanOrEqual(3);
    }
  });
});
