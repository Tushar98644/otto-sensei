import type { LookupAddress } from "node:dns";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

// Connects only to addresses the caller checked: fetch() would resolve the host again, and a DNS
// server could answer public then private (DNS rebinding).

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type PinnedRequest = {
  url: URL;
  addresses: readonly ResolvedAddress[];
  headers: Record<string, string>;
  signal: AbortSignal;
};

export type PinnedResponse = {
  status: number;
  header: (name: string) => string | null;
  // Decompressed. Errors if the request is aborted mid-body.
  body: AsyncIterable<Uint8Array>;
  // Drops the connection without reading the body (redirects and errors).
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
}: PinnedRequest): Promise<PinnedResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: url.hostname.replace(/^\[|\]$/g, ""),
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers,
        signal,
        // A fresh connection per request, so a pooled socket to an earlier host is never reused.
        agent: false,
        lookup: pinnedLookup(addresses),
      },
      (res) => {
        const body = decoded(res);
        if (!body) {
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
          body,
          discard: () => res.destroy(),
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}
