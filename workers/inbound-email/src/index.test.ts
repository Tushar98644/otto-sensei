import { describe, expect, it, vi } from "vitest";
import { handleEmail, MAX_MESSAGE_BYTES, MAX_READ_BYTES } from "./index";
import { sign, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./sign";
import type { Env, IncomingEmail } from "./types";

const ENV: Env = {
  INBOUND_URL: "https://www.ottosensei.com/api/inbound/email",
  INBOUND_DOMAINS: "track.ottosensei.com, jobs.example",
  INBOUND_EMAIL_SECRET: "test-secret-that-is-long-enough-for-otto-1234",
};
const NOW = 1_763_290_000_000;
const RAW =
  "From: Quill <no-reply@ashbyhq.com>\r\nSubject: Thanks for applying to Quill!\r\nMessage-ID: <q1@ashbyhq.com>\r\n\r\nWe received your application.\r\n";

function message(to = "otto+priya@track.ottosensei.com", raw = RAW, rawSize?: number) {
  const bytes = new TextEncoder().encode(raw);
  const rejected: string[] = [];
  const email: IncomingEmail = {
    from: "bounce@gmail.com",
    to,
    raw: new Blob([bytes]).stream(),
    rawSize: rawSize ?? bytes.byteLength,
    setReject: (reason) => rejected.push(reason),
  };
  return { email, rejected };
}

const noKeys = async () => null;

function answer(status: number) {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response("{}", { status }),
  );
}

describe("the email Worker", () => {
  it("posts the text and a signature over it to Otto", async () => {
    const send = answer(200);
    const { email, rejected } = message();
    await handleEmail(email, ENV, send as unknown as typeof fetch, NOW, noKeys);
    expect(rejected).toEqual([]);
    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe(ENV.INBOUND_URL);
    const headers = init!.headers as Record<string, string>;
    const body = init!.body as string;
    expect(headers[TIMESTAMP_HEADER]).toBe(String(NOW / 1000));
    expect(headers[SIGNATURE_HEADER]).toBe(await sign(ENV.INBOUND_EMAIL_SECRET, NOW / 1000, body));
    expect(JSON.parse(body)).toEqual({
      v: 1,
      to: "otto+priya@track.ottosensei.com",
      envelopeFrom: "bounce@gmail.com",
      auth: { dkim: [], arc: [] },
      from: "Quill <no-reply@ashbyhq.com>",
      subject: "Thanks for applying to Quill!",
      date: null,
      messageId: "<q1@ashbyhq.com>",
      headers: {},
      text: "We received your application.",
      truncated: false,
    });
  });

  it("takes mail for each of its domains", async () => {
    const send = answer(200);
    const { email, rejected } = message("priya@jobs.example");
    await handleEmail(email, ENV, send as unknown as typeof fetch, NOW, noKeys);
    expect(rejected).toEqual([]);
    expect(send).toHaveBeenCalledOnce();
  });

  it("refuses mail for other domains and outsized mail without reading it", async () => {
    const send = answer(200);
    const other = message("someone@ottosensei.com");
    await handleEmail(other.email, ENV, send as unknown as typeof fetch, NOW, noKeys);
    expect(other.rejected).toEqual(["Unknown address"]);
    const huge = message(undefined, RAW, MAX_MESSAGE_BYTES + 1);
    await handleEmail(huge.email, ENV, send as unknown as typeof fetch, NOW, noKeys);
    expect(huge.rejected).toEqual(["Message too large"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("reads only the first megabyte of a large message", async () => {
    const send = answer(200);
    const { email } = message(undefined, `${RAW}${"x".repeat(MAX_READ_BYTES)}`);
    await handleEmail(email, ENV, send as unknown as typeof fetch, NOW, noKeys);
    expect(JSON.parse(send.mock.calls[0]![1]!.body as string).truncated).toBe(true);
  });

  it("bounces an address Otto doesn't know, and fails loudly on anything else", async () => {
    const gone = message();
    await handleEmail(gone.email, ENV, answer(404) as unknown as typeof fetch, NOW, noKeys);
    expect(gone.rejected).toEqual(["No such address"]);
    const down = message();
    await expect(
      handleEmail(down.email, ENV, answer(503) as unknown as typeof fetch, NOW, noKeys),
    ).rejects.toThrow("503");
    expect(down.rejected).toEqual([]);
  });
});
