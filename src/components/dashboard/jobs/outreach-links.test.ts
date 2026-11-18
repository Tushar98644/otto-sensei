import { describe, expect, it } from "vitest";
import {
  gmailUrl,
  hiringPeopleUrl,
  linkedInPeopleUrl,
  MAILTO_MAX_CHARS,
  mailtoLink,
  outlookUrl,
  placeholderIn,
  postEmails,
  roleKeyword,
  searchName,
  teamPageUrl,
} from "./outreach-links";

function query(url: string, name = "q"): string | null {
  return new URL(url).searchParams.get(name);
}

describe("roleKeyword", () => {
  it("drops seniority words and keeps the role", () => {
    expect(roleKeyword("Senior Backend Engineer")).toBe("Backend Engineer");
    expect(roleKeyword("Sr. Product Designer")).toBe("Product Designer");
    expect(roleKeyword("Lead Data Scientist")).toBe("Data Scientist");
    expect(roleKeyword("Staff Software Engineer II")).toBe("Software Engineer");
    expect(roleKeyword("Junior Account Executive")).toBe("Account Executive");
    expect(roleKeyword("Principal Engineer L6")).toBe("Engineer");
  });

  it("splits on punctuation and keeps only the first part with words left", () => {
    expect(roleKeyword("Senior Backend Engineer, Payments (Remote)")).toBe("Backend Engineer");
    expect(roleKeyword("Software Engineer - Infrastructure")).toBe("Software Engineer");
    expect(roleKeyword("Designer | Growth")).toBe("Designer");
    expect(roleKeyword("Senior / Machine Learning Engineer")).toBe("Machine Learning Engineer");
    expect(roleKeyword("Customer Success Manager (m/f/d)")).toBe("Customer Success Manager");
    expect(roleKeyword("Software Engineer m/w/d")).toBe("Software Engineer");
  });

  it("keeps a slash without spaces inside the role", () => {
    expect(roleKeyword("UI/UX Designer")).toBe("UI/UX Designer");
    expect(roleKeyword("Senior AI/ML Engineer")).toBe("AI/ML Engineer");
    expect(roleKeyword("Sales/Marketing Manager")).toBe("Sales/Marketing Manager");
  });

  it("keeps Lead and Associate when they end the title, since there they name the role", () => {
    expect(roleKeyword("Tech Lead")).toBe("Tech Lead");
    expect(roleKeyword("Team Lead, Payments")).toBe("Team Lead");
    expect(roleKeyword("Sales Associate")).toBe("Sales Associate");
    expect(roleKeyword("Associate Product Manager")).toBe("Product Manager");
    expect(roleKeyword("Frontend Engineer Remote")).toBe("Frontend Engineer");
    expect(roleKeyword("Lead")).toBe("");
  });

  it("keeps hyphenated words and programming names intact", () => {
    expect(roleKeyword("Full-Stack Developer")).toBe("Full-Stack Developer");
    expect(roleKeyword("Senior C++ Developer")).toBe("C++ Developer");
    expect(roleKeyword(".NET Engineer")).toBe(".NET Engineer");
  });

  it("caps the keyword at three words and handles empty titles", () => {
    expect(roleKeyword("Site Reliability Engineering Manager")).toBe(
      "Site Reliability Engineering",
    );
    expect(roleKeyword("Senior")).toBe("");
    expect(roleKeyword("")).toBe("");
  });
});

describe("searchName", () => {
  it("drops legal suffixes so searches match how people write the name", () => {
    expect(searchName("Acme, Inc.")).toBe("Acme");
    expect(searchName("Acme Pty. Ltd.")).toBe("Acme");
    expect(searchName("Siemens AG")).toBe("Siemens");
    expect(searchName("  Linear  ")).toBe("Linear");
  });

  it("drops dotted, compound and bracketed suffixes", () => {
    expect(searchName("Mollie B.V.")).toBe("Mollie");
    expect(searchName("Acme S.p.A.")).toBe("Acme");
    expect(searchName("Acme Co.")).toBe("Acme");
    expect(searchName("Acme Technologies Pvt Ltd")).toBe("Acme Technologies");
    expect(searchName("Acme Private Limited")).toBe("Acme");
    expect(searchName("Acme Pte. Ltd.")).toBe("Acme");
    expect(searchName("Acme GmbH & Co. KG")).toBe("Acme");
    expect(searchName("Square Enix Holdings Co., Ltd.")).toBe("Square Enix Holdings");
    expect(searchName("Klarna Bank AB (publ)")).toBe("Klarna Bank");
    expect(searchName("Acme (YC W24)")).toBe("Acme");
  });

  it("never empties the name", () => {
    expect(searchName("Inc")).toBe("Inc");
    expect(searchName("The Browser Company")).toBe("The Browser Company");
    expect(searchName("Costco")).toBe("Costco");
    expect(searchName("(Stealth)")).toBe("(Stealth)");
  });
});

