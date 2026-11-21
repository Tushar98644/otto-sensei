import { describe, expect, it } from "vitest";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE } from "@/lib/job-feed/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  checklistShows,
  defaultsDue,
  jobsWorkPromptShows,
  lookingForSet,
  newestUpload,
  ownResumes,
  reminderPromptShows,
  setupItems,
  setupProgress,
  workRightsSet,
  type SetupFacts,
} from "./checklist";
import type { SetupGuess } from "./types";
import { weakLineState } from "./weak-line";

const STRONG = "Cut checkout errors 38% by rewriting the payment retry logic";
const WARNING = "Responsible for managing the company website";

function resume(id: string, lines: string[], extra: Partial<Resume> = {}): Resume {
  return {
    ...emptyResume(0),
    id,
    source: "import",
    updatedAt: 1,
    experience: lines.length
      ? [
          {
            id: `${id}-job`,
            company: "Fabrikam",
            title: "Engineer",
            location: "",
            startDate: "2020",
            endDate: "Present",
            bullets: lines.map((text, line) => ({ id: `${id}-${line}`, text })),
          },
        ]
      : [],
    ...extra,
  };
}

const profile = (patch: Partial<WorkProfile> = {}): WorkProfile => ({
  ...emptyWorkProfile(),
  ...patch,
});

describe("what counts as done", () => {
  it("needs a country and one answered region for where you can work", () => {
    expect(workRightsSet(profile())).toBe(false);
    expect(workRightsSet(profile({ country: "PT" }))).toBe(false);
    expect(workRightsSet(profile({ timeZone: "Europe/Lisbon", rights: { ...profile().rights, eu: "authorized" } }))).toBe(false);
    expect(
      workRightsSet(profile({ country: "PT", rights: { ...profile().rights, us: "sponsorship" } })),
    ).toBe(true);
  });

  it("doesn't count the home region Otto set on its own until it is confirmed", () => {
    const guess: SetupGuess = { country: "PT", from: "resume", region: "eu" };
    const guessed = profile({ country: "PT", rights: { ...profile().rights, eu: "authorized" } });
    expect(workRightsSet(guessed, guess)).toBe(false);
    expect(workRightsSet(guessed, null)).toBe(true);
    const visa = { ...guessed, rights: { ...guessed.rights, us: "sponsorship" as const } };
    expect(workRightsSet(visa, guess)).toBe(true);
    expect(workRightsSet({ ...guessed, country: "ES" }, guess)).toBe(true);
    const answered = { ...guessed, rights: { ...guessed.rights, eu: "sponsorship" as const } };
    expect(workRightsSet(answered, guess)).toBe(true);
  });

  it("counts any picked or confirmed part of Looking for, but not the remote switch alone", () => {
    expect(lookingForSet(NO_CHOICE)).toBe(false);
    expect(lookingForSet({ ...NO_CHOICE, remote: true })).toBe(false);
    expect(lookingForSet({ ...NO_CHOICE, level: "senior" })).toBe(true);
    expect(lookingForSet({ ...NO_CHOICE, place: "g:eu" })).toBe(true);
    expect(
      lookingForSet({ ...NO_CHOICE, role: { title: "Nurse", family: null, occupation: null } }),
    ).toBe(true);
  });

  it("never counts the sample, or a copy tailored from it, as the person's resume", () => {
    const sample = resume("sample", [STRONG], { source: "sample" });
    const fromSample = resume("copy", [STRONG], {
      source: "tailored",
      tailor: {
        baseResumeId: "sample",
        jobTitle: "Engineer",
        company: "Northwind",
        keywords: [],
        createdAt: 0,
      },
    });
    const mine = resume("mine", [STRONG], { updatedAt: 5 });
    const older = resume("older", [STRONG], { source: "scratch", updatedAt: 2 });
    expect(ownResumes([sample, fromSample])).toEqual([]);
    expect(ownResumes([older, sample, mine, fromSample]).map((item) => item.id)).toEqual([
      "mine",
      "older",
    ]);
  });
});

