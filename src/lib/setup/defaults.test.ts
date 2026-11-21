import { describe, expect, it } from "vitest";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import { ownResumes } from "./checklist";
import { fillDefaults, lookingForGuess, plannedDefaults, type StoredDefaults } from "./defaults";
import { SetupDefaultsSchema } from "./validation";

const NOW = Date.UTC(2026, 10, 21, 12);

function resume(id: string, patch: Partial<Resume> = {}, location = ""): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    id,
    source: "import",
    updatedAt: 1,
    basics: { ...base.basics, location },
    experience: [
      {
        id: `${id}-job`,
        company: "Fabrikam",
        title: "Senior Backend Engineer",
        location: "",
        startDate: "2018",
        endDate: "Present",
        bullets: [{ id: `${id}-0`, text: "Cut checkout errors 38% by rewriting the retry logic" }],
      },
    ],
    ...patch,
  };
}

const stored = (patch: Partial<StoredDefaults> = {}): StoredDefaults => ({
  defaultsAt: null,
  lookingForAt: null,
  profile: emptyWorkProfile(),
  lookingFor: NO_CHOICE,
  ...patch,
});

const body = (value: unknown) => SetupDefaultsSchema.parse(value);

const PLACE = { country: "PT", from: "resume", timeZone: "Europe/Lisbon" } as const;
const ROLE = { role: { title: "Nurse", family: null, occupation: null }, level: "mid" } as const;

describe("lookingForGuess: what Jobs would show for the upload", () => {
  it("keeps the role and level Jobs guesses, and leaves the place to the country", () => {
    const upload = resume("a");
    const shown = lookingForOf(matchProfileOf(upload, Math.floor(NOW / DAY_MS) * DAY_MS), null);
    expect(shown.title).not.toBe("");
    expect(lookingForGuess(upload, NOW)).toEqual({
      role: { title: shown.title, family: shown.family, occupation: null },
      level: shown.level,
    });
  });

  it("has nothing to say about a resume with no job titles", () => {
    expect(lookingForGuess(resume("a", { experience: [] }), NOW)).toBeUndefined();
  });
});

