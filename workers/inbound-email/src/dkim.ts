// DKIM (RFC 6376, 8463) and ARC message signatures (RFC 8617), checked here because Email Routing
// hands a Worker no trustworthy Authentication-Results of its own.

export type Resolver = (name: string) => Promise<string[] | null>;

export type AuthResult = { dkim: string[]; arc: string[] };

type Field = { name: string; raw: string };

const MAX_SIGNATURES = 6;

function fieldsOf(head: string): Field[] {
  const fields: Field[] = [];
  for (const line of head.split("\r\n")) {
    if (/^[ \t]/.test(line) && fields.length > 0) {
      fields[fields.length - 1]!.raw += `\r\n${line}`;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0) fields.push({ name: line.slice(0, colon).trim().toLowerCase(), raw: line });
  }
  return fields;
}

function tagsOf(value: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const part of value.split(";")) {
    const equals = part.indexOf("=");
    if (equals < 0) continue;
    tags.set(part.slice(0, equals).trim().toLowerCase(), part.slice(equals + 1).trim());
  }
  return tags;
}

const valueOf = (raw: string) => raw.slice(raw.indexOf(":") + 1);

function relaxedHeader(raw: string): string {
  const colon = raw.indexOf(":");
  const name = raw.slice(0, colon).trim().toLowerCase();
  const value = raw
    .slice(colon + 1)
    .replace(/\r\n(?=[ \t])/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
  return `${name}:${value}`;
}

export function canonicalBody(body: string, mode: string): string {
  const lines = body.replace(/\r?\n/g, "\r\n").split("\r\n");
  const kept =
    mode === "relaxed"
      ? lines.map((line) => line.replace(/[ \t]+/g, " ").replace(/ $/, ""))
      : lines;
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  if (kept.length === 0) return mode === "relaxed" ? "" : "\r\n";
  return `${kept.join("\r\n")}\r\n`;
}

function bytes(text: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index) & 0xff;
  return out;
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return bytes(atob(text.replace(/\s+/g, "")));
}

function toBase64(data: ArrayBuffer): string {
  let text = "";
  for (const byte of new Uint8Array(data)) text += String.fromCharCode(byte);
  return btoa(text);
}

