import { describe, expect, it } from "vitest";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import type { ExtensionProfile } from "@/lib/extension/types";
import { badgeMatch, blockedText, eligibilityLine, missingLine, skillsLine } from "./match";
import type { JobPost } from "./page/post";

const NOW = Date.UTC(2026, 10, 22, 6);
const OPTIONS = { now: NOW, deviceTimeZone: "Asia/Kolkata" };
const INDIA: WorkProfile = {
  ...emptyWorkProfile(),
  country: "IN",
  timeZone: "Asia/Kolkata",
  rights: { us: "sponsorship", uk: null, eu: null, ca: null },
};
const LOOKING = { place: "c:IN", remote: false } as const;

function post(overrides: Partial<JobPost> = {}): JobPost {
  return {
    site: "linkedin",
    url: "https://www.linkedin.com/jobs/view/4000000002/",
    title: "Senior Backend Engineer",
    company: "Northwind",
    location: "Remote · Asia-Pacific",
    text: "Requirements:\n- 5+ years with Go and PostgreSQL\n- Kafka and Terraform\n- Docker\n\nThis role is fully remote within APAC.",
    source: "page",
    ...overrides,
  };
}

const RESUME = [
  "Backend engineer",
  "Experience",
  "Senior Engineer, Contoso",
  "- Built Go services on PostgreSQL serving 2M requests a day",
  "- Shipped Docker images through CI",
  "Skills",
  "Go, PostgreSQL, Docker",
].join("\n");

describe("the badge's skills line", () => {
  it("counts the post's skills found in the resume and names the missing ones, must-haves first", () => {
    const profile: ExtensionProfile = {
      version: "v1",
      email: "priya@example.com",
      plan: "free",
      access: { badge: true, save: true, tailor: false, letter: false, fill: false },
      resumes: [],
      workProfile: INDIA,
      lookingFor: LOOKING,
      saved: [],
    };
    const { skills } = badgeMatch(post(), RESUME, profile, OPTIONS);
    expect(skills).not.toBeNull();
    expect(skillsLine(skills!)).toBe(`${skills!.found} of ${skills!.total} skills found`);
    expect(skills!.missing).toEqual(expect.arrayContaining(["Kafka", "Terraform"]));
    expect(skills!.missing).not.toContain("Go");
    expect(missingLine(skills!.missing)).toMatch(/^Missing: /);
  });

  it("says so when the post names no skill it knows, and shortens a long missing list", () => {
    expect(skillsLine({ found: 0, total: 0 })).toBe("No skills Otto knows in this post");
    expect(skillsLine({ found: 1, total: 1 })).toBe("1 of 1 skill found");
    expect(missingLine(["Kafka", "Terraform", "Rust", "Scala", "Elixir"])).toBe(
      "Missing: Kafka, Terraform, Rust and 2 more",
    );
    expect(missingLine([])).toBeNull();
  });
});

describe("the badge's eligibility line", () => {
  it("names the place and how the job is open to it", () => {
    expect(eligibilityLine(post(), INDIA, LOOKING, OPTIONS)).toMatchObject({
      tone: "ok",
      text: "Open to India (remote, APAC)",
    });
    expect(
      eligibilityLine(
        post({ location: "Bengaluru, India", text: "Work from office in Bengaluru. Go and SQL." }),
        INDIA,
        LOOKING,
        OPTIONS,
      ),
    ).toMatchObject({
      tone: "ok",
      text: "Open to India",
    });
  });

  it("leads with a work-rights block over where the job is", () => {
    const us = post({
      location: "Remote · United States",
      text: "You must be authorized to work in the United States. We are unable to sponsor visas for this role.",
    });
    expect(eligibilityLine(us, INDIA, LOOKING, OPTIONS)).toMatchObject({
      tone: "blocked",
      text: "Needs US work authorization",
    });
    expect(
      eligibilityLine(
        post({ location: "Remote, United States", text: "Go and Kafka." }),
        INDIA,
        LOOKING,
        OPTIONS,
      ),
    ).toMatchObject({
      tone: "blocked",
      text: "Only for people in the US",
    });
  });

  it("asks for a country when there's no work profile, and stays plain when the post says nothing", () => {
    expect(
      eligibilityLine(post(), null, { place: "anywhere", remote: false }, OPTIONS),
    ).toMatchObject({
      tone: "check",
      text: "Add your country to your work profile to check this",
    });
    expect(
      eligibilityLine(post({ location: "", text: "Go and Kafka." }), INDIA, LOOKING, OPTIONS),
    ).toMatchObject({
      tone: "none",
      text: "No place or work rules in the post",
    });
  });

  it("keeps blocked notes short", () => {
    const finding = { rule: "location", verdict: "blocked", quote: "", source: "post" } as const;
    expect(blockedText({ ...finding, note: "The job is in Berlin, and it isn't remote." })).toBe(
      "On-site in Berlin",
    );
    expect(
      blockedText({
        ...finding,
        rule: "sponsorship",
        note: "They don't sponsor visas, and you said you'd need one for the UK.",
      }),
    ).toBe("No visa sponsorship for the UK");
    expect(
      blockedText({
        ...finding,
        rule: "time_zone",
        note: "You're on UTC+5:30, 9 hours from Pacific Time. The post asks for 3 at most.",
      }),
    ).toBe("You're on UTC+5:30, 9 hours from Pacific Time");
  });
});
