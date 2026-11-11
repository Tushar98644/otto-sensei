// The Download step cheers once for a copy the Tailor step just made, not on later opens.
let freshId: string | null = null;

export function noteFreshCopy(id: string): void {
  freshId = id;
}

export function isFreshCopy(id: string): boolean {
  return freshId === id;
}

export function forgetFreshCopy(): void {
  freshId = null;
}
