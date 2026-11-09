import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSiteIcon } from "./media-upload";

const PNG = new Uint8Array([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  ...new Array(24).fill(0),
]);

function stubFetch(handler: (url: URL) => Response) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      calls.push(url.href);
      return handler(url);
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("a website's icon as a logo", () => {
  it("asks only the icon service, with the site's host name", async () => {
    const calls = stubFetch(() => new Response(PNG, { headers: { "content-type": "image/png" } }));
    expect(await fetchSiteIcon("https://www.ledgerly.example/about?x=1")).toEqual(PNG);
    expect(calls).toEqual([
      "https://www.google.com/s2/favicons?domain=www.ledgerly.example&sz=128",
    ]);
  });

  it("follows the service's own redirect, never one to anywhere else", async () => {
    stubFetch((url) =>
      url.hostname === "www.google.com"
        ? new Response(null, {
            status: 302,
            headers: { location: "https://t1.gstatic.com/faviconV2?url=x" },
          })
        : new Response(PNG),
    );
    expect(await fetchSiteIcon("ledgerly.example")).toEqual(PNG);
    stubFetch(
      () =>
        new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }),
    );
    expect(await fetchSiteIcon("ledgerly.example")).toBeNull();
  });

  it("gives null for no icon, a non-image or a bad address", async () => {
    stubFetch(() => new Response(PNG, { status: 404 }));
    expect(await fetchSiteIcon("ledgerly.example")).toBeNull();
    stubFetch(() => new Response("<html>"));
    expect(await fetchSiteIcon("ledgerly.example")).toBeNull();
    const calls = stubFetch(() => new Response(PNG));
    expect(await fetchSiteIcon("javascript:alert(1)")).toBeNull();
    expect(calls).toEqual([]);
  });
});
