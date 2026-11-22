import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageFromHtml } from "../testing/mini-dom";
import { formOf, profile } from "./fixture-profile";
import { leftEmpty, planForm, pickOption, placeKey, type Planned } from "./plan";
import { confirmation, formPlatformOf, formRoot } from "./platforms";

const GREENHOUSE = "https://job-boards.greenhouse.io/discord/jobs/8945798002";
const EMBED = "https://job-boards.greenhouse.io/embed/job_app?for=discord&token=8945798002";
const LEVER = "https://jobs.lever.co/zoox/8befaec7-bb9f-4cf3-a48c-46b5e3886bf3/apply";
const PALANTIR = "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply";
const ASHBY = "https://jobs.ashbyhq.com/ramp/f564dcf9-9390-4a3f-896f-8047a5086040/application";
const WORKDAY =
  "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Remote/Senior-Security-Engineer_JR2022836/apply/applyManually";
const POST = { title: "Engineer", company: "Acme", location: "Santa Clara, CA, US", text: "" };

function plan(file: string, url: string): Planned[] {
  const { questions } = formOf(file, url);
  expect(questions.length).toBeGreaterThan(3);
  return planForm(questions, profile(), POST);
}

// What each question would get: "fill <value>", "ask", "draft", "protected" or "skip".
function outcome(items: Planned[], label: string | RegExp): string {
  const item = items.find((entry) =>
    typeof label === "string"
      ? entry.question.label.startsWith(label)
      : label.test(entry.question.label),
  );
  if (!item) throw new Error(`no question "${String(label)}"`);
  if (item.status !== "fill") return item.status;
  const { want } = item;
  if (want.kind === "text") return `fill ${want.value}`;
  if (want.kind === "choice") return `fill ${want.values[0]}`;
  if (want.kind === "yes" || want.kind === "check") return `fill ${want.value ? "yes" : "no"}`;
  return "fill file";
}

const SELF_ID = /gender|race|ethnic|veteran|disabilit|lgbt|pronoun|demographic/i;

describe("which forms Otto fills", () => {
  it("works on Greenhouse, Lever, Ashby and Workday, and never on LinkedIn's or Naukri's Easy Apply", () => {
    expect(formPlatformOf(GREENHOUSE)).toBe("greenhouse");
    expect(formPlatformOf(EMBED)).toBe("greenhouse");
    expect(formPlatformOf(LEVER)).toBe("lever");
    expect(formPlatformOf(ASHBY)).toBe("ashby");
    expect(formPlatformOf(WORKDAY)).toBe("workday");
    expect(formPlatformOf("https://www.linkedin.com/jobs/view/4471319619/")).toBeNull();
    expect(formPlatformOf("https://www.naukri.com/job-listings-designer-123")).toBeNull();
    expect(formPlatformOf("https://in.indeed.com/viewjob?jk=abc12345")).toBeNull();
    expect(formPlatformOf("https://acme.example.com/careers/apply")).toBeNull();
  });

  it("finds no form on a job post without one", () => {
    const page = pageFromHtml(
      readFileSync(new URL("../../fixtures/lever.html", import.meta.url), "utf8"),
      "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
    );
    expect(formRoot("lever", page.root)).toBeNull();
  });
});

describe("Greenhouse", () => {
  for (const [name, file, url] of [
    ["the job board", "greenhouse.html", GREENHOUSE],
    ["the embed frame", "greenhouse-embed.html", EMBED],
  ] as const) {
    it(`maps ${name}'s fields`, () => {
      const items = plan(file, url);
      expect(outcome(items, "First Name")).toBe("fill Ana");
      expect(outcome(items, "Last Name")).toBe("fill Souza");
      expect(outcome(items, "Email")).toBe("fill ana@example.com");
      expect(outcome(items, "Phone")).toBe("fill +1 415 555 0100");
      expect(outcome(items, "Country")).toBe("fill United States");
      expect(outcome(items, "Location (City)")).toBe("fill San Francisco");
      expect(outcome(items, "LinkedIn Profile")).toBe("fill https://www.linkedin.com/in/anasouza");
      expect(outcome(items, "Website")).toBe("fill https://anasouza.dev");
      expect(outcome(items, "School")).toBe("fill University of Lisbon");
      expect(outcome(items, "Degree")).toBe("fill Bachelor of Science");
      expect(outcome(items, "Discipline")).toBe("fill Statistics");
      expect(outcome(items, "How did you hear")).toBe("fill Company website");
      expect(outcome(items, "Are you legally authorized to work in the United States")).toBe(
        "fill yes",
      );
      expect(outcome(items, "Why do you want to work at Discord?")).toBe("draft");
      expect(outcome(items, "Are you currently located in the US?")).toBe("ask");
      expect(outcome(items, "Are you currently based in or willing to relocate")).toBe("ask");
      const files = items.filter((item) => item.question.kind === "file");
      expect(files.map((item) => item.status)).toEqual(["fill", "skip"]);
    });
  }

  it("leaves the demographic survey and its consent box alone", () => {
    const items = plan("greenhouse.html", GREENHOUSE);
    const survey = items.filter((item) => SELF_ID.test(item.question.label));
    expect(survey.length).toBeGreaterThanOrEqual(8);
    expect(new Set(survey.map((item) => item.status))).toEqual(new Set(["protected"]));
  });
});