async function sha256(data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

// The header fields h= names, each taken from the bottom up as RFC 6376 says.
function signedHeaders(fields: Field[], names: string[], relaxed: boolean): string {
  const used = new Set<number>();
  let out = "";
  for (const wanted of names) {
    for (let index = fields.length - 1; index >= 0; index--) {
      if (used.has(index) || fields[index]!.name !== wanted) continue;
      used.add(index);
      out += `${relaxed ? relaxedHeader(fields[index]!.raw) : fields[index]!.raw}\r\n`;
      break;
    }
  }
  return out;
}

function headerInput(fields: Field[], signature: Field, names: string[], relaxed: boolean): string {
  const unsigned = signature.raw.replace(/([;:]\s*b\s*=)[^;]*/, "$1");
  return `${signedHeaders(fields, names, relaxed)}${relaxed ? relaxedHeader(unsigned) : unsigned}`;
}

function parts(raw: string): { fields: Field[]; body: string } | null {
  const message = raw.replace(/\r?\n/g, "\r\n");
  const split = message.indexOf("\r\n\r\n");
  if (split < 0) return null;
  return { fields: fieldsOf(message.slice(0, split)), body: message.slice(split + 4) };
}

// What a signer signs for the first header of this name (relaxed): the tests sign with it.
export function signingInput(raw: string, headerName: string): string | null {
  const message = parts(raw);
  const signature = message?.fields.find((field) => field.name === headerName.toLowerCase());
  if (!message || !signature) return null;
  const names = (tagsOf(valueOf(signature.raw)).get("h") ?? "")
    .split(":")
    .map((name) => name.trim().toLowerCase());
  return headerInput(message.fields, signature, names, true);
}

async function keyFor(resolve: Resolver, selector: string, domain: string) {
  const records = await resolve(`${selector}._domainkey.${domain}`);
  const record = records?.find((text) => /(?:^|;)\s*p\s*=/.test(text));
  if (!record) return null;
  const tags = tagsOf(record);
  const p = (tags.get("p") ?? "").replace(/\s+/g, "");
  if (!p || (tags.has("v") && tags.get("v") !== "DKIM1")) return null;
  return { kind: tags.get("k") ?? "rsa", key: fromBase64(p) };
}

async function verifySignature(
  fields: Field[],
  body: string,
  signature: Field,
  resolve: Resolver,
  now: number,
): Promise<string | null> {
  const tags = tagsOf(valueOf(signature.raw));
  const algorithm = tags.get("a");
  const domain = tags.get("d")?.toLowerCase();
  const selector = tags.get("s");
  const names = (tags.get("h") ?? "")
    .split(":")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  const bodyHash = (tags.get("bh") ?? "").replace(/\s+/g, "");
  const value = (tags.get("b") ?? "").replace(/\s+/g, "");
  if (!domain || !selector || names.length === 0 || !bodyHash || !value) return null;
  if (algorithm !== "rsa-sha256" && algorithm !== "ed25519-sha256") return null;
  if (signature.name === "dkim-signature" && (tags.get("v") !== "1" || !names.includes("from")))
    return null;
  const expires = Number(tags.get("x"));
  if (tags.has("x") && Number.isFinite(expires) && expires * 1000 < now) return null;
  const [headerMode = "simple", bodyMode = "simple"] = (tags.get("c") ?? "simple/simple")
    .toLowerCase()
    .split("/");

  let canonical = canonicalBody(body, bodyMode);
  const length = Number(tags.get("l"));
  if (tags.has("l") && Number.isSafeInteger(length)) canonical = canonical.slice(0, length);
  if (toBase64(await sha256(bytes(canonical))) !== bodyHash) return null;

  const key = await keyFor(resolve, selector, domain);
  if (!key) return null;
  const data = bytes(headerInput(fields, signature, names, headerMode === "relaxed"));
  const proof = fromBase64(value);
  try {
    if (algorithm === "rsa-sha256" && key.kind === "rsa") {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        key.key,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      return (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, proof, data))
        ? domain
        : null;
    }
    if (algorithm === "ed25519-sha256" && key.kind === "ed25519") {
      const publicKey = await crypto.subtle.importKey("raw", key.key, { name: "Ed25519" }, false, [
        "verify",
      ]);
      return (await crypto.subtle.verify(
        "Ed25519",
        publicKey,
        proof,
        new Uint8Array(await sha256(data)),
      ))
        ? domain
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

// Every passing DKIM signature's domain, and the domain of the newest ARC hop's message signature.
export async function verifyAuth(
  raw: string,
  resolve: Resolver,
  now = Date.now(),
): Promise<AuthResult> {
  const message = parts(raw);
  if (!message) return { dkim: [], arc: [] };
  const { fields, body } = message;
  const dkimFields = fields
    .filter((field) => field.name === "dkim-signature")
    .slice(0, MAX_SIGNATURES);
  const arcFields = fields
    .filter((field) => field.name === "arc-message-signature")
    .map((field) => ({ field, instance: Number(tagsOf(valueOf(field.raw)).get("i")) }))
    .filter(({ instance }) => Number.isSafeInteger(instance))
    .sort((a, b) => b.instance - a.instance)
    .slice(0, 1);
  const check = (field: Field) =>
    verifySignature(fields, body, field, resolve, now).catch(() => null);
  const [dkim, arc] = await Promise.all([
    Promise.all(dkimFields.map(check)),
    Promise.all(arcFields.map(({ field }) => check(field))),
  ]);
  const unique = (list: (string | null)[]) => [
    ...new Set(list.filter((domain): domain is string => domain !== null)),
  ];
  return { dkim: unique(dkim), arc: unique(arc) };
}

const keyCache = new Map<string, string[] | null>();

// DNS over HTTPS through Cloudflare's resolver, remembered for the life of the Worker's isolate.
export function dohResolver(send: typeof fetch = fetch): Resolver {
  return async (name) => {
    if (keyCache.has(name)) return keyCache.get(name) ?? null;
    const response = await send(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
      {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) return null;
    const answer = (await response.json()) as {
      Status?: number;
      Answer?: { type: number; data: string }[];
    };
    const records =
      answer.Status === 0
        ? (answer.Answer ?? [])
            .filter((record) => record.type === 16)
            .map((record) =>
              (record.data.match(/"((?:[^"\\]|\\.)*)"/g) ?? [record.data])
                .map((part) => part.replace(/^"|"$/g, "").replace(/\\(.)/g, "$1"))
                .join(""),
            )
        : null;
    if (keyCache.size > 500) keyCache.clear();
    keyCache.set(name, records);
    return records;
  };
}
