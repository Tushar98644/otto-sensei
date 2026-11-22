import { describe, expect, it } from "vitest";
import { forwardedByStranger, registrable, trustOf, type TrustInput } from "./trust";

const TO = "otto+priya@track.ottosensei.com";
const GMAIL = "priya.sharma@gmail.com";

function input(overrides: Partial<TrustInput> = {}): TrustInput {
  return {
    from: "Northwind Talent <no-reply@us.greenhouse-mail.io>",
    envelopeFrom: "",
    headers: {},
    auth: { dkim: [], arc: [] },
    sources: [GMAIL],
    accountEmail: "priya@example.com",
    companies: ["Northwind"],
    ...overrides,
  };
}

const forwarded = {
  envelopeFrom: `priya.sharma+caf_=${TO.replace("@", "=")}@gmail.com`,
  headers: { "x-forwarded-for": `${GMAIL} ${TO}`, "x-forwarded-to": TO },
};

describe("which emails move cards on their own", () => {
  it("trusts Gmail's own forward from the confirmed mailbox", () => {
    expect(trustOf(input({ ...forwarded, auth: { dkim: [], arc: ["google.com"] } }))).toBe(
      "source",
    );
    // Google signed it and the +caf_ envelope names the mailbox, even without an ARC seal.
    expect(trustOf(input({ ...forwarded, auth: { dkim: ["gmail.com"], arc: [] } }))).toBe("source");
  });

  it("doesn't trust forwarding headers Google didn't seal, or that disagree with the envelope", () => {
    expect(trustOf(input({ ...forwarded }))).toBeNull();
    const other = { ...forwarded, envelopeFrom: "someone+caf_=x@gmail.com" };
    expect(trustOf(input({ ...other, auth: { dkim: [], arc: ["google.com"] } }))).toBeNull();
    const lookalike = { ...forwarded, auth: { dkim: [], arc: ["google.com.evil.example"] } };
    expect(trustOf(input(lookalike))).toBeNull();
  });

  it("trusts a hiring system or the employer when they signed it", () => {
    expect(trustOf(input({ auth: { dkim: ["greenhouse-mail.io"], arc: [] } }))).toBe("sender");
    expect(
      trustOf(
        input({
          from: "Fernbrook <no-reply@hire.lever.co>",
          auth: { dkim: ["lever.co"], arc: [] },
        }),
      ),
    ).toBe("sender");
    const employer = input({
      from: "Jordan <jordan@northwind.com>",
      auth: { dkim: ["northwind.com"], arc: [] },
    });
    expect(trustOf(employer)).toBe("sender");
    expect(
      trustOf(
        input({
          from: "Scheduler <no-reply@calendly.com>",
          auth: { dkim: ["calendly.com"], arc: [] },
        }),
      ),
    ).toBe("sender");
  });

  it("doesn't trust a stranger who writes as a hiring system or the employer", () => {
    // A guessed address and a forged From: nobody signed for greenhouse-mail.io.
    expect(trustOf(input())).toBeNull();
    expect(trustOf(input({ auth: { dkim: ["attacker.example"], arc: [] } }))).toBeNull();
    // Signed, but by a domain that isn't the employer's.
    const fake = input({
      from: "HR <hr@northwind-careers.example>",
      auth: { dkim: ["northwind-careers.example"], arc: [] },
    });
    expect(trustOf(fake)).toBeNull();
    // Their own Gmail, signed, with a made-up forwarding header.
    const gmail = input({
      from: "Northwind <stranger@gmail.com>",
      envelopeFrom: "stranger@gmail.com",
      headers: forwarded.headers,
      auth: { dkim: ["gmail.com"], arc: [] },
    });
    expect(trustOf(gmail)).toBeNull();
  });

  it("trusts what the person forwards by hand from their own signed mailbox", () => {
    expect(
      trustOf(input({ from: `Priya <${GMAIL}>`, auth: { dkim: ["gmail.com"], arc: [] } })),
    ).toBe("source");
    expect(
      trustOf(
        input({ from: "Priya <priya@example.com>", auth: { dkim: ["example.com"], arc: [] } }),
      ),
    ).toBe("source");
    expect(trustOf(input({ from: `Priya <${GMAIL}>` }))).toBeNull();
  });

  it("knows when another mailbox is forwarding here", () => {
    const stranger = {
      envelopeFrom: `someone.else+caf_=${TO.replace("@", "=")}@gmail.com`,
      headers: { "x-forwarded-for": `someone.else@gmail.com ${TO}` },
      auth: { dkim: [], arc: ["google.com"] },
    };
    expect(forwardedByStranger(input(stranger))).toBe(true);
    expect(
      forwardedByStranger(input({ ...forwarded, auth: { dkim: [], arc: ["google.com"] } })),
    ).toBe(false);
  });

  it("compares organisations, not hosts", () => {
    expect(registrable("us.greenhouse-mail.io")).toBe("greenhouse-mail.io");
    expect(registrable("careers.tidewater.co.uk")).toBe("tidewater.co.uk");
    expect(registrable("mail.nilgirisoft.co.in")).toBe("nilgirisoft.co.in");
  });
});
