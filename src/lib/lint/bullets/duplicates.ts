const NEAR_DUPLICATE_PERCENT = 85;
const NEAR_DUPLICATE_MIN_TOKENS = 4;

function isNearDuplicate(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap * 100 >= (a.size + b.size - overlap) * NEAR_DUPLICATE_PERCENT;
}

function markNearDuplicates(lines: readonly (readonly string[])[], into: Set<number>): void {
  type Entry = { index: number; set: Set<string>; ordered: string[] };
  const entries: Entry[] = [];
  lines.forEach((words, index) => {
    if (words.length < NEAR_DUPLICATE_MIN_TOKENS) return;
    const set = new Set(words);
    entries.push({ index, set, ordered: [...set] });
  });
  const frequency = new Map<string, number>();
  for (const entry of entries) {
    for (const token of entry.ordered) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  const rarity = (token: string) => frequency.get(token) ?? 0;
  for (const entry of entries) {
    entry.ordered.sort((a, b) => rarity(a) - rarity(b) || (a < b ? -1 : a > b ? 1 : 0));
  }
  entries.sort((a, b) => a.set.size - b.set.size);

  const postings = new Map<string, Entry[]>();
  for (const entry of entries) {
    const size = entry.set.size;
    const prefix = size - Math.ceil((size * NEAR_DUPLICATE_PERCENT) / 100) + 1;
    const compared = new Set<Entry>();
    for (const token of entry.ordered.slice(0, prefix)) {
      const list = postings.get(token);
      for (const other of list ?? []) {
        if (compared.has(other)) continue;
        compared.add(other);
        if (other.set.size * 100 < size * NEAR_DUPLICATE_PERCENT) continue;
        if (isNearDuplicate(entry.set, other.set)) {
          into.add(entry.index);
          into.add(other.index);
        }
      }
      if (list) list.push(entry);
      else postings.set(token, [entry]);
    }
  }
}

export function findDuplicates(lines: readonly (readonly string[])[]): Set<number> {
  const duplicates = new Set<number>();
  const byText = new Map<string, number[]>();
  lines.forEach((words, index) => {
    if (words.length === 0) return;
    const key = words.join(" ");
    const group = byText.get(key);
    if (group) group.push(index);
    else byText.set(key, [index]);
  });
  for (const group of byText.values()) {
    if (group.length > 1) for (const index of group) duplicates.add(index);
  }
  markNearDuplicates(lines, duplicates);
  return duplicates;
}
