// Dev only: Bun can't pin the address, so this re-resolves the host; never use it in production.

export async function sendPinned({ url, headers, signal, body }) {
  const method = body === undefined ? "GET" : "POST";
  const res = await fetch(url, { method, headers, body, signal, redirect: "manual" });
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
