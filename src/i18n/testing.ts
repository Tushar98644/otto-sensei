// Stands in for next/root-params under vitest (vitest.config.mts aliases it here); Next's compiler provides the real one.
let current: string | undefined = "en";

export async function lang(): Promise<string | undefined> {
  return current;
}

export function setRootLang(value: string | undefined): void {
  current = value;
}