describe("when the first-login guesses are due", () => {
  const upload = resume("upload", [STRONG], { updatedAt: 3 });
  const typed = resume("typed", [STRONG], { source: "scratch", updatedAt: 5 });
  const copy = resume("copy", [STRONG], {
    source: "tailored",
    updatedAt: 9,
    tailor: {
      baseResumeId: "upload",
      jobTitle: "Engineer",
      company: "Northwind",
      keywords: [],
      createdAt: 0,
    },
  });

  it("guesses Looking for from an upload, never one typed from scratch or tailored", () => {
    expect(newestUpload(ownResumes([typed, upload, copy]))?.id).toBe("upload");
    expect(newestUpload(ownResumes([typed, copy]))).toBeNull();
  });

  it("runs the place once, and Looking for once an upload is there", () => {
    expect(defaultsDue({ defaultsAt: null, lookingForAt: null }, [])).toBe(true);
    expect(defaultsDue({ defaultsAt: 1, lookingForAt: null }, [])).toBe(false);
    expect(defaultsDue({ defaultsAt: 1, lookingForAt: null }, [typed])).toBe(false);
    expect(defaultsDue({ defaultsAt: 1, lookingForAt: null }, [upload])).toBe(true);
    expect(defaultsDue({ defaultsAt: 1, lookingForAt: 2 }, [upload])).toBe(false);
  });
});

describe("weakLineState", () => {
  it("waits for a resume, then for lines", () => {
    expect(weakLineState([], null)).toEqual({ status: "no_resume" });
    expect(weakLineState([resume("a", [])], null)).toEqual({ status: "no_lines" });
  });

  it("opens the first line with a warning, and is done when nothing has one", () => {
    expect(weakLineState([resume("a", [STRONG, WARNING])], null)).toEqual({
      status: "open",
      target: { resumeId: "a", bulletId: "a-1" },
    });
    expect(weakLineState([resume("a", [STRONG])], null)).toEqual({ status: "done" });
  });

  it("ticks once the line it opened reads well, even with other weak lines left", () => {
    const target = { resumeId: "a", bulletId: "a-0" };
    expect(weakLineState([resume("a", [WARNING, WARNING])], target)).toEqual({
      status: "open",
      target,
    });
    expect(weakLineState([resume("a", [STRONG, WARNING])], target)).toEqual({ status: "done" });
    expect(weakLineState([resume("a", ["", WARNING])], target)).toEqual({ status: "done" });
  });

  it("starts over on the next weak line when the remembered resume is gone", () => {
    expect(
      weakLineState([resume("b", [WARNING])], { resumeId: "a", bulletId: "a-0" }),
    ).toEqual({ status: "open", target: { resumeId: "b", bulletId: "b-0" } });
  });
});

const facts = (patch: Partial<SetupFacts> = {}): SetupFacts => ({
  pro: true,
  ownResumes: 0,
  work: { profile: profile(), lookingFor: NO_CHOICE },
  weakLine: { status: "no_resume" },
  reminders: { available: true, chosen: false },
  ...patch,
});