describe("find-the-person links", () => {
  it("searches LinkedIn people for the company", () => {
    const url = linkedInPeopleUrl("Marks & Spencer, Inc.");
    expect(url.startsWith("https://www.linkedin.com/search/results/people/?keywords=")).toBe(true);
    expect(query(url, "keywords")).toBe("Marks & Spencer");
    expect(url).toContain("Marks%20%26%20Spencer");
  });

  it("falls back to the role when the company is blank", () => {
    expect(query(linkedInPeopleUrl("", "Senior Data Analyst"), "keywords")).toBe("Data Analyst");
  });

  it("searches Google for likely hiring people at the company", () => {
    const url = hiringPeopleUrl("Acme, Inc.", "Senior Backend Engineer, Payments");
    expect(url.startsWith("https://www.google.com/search?q=")).toBe(true);
    expect(query(url)).toBe(
      'site:linkedin.com/in "Acme" Backend Engineer (manager OR lead OR head OR director OR recruiter OR founder)',
    );
  });

  it("strips quotes from the company and skips empty parts", () => {
    expect(query(hiringPeopleUrl('The "Best" Shop', "Lead"))).toBe(
      'site:linkedin.com/in "The Best Shop" (manager OR lead OR head OR director OR recruiter OR founder)',
    );
  });

  it("searches Google for the company's team page", () => {
    expect(query(teamPageUrl("Acme Ltd"))).toBe(
      '"Acme" (team OR "about us" OR leadership OR founders)',
    );
  });
});

describe("postEmails", () => {
  it("finds addresses, lowercases and dedupes them", () => {
    const text =
      "Questions? Write to Jane.Doe@Acme.com or maya@acme.co.uk. You can also reach jane.doe@acme.com (same person).";
    expect(postEmails(text)).toEqual(["jane.doe@acme.com", "maya@acme.co.uk"]);
  });

  it("puts applicant inboxes first, since the first fills the To line", () => {
    const text = "Press: press@acme.com. Questions to jane@acme.com. Apply at careers@acme.com.";
    expect(postEmails(text)).toEqual(["careers@acme.com", "press@acme.com", "jane@acme.com"]);
    expect(postEmails("info@acme.com or hr@acme.com")[0]).toBe("hr@acme.com");
    expect(postEmails("a@acme.com b@acme.com c@acme.com talent@acme.com")[0]).toBe(
      "talent@acme.com",
    );
  });

  it("leaves out the next word when a full stop has no space after it", () => {
    expect(postEmails("Contact jobs@acme.com.Benefits include a laptop.")).toEqual([
      "jobs@acme.com",
    ]);
    expect(postEmails("Write to Jobs@Acme.io.Apply today")).toEqual(["jobs@acme.io"]);
    expect(postEmails("JOBS@ACME.CO.UK")).toEqual(["jobs@acme.co.uk"]);
    expect(postEmails("jobs@acme.Benefits")).toEqual(["jobs@acme.benefits"]);
  });

  it("leaves trailing punctuation and mailto prefixes out of the address", () => {
    expect(postEmails("Email <mailto:hello@acme.io>, or sam@acme.io.")).toEqual([
      "hello@acme.io",
      "sam@acme.io",
    ]);
  });

  it("skips no-reply, privacy, abuse and similar addresses", () => {
    const text = [
      "noreply@acme.com",
      "no-reply@acme.com",
      "do_not_reply@acme.com",
      "DoNotReply@acme.com",
      "privacy@acme.com",
      "dataprivacy@acme.com",
      "abuse@acme.com",
      "dpo@acme.com",
      "accommodations@acme.com",
      "accessibility@acme.com",
      "disability@acme.com",
      "reasonable.adjustments@acme.com",
      "eeo@acme.com",
      "eeo.officer@acme.com",
      "ada@acme.com",
      "fraud@acme.com",
      "recruitment-fraud@acme.com",
      "security@acme.com",
      "legal@acme.com",
      "ethics@acme.com",
      "support@acme.com",
      "help@acme.com",
      "notifications@acme.com",
      "someone@example.com",
      "maya@acme.com",
    ].join(" ");
    expect(postEmails(text)).toEqual(["maya@acme.com"]);
  });

  it("keeps names that only contain a skipped word", () => {
    const text = "lee.oliver@acme.com michael.phelps@acme.com ada.lovelace@acme.com";
    expect(postEmails(text)).toEqual([
      "lee.oliver@acme.com",
      "michael.phelps@acme.com",
      "ada.lovelace@acme.com",
    ]);
  });

  it("skips image file names that look like addresses", () => {
    const text = "<img src='https://cdn.acme.com/logo@2x.png'> icon@3x.webp hiring@acme.com";
    expect(postEmails(text)).toEqual(["hiring@acme.com"]);
  });

  it("ignores handles and broken addresses", () => {
    expect(postEmails("Follow @acme, see medium.com/@acme, or write a@b or x@y.")).toEqual([]);
  });

  it("returns at most three", () => {
    const text = "a1@acme.com a2@acme.com a3@acme.com a4@acme.com";
    expect(postEmails(text)).toEqual(["a1@acme.com", "a2@acme.com", "a3@acme.com"]);
  });
});

