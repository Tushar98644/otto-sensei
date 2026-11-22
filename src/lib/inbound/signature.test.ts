import { describe, expect, it } from "vitest";
import { signedHeaders } from "../../../workers/inbound-email/src/sign";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyInbound } from "./signature";

const SECRET = "inbound-signing-secret-for-tests-only-0123456789";
const NOW = 1_763_290_000_000;
const BODY = JSON.stringify({ v: 1, to: "otto+x@track.ottosensei.com", subject: "Thanks ✨" });

async function headersAt(at: number, body = BODY, secret = SECRET): Promise<Headers> {
  return new Headers(await signedHeaders(secret, body, at));
}

describe("the Worker's signature", () => {
  it("passes when the Worker signed this body with this secret just now", async () => {
    expect(verifyInbound(BODY, await headersAt(NOW), SECRET, NOW + 2_000)).toBe("valid");
  });

  it("is refused when the body, the secret or the time is off", async () => {
    expect(verifyInbound(`${BODY} `, await headersAt(NOW), SECRET, NOW)).toBe("mismatch");
    expect(verifyInbound(BODY, await headersAt(NOW, BODY, `${SECRET}!`), SECRET, NOW)).toBe(
      "mismatch",
    );
    expect(verifyInbound(BODY, await headersAt(NOW - 5 * 60_000 - 1_000), SECRET, NOW)).toBe(
      "stale",
    );
    expect(verifyInbound(BODY, await headersAt(NOW + 6 * 60_000), SECRET, NOW)).toBe("stale");
  });

  it("is refused when it's missing or not in the v1 form", async () => {
    const signed = await headersAt(NOW);
    expect(verifyInbound(BODY, new Headers(), SECRET, NOW)).toBe("missing");
    const bare = new Headers(signed);
    bare.set(SIGNATURE_HEADER, signed.get(SIGNATURE_HEADER)!.slice(3));
    expect(verifyInbound(BODY, bare, SECRET, NOW)).toBe("malformed");
    const late = new Headers(signed);
    late.set(TIMESTAMP_HEADER, "soon");
    expect(verifyInbound(BODY, late, SECRET, NOW)).toBe("malformed");
  });
});