describe("plannedDefaults: what the browser sends", () => {
  it("guesses the country from the newest resume that names one, then the device", () => {
    const own = ownResumes([
      resume("old", { updatedAt: 1 }, "Toronto, Canada"),
      resume("new", { updatedAt: 5 }, "Lisbon, Portugal"),
    ]);
    const due = { defaultsAt: null, lookingForAt: null };
    expect(plannedDefaults({ due, own, timeZone: "Europe/Berlin", now: NOW })?.place).toEqual({
      country: "PT",
      from: "resume",
      timeZone: "Europe/Berlin",
    });
    expect(plannedDefaults({ due, own: [], timeZone: "Europe/Berlin", now: NOW })).toEqual({
      place: { country: "DE", from: "device", timeZone: "Europe/Berlin" },
    });
    expect(plannedDefaults({ due, own: [], timeZone: "UTC", now: NOW })).toEqual({
      place: { country: "", from: null, timeZone: "UTC" },
    });
  });

  it("guesses Looking for from the newest upload only, and once", () => {
    const typed = resume("typed", { source: "scratch", updatedAt: 9 });
    const upload = resume("upload", { updatedAt: 2 });
    const later = { defaultsAt: 1, lookingForAt: null };
    expect(
      plannedDefaults({ due: later, own: ownResumes([typed, upload]), timeZone: "", now: NOW }),
    ).toEqual({ lookingFor: lookingForGuess(upload, NOW) });
    expect(plannedDefaults({ due: later, own: [typed], timeZone: "", now: NOW })).toBeNull();
    expect(
      plannedDefaults({
        due: { defaultsAt: 1, lookingForAt: 2 },
        own: [upload],
        timeZone: "",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("waits for an upload it can read before marking Looking for as guessed", () => {
    const bare = resume("bare", { experience: [] });
    expect(
      plannedDefaults({
        due: { defaultsAt: 1, lookingForAt: null },
        own: [bare],
        timeZone: "",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("sends what the server accepts", () => {
    const planned = plannedDefaults({
      due: { defaultsAt: null, lookingForAt: null },
      own: [resume("a", {}, "Lisbon, Portugal")],
      timeZone: "Europe/Lisbon",
      now: NOW,
    });
    expect(SetupDefaultsSchema.safeParse(planned).success).toBe(true);
  });
});

describe("fillDefaults: what the server writes", () => {
  it("fills a blank country, time zone, home region and Looking for, and remembers the guess", () => {
    expect(fillDefaults(stored(), body({ place: PLACE, lookingFor: ROLE }))).toEqual({
      country: "PT",
      timeZone: "Europe/Lisbon",
      region: "eu",
      lookingFor: { role: { title: "Nurse", family: null, occupation: null }, level: "mid" },
      guess: { country: "PT", from: "resume", region: "eu" },
      placeRan: true,
      lookingForRan: true,
    });
  });

  it("never writes over a setting", () => {
    const set: WorkProfile = {
      ...emptyWorkProfile(),
      country: "DE",
      timeZone: "Europe/Berlin",
    };
    const picked: LookingForChoice = { ...NO_CHOICE, place: "c:US" };
    expect(
      fillDefaults(
        stored({ profile: set, lookingFor: picked }),
        body({ place: PLACE, lookingFor: ROLE }),
      ),
    ).toEqual({
      country: null,
      timeZone: null,
      region: null,
      lookingFor: null,
      guess: null,
      placeRan: true,
      lookingForRan: true,
    });
  });

  it("keeps an answered home region, and still notes the country it guessed", () => {
    const answered = {
      ...emptyWorkProfile(),
      rights: { us: null, uk: null, eu: "sponsorship", ca: null },
    } as const;
    expect(fillDefaults(stored({ profile: answered }), body({ place: PLACE }))).toMatchObject({
      country: "PT",
      region: null,
      guess: { country: "PT", from: "resume", region: null },
    });
  });

  it("runs each part once", () => {
    expect(
      fillDefaults(
        stored({ defaultsAt: 1, lookingForAt: 2 }),
        body({ place: PLACE, lookingFor: ROLE }),
      ),
    ).toEqual({
      country: null,
      timeZone: null,
      region: null,
      lookingFor: null,
      guess: null,
      placeRan: false,
      lookingForRan: false,
    });
    expect(fillDefaults(stored({ defaultsAt: 1 }), body({ lookingFor: ROLE }))).toMatchObject({
      placeRan: false,
      lookingForRan: true,
    });
  });

  it("sets no region for a country outside the four, and no guess without a country", () => {
    expect(
      fillDefaults(
        stored(),
        body({ place: { country: "IN", from: "device", timeZone: "Asia/Kolkata" } }),
      ),
    ).toMatchObject({
      country: "IN",
      region: null,
      guess: { country: "IN", from: "device", region: null },
    });
    expect(
      fillDefaults(stored(), body({ place: { country: "", from: null, timeZone: "UTC" } })),
    ).toMatchObject({ country: null, timeZone: "UTC", guess: null, placeRan: true });
  });
});

describe("SetupDefaultsSchema", () => {
  it("refuses an empty body, a made-up country or zone, and a guess with no source", () => {
    expect(SetupDefaultsSchema.safeParse({}).success).toBe(false);
    expect(SetupDefaultsSchema.safeParse({ place: { ...PLACE, country: "XX" } }).success).toBe(
      false,
    );
    expect(
      SetupDefaultsSchema.safeParse({ place: { ...PLACE, timeZone: "Mars/Base" } }).success,
    ).toBe(false);
    expect(SetupDefaultsSchema.safeParse({ place: { ...PLACE, from: null } }).success).toBe(false);
    expect(SetupDefaultsSchema.safeParse({ lookingFor: { role: null, level: null } }).success).toBe(
      false,
    );
  });
});