describe("Lever", () => {
  it("maps Zoox's form", () => {
    const items = plan("lever.html", LEVER);
    expect(outcome(items, "Resume/CV")).toBe("fill file");
    expect(outcome(items, "Full name")).toBe("fill Ana Souza");
    expect(outcome(items, "Email")).toBe("fill ana@example.com");
    expect(outcome(items, "Current location")).toBe("fill San Francisco, CA");
    expect(outcome(items, "Current company")).toBe("fill Feedzai");
    expect(outcome(items, "LinkedIn URL")).toBe("fill https://www.linkedin.com/in/anasouza");
    expect(outcome(items, "Other website")).toBe("fill https://anasouza.dev");
    expect(outcome(items, "What is your preferred first name and last name?")).toBe(
      "fill Ana Souza",
    );
    expect(outcome(items, "Sponsorship: Do you require sponsorship")).toBe("fill no");
    expect(outcome(items, "How did you hear about us?")).toBe("fill Company website");
    // A draft must never make up which passports someone holds.
    expect(outcome(items, "Export Control and Compliance")).toBe("ask");
    for (const label of ["Pronouns", "Gender", "Race", "Veteran status"]) {
      expect(outcome(items, label)).toBe("protected");
    }
  });

  it("maps Palantir's form, and never answers its consent question", () => {
    const items = plan("lever-palantir.html", PALANTIR);
    expect(outcome(items, "GitHub URL")).toBe("fill https://github.com/anasouza");
    expect(outcome(items, "Portfolio URL")).toBe("fill https://anasouza.dev");
    expect(outcome(items, "Preferred Name")).toBe("fill Ana");
    expect(outcome(items, "Are you legally authorized to work in the country")).toBe("fill yes");
    expect(outcome(items, "Will you now or in the future require sponsorship")).toBe("fill no");
    expect(outcome(items, "Which university")).toBe("fill University of Lisbon");
    expect(outcome(items, "Please tell us how you heard")).toBe("fill Company website");
    expect(outcome(items, "Why do you want to work at Palantir?")).toBe("draft");
    expect(outcome(items, "As part of our interview process, we may use AI notetakers")).toBe(
      "protected",
    );
    expect(outcome(items, "Are you a Singapore citizen?")).toBe("ask");
    expect(outcome(items, "Language Skill(s)")).toBe("ask");
    expect(outcome(items, "Additional information")).toBe("skip");
    expect(outcome(items, "Name Pronunciation")).toBe("skip");
  });
});

describe("Ashby", () => {
  it("maps Ramp's form, its Yes and No buttons included", () => {
    const items = plan("ashby.html", ASHBY);
    expect(outcome(items, "Name")).toBe("fill Ana Souza");
    expect(outcome(items, "Resume")).toBe("fill file");
    expect(outcome(items, "Cover Letter")).toBe("skip");
    expect(outcome(items, "Github")).toBe("fill https://github.com/anasouza");
    expect(outcome(items, "Please provide a link to the App Store and/or personal portfolio")).toBe(
      "fill https://anasouza.dev",
    );
    expect(outcome(items, "Please share some details")).toBe("draft");
    expect(outcome(items, "Do you have experience with Kotlin?")).toBe("ask");
    const kotlin = items.find((item) =>
      item.question.label.startsWith("Do you have experience with Kotlin"),
    );
    expect(kotlin?.question.options).toEqual(["Yes", "No"]);
    expect(kotlin?.status === "ask" && kotlin.input).toBe("yesno");
  });
});

