// Dev script only (scripts/jobs-ingest.ts): loaded in place of src/lib/jobs/transport.ts under
// Bun, whose node:https checks the certificate against the pinned address and so refuses every
// host. The URL and DNS checks in safeFetch still run first; only the final connection uses Bun's
// fetch, which looks the host up again. That gap is acceptable for a local script reading a fixed
// list of public boards; the production cron runs on Node and keeps the pinned connection.
// Plain JavaScript because Bun's runtime plugins load replacement source as JavaScript.

/** @param {{ url: URL, headers: Record<string, string>, signal: AbortSignal }} request */
export async function sendPinned({ url, headers, signal }) {
  const res = await fetch(url, { headers, signal, redirect: "manual" });
  const reader = res.body?.getReader();
  return {
    status: res.status,
    header: (name) => res.headers.get(name),
    body: {
      async *[Symbol.asyncIterator]() {
        if (!reader) return;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          yield value;
        }
      },
    },
    discard: () => void reader?.cancel().catch(() => undefined),
  };
}
