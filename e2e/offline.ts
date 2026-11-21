// Preloaded into every Node process of the e2e server: a server-side fetch that leaves this machine fails and is logged.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);
const realFetch = globalThis.fetch;

function hostOf(input: RequestInfo | URL): string | null {
  try {
    return new URL(input instanceof Request ? input.url : String(input)).hostname;
  } catch {
    return null;
  }
}

globalThis.fetch = (input, init) => {
  const host = hostOf(input);
  if (host === null || LOCAL_HOSTS.has(host)) return realFetch(input, init);
  console.error(`[e2e offline] blocked a server-side request to ${host}`);
  return Promise.reject(new TypeError(`e2e runs offline: the request to ${host} was blocked`));
};
