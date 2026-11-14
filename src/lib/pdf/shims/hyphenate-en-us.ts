// The PDF fonts register keepWordsWhole, so react-pdf's English hyphenator never runs.
export const syllables = (word: string): string[] => [word];
export const hyphenate = (word: string): string => word;
export const patterns: { patterns: string[]; exceptions: string[] } = {
  patterns: [],
  exceptions: [],
};