describe("placeholderIn", () => {
  it("finds the first fill-in left in any of the texts", () => {
    expect(placeholderIn("Backend role", "Hi [first name],\n\nThanks")).toBe("[first name]");
    expect(placeholderIn("About [role]", "Hi [first name],")).toBe("[role]");
    expect(placeholderIn("Backend role", "Hi Maya,")).toBeNull();
  });
});

const DRAFT = {
  to: "jobs+eng@acme.com",
  subject: "Backend role & your team",
  body: "Hi [first name],\n\nI'd love to talk. 100% serious?\n\nThanks,\nSam",
};

describe("send links", () => {
  it("prefills Gmail's compose window", () => {
    const url = new URL(gmailUrl(DRAFT));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("fs")).toBe("1");
    expect(url.searchParams.get("to")).toBe(DRAFT.to);
    expect(url.searchParams.get("su")).toBe(DRAFT.subject);
    expect(url.searchParams.get("body")).toBe(DRAFT.body);
  });

  it("prefills Outlook's compose window", () => {
    const url = new URL(outlookUrl(DRAFT));
    expect(url.origin + url.pathname).toBe("https://outlook.office.com/mail/deeplink/compose");
    expect(url.searchParams.get("to")).toBe(DRAFT.to);
    expect(url.searchParams.get("subject")).toBe(DRAFT.subject);
    expect(url.searchParams.get("body")).toBe(DRAFT.body);
  });

  it("encodes spaces as %20, never +, so no app reads them as plus signs", () => {
    expect(gmailUrl(DRAFT)).toContain("su=Backend%20role%20%26%20your%20team");
    expect(gmailUrl(DRAFT)).toContain("to=jobs%2Beng%40acme.com");
  });

  it("leaves the To line empty when there's no address", () => {
    expect(gmailUrl({ ...DRAFT, to: "" })).toContain("&to=&su=");
    expect(mailtoLink({ ...DRAFT, to: "" }).href.startsWith("mailto:?subject=")).toBe(true);
  });
});

describe("mailtoLink", () => {
  it("builds a short link whole, with CRLF line breaks", () => {
    const { href, clipped } = mailtoLink(DRAFT);
    expect(clipped).toBe(false);
    expect(href.startsWith("mailto:jobs%2Beng@acme.com?subject=")).toBe(true);
    expect(href).toContain("body=Hi%20%5Bfirst%20name%5D%2C%0D%0A%0D%0AI'd");
    expect(href).toContain("100%25%20serious%3F");
    const body = new URLSearchParams(href.slice(href.indexOf("?"))).get("body");
    expect(body).toBe(DRAFT.body.replace(/\n/g, "\r\n"));
  });

  it("cuts a long body at a word so the link stays under the limit", () => {
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`);
    const body = words.join(" ");
    const { href, clipped } = mailtoLink({ ...DRAFT, body });
    expect(clipped).toBe(true);
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_CHARS);
    const kept = new URLSearchParams(href.slice(href.indexOf("?"))).get("body") ?? "";
    expect(kept.endsWith("…")).toBe(true);
    const start = kept.slice(0, -1);
    expect(body.startsWith(`${start} `)).toBe(true);
    // The next word would no longer fit.
    const next = words[start.split(" ").length];
    expect(
      mailtoLink({ ...DRAFT, body: `${start} ${next}…` }, Infinity).href.length,
    ).toBeGreaterThan(MAILTO_MAX_CHARS);
  });

  it("counts encoded length, not text length, when cutting", () => {
    const body = "é ".repeat(600).trim();
    const { href, clipped } = mailtoLink({ ...DRAFT, body });
    expect(clipped).toBe(true);
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_CHARS);
  });

  it("drops the body when even one word is too long to fit", () => {
    const { href, clipped } = mailtoLink({ ...DRAFT, body: "x".repeat(3_000) }, 200);
    expect(clipped).toBe(true);
    expect(href.endsWith("&body=")).toBe(true);
  });
});
