// A title's meaning in 64 bytes: the 256-dim int8 vector (scripts/title-vectors.py) turned by a fixed
// randomized Hadamard rotation, which spreads its weight evenly, then 2 bits a dimension (the best 4 levels
// for a normal spread). Rotation is integer-only, so every engine stores the same bits (docs/matching.md).
export const TITLE_DIMS = 256;
export const TITLE_CODE_BYTES = TITLE_DIMS / 4;

export type TitleCode = Uint8Array;

// Fixed forever: stored codes depend on these signs.
function signPattern(seed: number): Int8Array {
  let state = seed >>> 0;
  return Int8Array.from({ length: TITLE_DIMS }, () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state & 1 ? 1 : -1;
  });
}

const FIRST = signPattern(0x9e3779b9);
const SECOND = signPattern(0x85ebca6b);

function hadamard(values: Float64Array): void {
  for (let h = 1; h < values.length; h *= 2) {
    for (let i = 0; i < values.length; i += h * 2) {
      for (let j = i; j < i + h; j++) {
        const x = values[j]!;
        const y = values[j + h]!;
        values[j] = x + y;
        values[j + h] = x - y;
      }
    }
  }
}

function rotated(vector: Int8Array): Float64Array {
  const out = Float64Array.from({ length: TITLE_DIMS }, (_, i) => vector[i]! * FIRST[i]!);
  hadamard(out);
  for (let i = 0; i < TITLE_DIMS; i++) out[i]! *= SECOND[i]!;
  hadamard(out);
  return out;
}

// Lloyd-Max levels for 2 bits of a normal value, in standard deviations; quantizing keeps 1 - 0.1175 of
// a correlation, which similarity undoes.
const EDGE = 0.9816;
const LEVELS = [-1.51, -0.4528, 0.4528, 1.51] as const;
const KEPT = 0.8825;

// The model's int8 vector, as scripts/title-vectors.py sends it, to its stored code.
export function encodeTitleVector(vector: Int8Array): TitleCode | null {
  if (vector.length !== TITLE_DIMS) return null;
  const values = rotated(vector);
  let sum = 0;
  for (const value of values) sum += value * value;
  const edge = EDGE * Math.sqrt(sum / TITLE_DIMS);
  const code = new Uint8Array(TITLE_CODE_BYTES);
  for (let i = 0; i < TITLE_DIMS; i++) {
    const value = values[i]!;
    const level = value >= 0 ? (value > edge ? 3 : 2) : value < -edge ? 0 : 1;
    code[i >> 2]! |= level << ((i & 3) * 2);
  }
  return code;
}

export function titleCodeFrom(bytes: Uint8Array | null | undefined): TitleCode | null {
  if (!bytes) return null;
  if (bytes.length === TITLE_CODE_BYTES) return bytes;
  // A vector stored before codes: 256 int8 values.
  if (bytes.length === TITLE_DIMS)
    return encodeTitleVector(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return null;
}

// Every byte's four levels, and their sum of squares, read once.
const BYTE_LEVELS = Float64Array.from(
  { length: 256 * 4 },
  (_, n) => LEVELS[((n >> 2) >> ((n & 3) * 2)) & 3]!,
);

function normOf(code: TitleCode): number {
  let sum = 0;
  for (let i = 0; i < TITLE_CODE_BYTES; i++) {
    const at = code[i]! * 4;
    for (let k = 0; k < 4; k++) sum += BYTE_LEVELS[at + k]! ** 2;
  }
  return Math.sqrt(sum);
}

const norms = new WeakMap<TitleCode, number>();
const normFor = (code: TitleCode) => {
  let norm = norms.get(code);
  if (norm === undefined) norms.set(code, (norm = normOf(code)));
  return norm;
};

// The cosine of the two vectors the codes stand for.
export function codeSimilarity(a: TitleCode, b: TitleCode): number {
  let dot = 0;
  for (let i = 0; i < TITLE_CODE_BYTES; i++) {
    const x = a[i]! * 4;
    const y = b[i]! * 4;
    for (let k = 0; k < 4; k++) dot += BYTE_LEVELS[x + k]! * BYTE_LEVELS[y + k]!;
  }
  const scale = normFor(a) * normFor(b);
  return scale === 0 ? 0 : Math.max(-1, Math.min(1, dot / scale / KEPT));
}

export type WeightedCode = { code: TitleCode; weight: number };

// Several weighted titles as one direction, the latest counting most: the cosine with their weighted
// sum, worked out from the codes' own similarities.
export function blendSimilarity(parts: readonly WeightedCode[], code: TitleCode): number {
  let dot = 0;
  let norm = 0;
  for (const [i, a] of parts.entries()) {
    dot += a.weight * codeSimilarity(a.code, code);
    for (const [j, b] of parts.entries())
      norm += a.weight * b.weight * (i === j ? 1 : codeSimilarity(a.code, b.code));
  }
  return norm > 0 ? dot / Math.sqrt(norm) : 0;
}