describe("Workday", () => {
  it("maps My Information", () => {
    const items = plan("workday-information.html", WORKDAY);
    expect(outcome(items, "First Name")).toBe("fill Ana");
    expect(outcome(items, "Last Name")).toBe("fill Souza");
    expect(outcome(items, "Middle Name")).toBe("skip");
    expect(outcome(items, "City")).toBe("fill San Francisco");
    expect(outcome(items, "Email Address")).toBe("fill ana@example.com");
    expect(outcome(items, "Phone Number")).toBe("fill +1 415 555 0100");
    expect(outcome(items, "Phone Device Type")).toBe("skip");
    expect(outcome(items, "Country")).toBe("fill United States");
    expect(outcome(items, "How Did You Hear About Us?")).toBe("fill Company website");
    expect(outcome(items, "Have you previously worked for NVIDIA?")).toBe("ask");
    expect(outcome(items, "Address Line 1")).toBe("ask");
  });

  it("maps My Experience: the work history and education Workday asks for", () => {
    const items = plan("workday-experience.html", WORKDAY);
    expect(outcome(items, "Job Title")).toBe("fill Data Analyst");
    expect(outcome(items, "Company")).toBe("fill Feedzai");
    expect(outcome(items, "I currently work here")).toBe("fill yes");
    const dates = items.filter((item) => /^(?:Month|Year)$/.test(item.question.label));
    expect(
      dates.map((item) =>
        item.status === "fill" && item.want.kind === "text" ? item.want.value : item.status,
      ),
    ).toEqual(["03", "2022", "skip", "skip", "2020"]);
    expect(outcome(items, "Role Description")).toBe(
      "fill - Built fraud dashboards used by 30 banks.",
    );
    expect(outcome(items, "School or University")).toBe("fill University of Lisbon");
    expect(outcome(items, "Degree")).toBe("fill Bachelor of Science");
    expect(outcome(items, "Field of Study")).toBe("fill Statistics");
    expect(outcome(items, "Upload a file")).toBe("fill file");
    expect(outcome(items, "LinkedIn")).toBe("fill https://www.linkedin.com/in/anasouza");
    expect(outcome(items, "URL")).toBe("fill https://anasouza.dev");
  });

  it("maps Application Questions and leaves Voluntary Disclosures alone", () => {
    const questions = plan("workday-questions.html", WORKDAY);
    expect(outcome(questions, "Are you legally authorized")).toBe("fill yes");
    expect(outcome(questions, "Will you now or in the future require sponsorship")).toBe("fill no");
    expect(outcome(questions, "Are you willing to relocate?")).toBe("ask");
    expect(outcome(questions, "Do you have an active security clearance?")).toBe("ask");
    expect(outcome(questions, "Why are you interested")).toBe("draft");
    const disclosures = plan("workday-disclosures.html", WORKDAY);
    expect(new Set(disclosures.map((item) => item.status))).toEqual(new Set(["protected"]));
  });
});

describe("fields left to the person", () => {
  it("lists a required field the resume has nothing for, unless something is in it already", () => {
    const { questions } = formOf("greenhouse.html", GREENHOUSE);
    const base = profile();
    const fill = profile({ contact: { ...base.contact, phone: "" }, education: [] });
    const items = planForm(questions, fill, POST);
    expect(outcome(items, "Phone")).toBe("missing");
    expect(outcome(items, "School")).toBe("missing");
    // School is optional on this form, and the rest is filled, drafted or asked.
    expect(leftEmpty(items, fill, () => true)).toEqual(["Phone"]);
    // The page put the phone in from the resume it read.
    expect(leftEmpty(items, fill, (question) => question.label !== "Phone")).toEqual([]);
    expect(leftEmpty(planForm(questions, base, POST), base, () => true)).toEqual([]);
  });

  it("names Workday's date boxes by the job they belong to, and leaves a current job's end alone", () => {
    const { questions } = formOf("workday-experience.html", WORKDAY);
    const base = profile();
    const fill = profile({
      work: [{ ...base.work[0]!, start: null, title: "" }],
      contact: { ...base.contact, portfolio: "", website: "", github: "" },
    });
    const items = planForm(questions, fill, POST);
    expect(leftEmpty(items, fill, () => true)).toEqual([
      "Job Title (Feedzai)",
      "Start month (Feedzai)",
      "Start year (Feedzai)",
      "Website 1",
    ]);
  });
});

