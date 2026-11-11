import { describe, expect, it } from "vitest";
import { checkEligibility } from "@/lib/eligibility/check";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { companyKey, sponsorRegions, visaLines } from "./visa";
import { h1bApprovals, ukSkilledWorkers, visaRows } from "./visa-registers";

const NOW = Date.UTC(2026, 10, 9);

describe("visa facts", () => {
  it("folds company names without guessing", () => {
    expect(companyKey("Monzo Bank Ltd.")).toBe("monzo bank");
    expect(companyKey("STRIPE, INC.")).toBe("stripe");
    expect(companyKey("Databricks UK Limited")).toBe("databricks");
    expect(companyKey("AT&T Services, Inc.")).toBe("at and t services");
    expect(companyKey("Chime Software Limited")).not.toBe(companyKey("Chime"));
  });

  it("states facts, never a promise, and drops old petitions", () => {
    expect(visaLines({ ukSponsor: true, h1bYear: 2025 }, NOW)).toEqual([
      "Listed as a UK visa sponsor",
      "H-1B visa petitions approved in fiscal 2025 (USCIS)",
    ]);
    expect(visaLines({ ukSponsor: false, h1bYear: 2019 }, NOW)).toEqual([]);
    expect(visaLines(null, NOW)).toEqual([]);
    expect([...visaLines({ ukSponsor: true, h1bYear: 2026 }, NOW)].join(" ")).not.toMatch(
      /will sponsor|sponsors you/i,
    );
    expect(sponsorRegions({ ukSponsor: true, h1bYear: 2025 }, NOW)).toEqual(["uk", "us"]);
  });

  it("turns a blocked work-rights line into one to ask about for a listed sponsor", () => {
    const profile = {
      ...emptyWorkProfile(),
      country: "IE",
      rights: { us: null, uk: "sponsorship" as const, eu: "authorized" as const, ca: null },
    };
    const post = {
      location: "London, United Kingdom",
      text: "You must have the right to work in the UK.",
    };
    const plain = checkEligibility(post, profile, { now: NOW });
    expect(plain.some((finding) => finding.verdict === "blocked")).toBe(true);
    const listed = checkEligibility(post, profile, { now: NOW, sponsorRegions: ["uk"] });
    expect(listed.some((finding) => finding.verdict === "blocked")).toBe(false);
    expect(listed.map((finding) => finding.note).join(" ")).toContain(
      "listed as a UK visa sponsor",
    );
    const refuses = checkEligibility(
      { ...post, text: "We are unable to sponsor visas for this role." },
      profile,
      { now: NOW, sponsorRegions: ["uk"] },
    );
    expect(refuses.some((finding) => finding.verdict === "blocked")).toBe(true);
  });
});

describe("visa registers", () => {
  const UK = [
    "Organisation Name,Town/City,County,Type & Rating,Route",
    "Stripe Payments UK Ltd,London,,Worker (A rating),Skilled Worker",
    '"Acme, Ltd",Leeds,,Worker (A rating),Skilled Worker',
    "Chime Software Limited,Kings Langley,,Worker (A rating),Skilled Worker",
    "Tide Platform Ltd,London,,Temporary Worker (A rating),Creative Worker",
  ].join("\r\n");
  const H1B = [
    '"Fiscal Year",Employer,"Initial Approval","Initial Denial","Continuing Approval","Continuing Denial",NAICS,"Tax ID",State,City,ZIP',
    '2023,"STRIPE INC",10,0,"1,054",0,52,1234,CA,"S SAN FRAN",94080',
    "2023,TIDE INC,0,3,0,0,52,1,NY,NEW YORK,10001",
  ].join("\n");

  it("reads the files as published", () => {
    const uk = ukSkilledWorkers(UK);
    expect([...uk]).toEqual(["Stripe Payments UK Ltd", "Acme, Ltd", "Chime Software Limited"]);
    const us = h1bApprovals(H1B);
    expect(us.year).toBe(2023);
    expect(us.approvals.get("STRIPE INC")).toBe(1_064);
    expect(us.approvals.has("TIDE INC")).toBe(false);
  });

  it("only uses the hand-checked names, so a lookalike never counts", () => {
    const rows = visaRows(
      {
        Stripe: { uk: ["Stripe Payments UK Ltd"], us: ["STRIPE INC"] },
        Chime: { us: ["CHIME FINANCIAL INC"] },
        Tide: { uk: ["Tide Platform Ltd"] },
      },
      ukSkilledWorkers(UK),
      [h1bApprovals(H1B)],
      NOW,
    );
    expect(rows).toEqual([
      {
        companyKey: "stripe",
        ukName: "Stripe Payments UK Ltd",
        h1bYear: 2023,
        h1bApprovals: 1_064,
        usName: "STRIPE INC",
        checkedAt: NOW,
      },
    ]);
  });
});
