import { describe, expect, it } from "vitest";
import { canonicalBody, signingInput, verifyAuth, type Resolver } from "./dkim";

// RFC 8463, Appendix A: one message signed with Ed25519 and RSA, and the keys' DNS records.
const RFC_KEYS: Record<string, string> = {
  "brisbane._domainkey.football.example.com":
    "v=DKIM1; k=ed25519; p=11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=",
  "test._domainkey.football.example.com":
    "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDkHlOQoBTzWRiGs5V6NpP3idY6Wk08a5qhdR6wy5bdOKb2jLQiY/J16JYi0Qvx/byYzCNb3W91y3FutACDfzwQ/BC/e/8uBsCR+yz1Lxj+PL6lHvqMKrM3rG4hstT5QjvHO9PzoxZyVYLzBfO2EeC3Ip3G+2kryOTIKT+l/K4w3QIDAQAB",
};

const RFC_HEADERS = [
  "DKIM-Signature: v=1; a=ed25519-sha256; c=relaxed/relaxed;",
  " d=football.example.com; i=@football.example.com;",
  " q=dns/txt; s=brisbane; t=1528637909; h=from : to :",
  " subject : date : message-id : from : subject : date;",
  " bh=2jUSOH9NhtVGCQWNr9BrIAPreKQjO6Sn7XIkfJVOzv8=;",
  " b=/gCrinpcQOoIfuHNQIbq4pgh9kyIK3AQUdt9OdqQehSwhEIug4D11Bus",
  " Fa3bT3FY5OsU7ZbnKELq+eXdp1Q1Dw==",
  "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;",
  " d=football.example.com; i=@football.example.com;",
  " q=dns/txt; s=test; t=1528637909; h=from : to : subject :",
  " date : message-id : from : subject : date;",
  " bh=2jUSOH9NhtVGCQWNr9BrIAPreKQjO6Sn7XIkfJVOzv8=;",
  " b=F45dVWDfMbQDGHJFlXUNB2HKfbCeLRyhDXgFpEL8GwpsRe0IeIixNTe3",
  " DhCVlUrSjV4BwcVcOF6+FF3Zo9Rpo1tFOeS9mPYQTnGdaSGsgeefOsk2Jz",
  " dA+L10TeYt9BgDfQNZtKdN1WO//KgIqXP7OdEFE4LjFYNcUxZQ4FADY+8=",
];
const RFC_FIELDS = [
  "From: Joe SixPack <joe@football.example.com>",
  "To: Suzie Q <suzie@shopping.example.net>",
  "Subject: Is dinner ready?",
  "Date: Fri, 11 Jul 2003 21:00:37 -0700 (PDT)",
  "Message-ID: <20030712040037.46341.5F8J@football.example.com>",
];
const RFC_BODY = "Hi.\r\n\r\nWe lost the game.  Are you hungry yet?\r\n\r\nJoe.\r\n\r\n";

const message = (headers: string[], fields = RFC_FIELDS, body = RFC_BODY) =>
  `${[...headers, ...fields].join("\r\n")}\r\n\r\n${body}`;

const resolver =
  (keys: Record<string, string>): Resolver =>
  async (name) =>
    keys[name] ? [keys[name]] : null;

const NOW = Date.UTC(2026, 10, 20);

describe("DKIM", () => {
  it("passes the RFC 8463 message's Ed25519 and RSA signatures", async () => {
    const ed25519 = await verifyAuth(message(RFC_HEADERS.slice(0, 7)), resolver(RFC_KEYS), NOW);
    expect(ed25519.dkim).toEqual(["football.example.com"]);
    const rsa = await verifyAuth(message(RFC_HEADERS.slice(7)), resolver(RFC_KEYS), NOW);
    expect(rsa.dkim).toEqual(["football.example.com"]);
  });

  it("fails when the body, a signed header or the key is not the signer's", async () => {
    const body = await verifyAuth(
      message(RFC_HEADERS, RFC_FIELDS, RFC_BODY.replace("hungry", "angry")),
      resolver(RFC_KEYS),
      NOW,
    );
    expect(body.dkim).toEqual([]);
    const fields = RFC_FIELDS.map((line) =>
      line.replace("Is dinner ready?", "Your application was rejected"),
    );
    expect((await verifyAuth(message(RFC_HEADERS, fields), resolver(RFC_KEYS), NOW)).dkim).toEqual(
      [],
    );
    expect((await verifyAuth(message(RFC_HEADERS), resolver({}), NOW)).dkim).toEqual([]);
    const swapped = {
      "test._domainkey.football.example.com": RFC_KEYS[
        "test._domainkey.football.example.com"
      ]!.replace("MIGfMA0", "MIGfMA1"),
    };
    expect((await verifyAuth(message(RFC_HEADERS.slice(7)), resolver(swapped), NOW)).dkim).toEqual(
      [],
    );
  });

  it("ignores how a relaxed signature's lines and folding were changed on the way", async () => {
    const folded = RFC_FIELDS.map((line) =>
      line.replace("Subject: Is dinner ready?", "Subject:   Is dinner\r\n\tready?  "),
    );
    const body = RFC_BODY.replace("Are you", "Are   you").replace("Joe.\r\n", "Joe.  \r\n\r\n\r\n");
    expect(
      (await verifyAuth(message(RFC_HEADERS, folded, body), resolver(RFC_KEYS), NOW)).dkim,
    ).toEqual(["football.example.com"]);
  });

  it("reads only the newest ARC message signature", async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const spki = Buffer.from(await crypto.subtle.exportKey("spki", pair.publicKey)).toString(
      "base64",
    );
    const keys = { "arc-2026._domainkey.google.com": `k=rsa; p=${spki}` };
    const bh = Buffer.from(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalBody(RFC_BODY, "relaxed")),
      ),
    ).toString("base64");
    const hop = (instance: number) =>
      `ARC-Message-Signature: i=${instance}; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-2026;\r\n h=from:to:subject:date:message-id; bh=${bh};\r\n b=`;
    const unsigned = message([hop(2), hop(1)]);
    const input = signingInput(unsigned, "arc-message-signature")!;
    const proof = Buffer.from(
      await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        pair.privateKey,
        new TextEncoder().encode(input),
      ),
    ).toString("base64");
    const signed = message([`${hop(2)}${proof}`, `${hop(1)}c2lnbmVkIGJ5IHNvbWVvbmUgZWxzZQ==`]);
    expect(await verifyAuth(signed, resolver(keys), NOW)).toEqual({
      dkim: [],
      arc: ["google.com"],
    });
    const forged = signed.replace("Subject: Is dinner ready?", "Subject: Unfortunately");
    expect(await verifyAuth(forged, resolver(keys), NOW)).toEqual({ dkim: [], arc: [] });
  });

  it("canonicalises bodies as RFC 6376 does", () => {
    expect(canonicalBody("", "simple")).toBe("\r\n");
    expect(canonicalBody("", "relaxed")).toBe("");
    expect(canonicalBody(" C \r\nD \t E\r\n\r\n\r\n", "relaxed")).toBe(" C\r\nD E\r\n");
    expect(canonicalBody(" C \r\nD \t E\r\n\r\n\r\n", "simple")).toBe(" C \r\nD \t E\r\n");
  });
});
