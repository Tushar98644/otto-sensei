// Covers sending a sign-in email, the slowest Auth call; normal calls take tens of ms.
export const AUTH_DEADLINE_MS = 8_000;

// One deadline for all of a client's calls: auth-js retries a stalled token refresh for up to 30 s.
export function fetchWithDeadline(ms = AUTH_DEADLINE_MS): typeof fetch {
  const deadline = AbortSignal.timeout(ms);
  return (input, init) =>
    fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline,
    });
}