describe("saved answers in forms", () => {
  it("fills a question answered before, by its wording, and the work rights for the country asked about", () => {
    const { questions } = formOf("greenhouse.html", GREENHOUSE);
    const base = profile();
    const items = planForm(
      questions,
      profile({
        answers: {
          ...base.answers,
          relocate: true,
          workRights: { US: { authorized: false, sponsorship: true } },
          custom: [{ question: "are you currently located in the us", answer: "No", at: 1 }],
        },
      }),
      POST,
    );
    expect(outcome(items, "Are you currently located in the US?")).toBe("fill no");
    expect(outcome(items, "Are you currently based in or willing to relocate")).toBe("fill yes");
    expect(outcome(items, "Are you legally authorized to work in the United States")).toBe(
      "fill no",
    );
  });

  it("reads the country from the question, else the job's place, else home", () => {
    expect(placeKey("Are you authorized to work in the United Kingdom?", null, "IN")).toBe("GB");
    expect(placeKey("Are you legally allowed to work in the EU?", null, "IN")).toBe("EU");
    expect(placeKey("Are you authorized to work in the country of this job?", POST, "IN")).toBe(
      "US",
    );
    expect(placeKey("Do you have the right to work here?", null, "in")).toBe("IN");
  });

  it("picks options by meaning", () => {
    expect(pickOption(["Select...", "Yes", "No"], { kind: "yes", value: false })).toBe(2);
    expect(pickOption(["Yes, I am", "No, I am not"], { kind: "yes", value: true })).toBe(0);
    expect(
      pickOption(["LinkedIn", "Company Website / Careers Page", "Other"], {
        kind: "choice",
        values: ["Company website", "other"],
      }),
    ).toBe(1);
    expect(
      pickOption(["Associate's Degree", "Bachelor's Degree", "Master's Degree"], {
        kind: "choice",
        values: ["B.Tech", "bachelor"],
      }),
    ).toBe(1);
    expect(pickOption(["Red", "Blue"], { kind: "choice", values: ["Green"] })).toBe(-1);
    expect(
      pickOption(
        [
          "Texas A&M University",
          "University of Texas, Austin",
          "University of Texas, Austin (Law)",
        ],
        {
          kind: "choice",
          values: ["University of Texas at Austin"],
        },
      ),
    ).toBe(1);
  });
});

describe("a sent application", () => {
  it("is Greenhouse's and Lever's thank-you address", () => {
    const empty = pageFromHtml("<html><body></body></html>", GREENHOUSE).root;
    expect(confirmation("greenhouse", `${GREENHOUSE}/confirmation`, empty, false)).toBe(true);
    expect(confirmation("lever", LEVER.replace(/\/apply$/, "/thanks"), empty, false)).toBe(true);
    expect(confirmation("lever", LEVER, empty, false)).toBe(false);
  });

  it("is the page thanking them after a submit, never the form itself", () => {
    const read = (file: string, url: string) =>
      pageFromHtml(
        readFileSync(new URL(`../../fixtures/forms/${file}`, import.meta.url), "utf8"),
        url,
      ).root;
    const thanks = read("greenhouse-confirmation.html", GREENHOUSE);
    expect(confirmation("greenhouse", GREENHOUSE, thanks, true)).toBe(true);
    expect(confirmation("greenhouse", GREENHOUSE, thanks, false)).toBe(false);
    expect(confirmation("lever", LEVER, read("lever-thanks.html", LEVER), true)).toBe(true);
    const submitted = read("workday-submitted.html", WORKDAY);
    expect(confirmation("workday", WORKDAY, submitted, true)).toBe(true);
    expect(confirmation("workday", WORKDAY, submitted, false)).toBe(false);
    expect(confirmation("workday", WORKDAY, read("workday-review.html", WORKDAY), true)).toBe(
      false,
    );
    expect(confirmation("greenhouse", GREENHOUSE, read("greenhouse.html", GREENHOUSE), true)).toBe(
      false,
    );
    expect(confirmation("ashby", ASHBY, read("ashby.html", ASHBY), true)).toBe(false);
    const ashbyDone = pageFromHtml(
      '<div class="ashby-application-form-success-container"><h2>Thank you for applying to Ramp!</h2></div>',
      ASHBY,
    ).root;
    expect(confirmation("ashby", ASHBY, ashbyDone, true)).toBe(true);
  });
});