describe("setupItems", () => {
  it("lists five on Pro, a fresh account with nothing done", () => {
    const items = setupItems(facts());
    expect(items.map((item) => item.id)).toEqual([
      "resume",
      "work",
      "looking_for",
      "weak_line",
      "reminders",
    ]);
    expect(setupProgress(items)).toEqual({ done: 0, total: 5 });
    expect(checklistShows(items, null)).toBe(true);
  });

  it("ticks each item from the real settings", () => {
    const items = setupItems(
      facts({
        ownResumes: 1,
        work: {
          profile: profile({ country: "DE", rights: { ...profile().rights, eu: "authorized" } }),
          lookingFor: { ...NO_CHOICE, level: "mid" },
        },
        weakLine: { status: "open", target: { resumeId: "a", bulletId: "a-0" } },
      }),
    );
    expect(items.filter((item) => item.done).map((item) => item.id)).toEqual([
      "resume",
      "work",
      "looking_for",
    ]);
    expect(setupProgress(items)).toEqual({ done: 3, total: 5 });
  });

  it("keeps Where you can work open while Otto's guess is unconfirmed", () => {
    const work = {
      profile: profile({ country: "DE", rights: { ...profile().rights, eu: "authorized" } }),
      lookingFor: NO_CHOICE,
    };
    const done = (guess: SetupGuess | null) =>
      setupItems(facts({ work, guess })).find((item) => item.id === "work")?.done;
    expect(done({ country: "DE", from: "resume", region: "eu" })).toBe(false);
    expect(done(null)).toBe(true);
  });

  it("leaves Pro tools out on Free, and reminders out where email can't be sent", () => {
    expect(setupItems(facts({ pro: false })).map((item) => item.id)).toEqual([
      "resume",
      "looking_for",
      "weak_line",
    ]);
    expect(
      setupItems(facts({ reminders: { available: false, chosen: false } })).map((item) => item.id),
    ).not.toContain("reminders");
  });

  it("leaves out what couldn't be read instead of guessing", () => {
    expect(setupItems(facts({ work: null, reminders: null })).map((item) => item.id)).toEqual([
      "resume",
      "weak_line",
    ]);
  });

  it("disappears when everything is done, or once hidden", () => {
    const done = setupItems(
      facts({
        ownResumes: 2,
        work: {
          profile: profile({ country: "CA", rights: { ...profile().rights, ca: "authorized" } }),
          lookingFor: { ...NO_CHOICE, place: "c:CA" },
        },
        weakLine: { status: "done" },
        reminders: { available: true, chosen: true },
      }),
    );
    expect(checklistShows(done, null)).toBe(false);
    expect(checklistShows(setupItems(facts()), 1_000)).toBe(false);
  });
});

describe("contextual prompts", () => {
  it("Jobs asks where you can work while the rules have nothing to go on, on Pro only", () => {
    expect(jobsWorkPromptShows({ pro: true, locked: false, profile: profile() })).toBe(true);
    expect(
      jobsWorkPromptShows({
        pro: true,
        locked: false,
        profile: profile({ country: "GB", rights: { ...profile().rights, uk: "authorized" } }),
      }),
    ).toBe(false);
    expect(jobsWorkPromptShows({ pro: false, locked: false, profile: profile() })).toBe(false);
    expect(jobsWorkPromptShows({ pro: true, locked: true, profile: profile() })).toBe(false);
    expect(jobsWorkPromptShows({ pro: true, locked: false, profile: null })).toBe(false);
  });

  it("Jobs keeps asking while the only answer is the region Otto guessed", () => {
    const guessed = profile({ country: "GB", rights: { ...profile().rights, uk: "authorized" } });
    const guess: SetupGuess = { country: "GB", from: "device", region: "uk" };
    expect(jobsWorkPromptShows({ pro: true, locked: false, profile: guessed, guess })).toBe(true);
    expect(jobsWorkPromptShows({ pro: true, locked: false, profile: guessed, guess: null })).toBe(
      false,
    );
  });

  it("Applications offers reminder emails after the first one, until answered", () => {
    const reminders = { available: true, chosen: false, emailReminders: false };
    expect(reminderPromptShows({ pro: true, applications: 1, reminders })).toBe(true);
    expect(reminderPromptShows({ pro: true, applications: 0, reminders })).toBe(false);
    expect(
      reminderPromptShows({ pro: true, applications: 1, reminders: { ...reminders, chosen: true } }),
    ).toBe(false);
    expect(
      reminderPromptShows({
        pro: true,
        applications: 1,
        reminders: { ...reminders, emailReminders: true },
      }),
    ).toBe(false);
    expect(
      reminderPromptShows({
        pro: true,
        applications: 1,
        reminders: { ...reminders, available: false },
      }),
    ).toBe(false);
    expect(reminderPromptShows({ pro: false, applications: 1, reminders })).toBe(false);
    expect(reminderPromptShows({ pro: true, applications: 1, reminders: null })).toBe(false);
  });
});
