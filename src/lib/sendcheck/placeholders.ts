const PATTERNS: readonly RegExp[] = [
  /\[[^[\]\n]{0,60}?\p{L}[^[\]\n]{0,60}?\](?!\()/gu,
  /\{\{?[^{}\n]{0,60}?\p{L}[^{}\n]{0,60}?\}\}?/gu,
  /(?<![\p{L}\p{N}])(?:X{2,}|x{3,})(?![\p{L}\p{N}])/gu,
  /(?<![\p{L}\p{N}])(?:TODO|TBD|FIXME|lorem ipsum)(?![\p{L}\p{N}])/giu,
  /\binsert\s[\p{L} ]{1,30}?\shere\b/giu,
];

export function findPlaceholders(text: string): string[] {
  const found: { at: number; text: string }[] = [];
  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) found.push({ at: match.index, text: match[0] });
  }
  return found.sort((a, b) => a.at - b.at).map((item) => item.text);
}
