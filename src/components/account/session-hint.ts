// Not the session and not a secret: a flag scripts can read, since the auth cookies are httpOnly.
export const SESSION_HINT_COOKIE = "otto_si";

// Browsers keep a cookie 400 days at most.
const MAX_AGE_S = 400 * 24 * 60 * 60;

function write(value: string, maxAgeS: number): void {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_HINT_COOKIE}=${value}; Max-Age=${maxAgeS}; Path=/; SameSite=Lax${secure}`;
}

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  const prefix = `${SESSION_HINT_COOKIE}=`;
  return document.cookie.split("; ").some((entry) => entry.startsWith(prefix));
}

export function setSessionHint(): void {
  if (typeof document !== "undefined") write("1", MAX_AGE_S);
}

export function clearSessionHint(): void {
  if (hasSessionHint()) write("", 0);
}
