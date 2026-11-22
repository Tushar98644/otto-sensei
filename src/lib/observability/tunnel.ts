type Dsn = { origin: string; prefix: string; publicKey: string; projectId: string };

function parseDsn(value: string | undefined): Dsn | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const projectId = parts.pop();
    if (!url.username || !projectId || !/^\d+$/.test(projectId)) return null;
    const prefix = parts.length ? `/${parts.join("/")}` : "";
    return { origin: url.origin, prefix, publicKey: url.username, projectId };
  } catch {
    return null;
  }
}

function envelopeDsn(envelope: string): string | undefined {
  const end = envelope.indexOf("\n");
  try {
    const header: unknown = JSON.parse(end === -1 ? envelope : envelope.slice(0, end));
    if (typeof header !== "object" || header === null || !("dsn" in header)) return undefined;
    return typeof header.dsn === "string" ? header.dsn : undefined;
  } catch {
    return undefined;
  }
}

// Only our own project: the address is built from our DSN, so the relay can't be pointed anywhere else.
export function envelopeTarget(envelope: string, ownDsn: string | undefined): string | null {
  const own = parseDsn(ownDsn);
  const sent = parseDsn(envelopeDsn(envelope));
  if (!own || !sent) return null;
  if (sent.origin !== own.origin || sent.projectId !== own.projectId) return null;
  if (sent.publicKey !== own.publicKey) return null;
  return `${own.origin}${own.prefix}/api/${own.projectId}/envelope/`;
}
