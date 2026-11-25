export type Wave = "sine" | "triangle";

export type Voice = { wave: Wave; note: 0 | 1 | 2; detune: number };

export type Chord = readonly [number, number, number];

const HOME: Chord = [50, 57, 64];

// Open, low voicings as MIDI notes: Dadd9, Bm7, Gmaj7, Asus2.
export const CHORDS: readonly Chord[] = [HOME, [47, 54, 62], [43, 54, 59], [45, 52, 59]];

// The root sounds twice, a few cents apart, so it beats slowly like a chorus.
export const VOICES: readonly Voice[] = [
  { wave: "sine", note: 0, detune: -4 },
  { wave: "triangle", note: 0, detune: 6 },
  { wave: "triangle", note: 1, detune: -3 },
  { wave: "sine", note: 2, detune: 4 },
];

const HOLDS_S = [13, 11, 15, 12] as const;

export const MUSIC = {
  volume: 0.1,
  fadeInS: 2.5,
  fadeOutS: 2.5,
  crossfadeS: 6,
  bankLevel: 0.22,
  cutoffHz: 900,
  cutoffSwingHz: 300,
  cutoffLfoHz: 0.03,
  airHz: 1200,
  airLevel: 0.08,
  airSwing: 0.04,
  airLfoHz: 0.07,
  noiseS: 3,
} as const;

function wrap(step: number, length: number): number {
  return ((step % length) + length) % length;
}

export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export function chordAt(step: number): Chord {
  return CHORDS[wrap(step, CHORDS.length)] ?? HOME;
}

export function voiceHz(step: number, voice: Voice): number {
  return midiToHz(chordAt(step)[voice.note]);
}

export function holdSeconds(step: number): number {
  return HOLDS_S[wrap(step, HOLDS_S.length)] ?? HOLDS_S[0];
}
