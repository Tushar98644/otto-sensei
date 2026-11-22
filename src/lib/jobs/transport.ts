import type { LookupAddress } from "node:dns";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

// Connects only to the checked addresses: fetch() would resolve again (DNS rebinding).

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type PinnedRequest = {
  url: URL;
  addresses: readonly ResolvedAddress[];
  headers: Record<string, string>;
  signal: AbortSignal;
  body?: string;
};

export type PinnedResponse = {
  status: number;
  header: (name: string) => string | null;
  body: AsyncIterable<Uint8Array>;
  discard: () => void;
};

function pinnedLookup(addresses: readonly ResolvedAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    const family = options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family;
    const usable = family ? addresses.filter((entry) => entry.family === family) : addresses;
    if (usable.length === 0) {
      callback(Object.assign(new Error("No usable address"), { code: "ENOTFOUND" }), "", 0);
      return;
    }
    if (options.all) {
      const all: LookupAddress[] = usable.map(({ address, family }) => ({ address, family }));
      callback(null, all);
      return;
    }
    callback(null, usable[0]!.address, usable[0]!.family);
  };
}

function decoded(res: IncomingMessage): Readable | null {
  const encoding = (res.headers["content-encoding"] ?? "identity").trim().toLowerCase();
  const noop = () => undefined;
  if (encoding === "identity" || encoding === "") return res;
  if (encoding === "gzip" || encoding === "x-gzip") return pipeline(res, createGunzip(), noop);
  if (encoding === "deflate") return pipeline(res, createInflate(), noop);
  if (encoding === "br") return pipeline(res, createBrotliDecompress(), noop);
  return null;
}

export function sendPinned({
  url,
  addresses,
  headers,
  signal,
  body,
}: PinnedRequest): Promise<PinnedResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: url.hostname.replace(/^\[|\]$/g, ""),
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: body === undefined ? "GET" : "POST",
        headers,
        signal,
        // A fresh connection per request, so a pooled socket to an earlier host is never reused.
        agent: false,
        lookup: pinnedLookup(addresses),
      },
      (res) => {
        const stream = decoded(res);
        if (!stream) {
          res.destroy();
          reject(Object.assign(new Error("Unsupported content encoding"), { code: "EENCODING" }));
          return;
        }
        resolve({
          status: res.statusCode ?? 0,
          header: (name) => {
            const value = res.headers[name.toLowerCase()];
            return Array.isArray(value) ? value.join(", ") : (value ?? null);
          },
          body: stream,
          discard: () => res.destroy(),
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}
