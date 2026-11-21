import { describe, expect, it } from "vitest";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import { countryHint, guessedRegion, homeRegionNote, onlyGuessedRights } from "./hints";
import type { SetupGuess } from "./types";

const GUESS: SetupGuess = { country: "PT", from: "resume", region: "eu" };

const profile = (patch: Partial<WorkProfile> = {}): WorkProfile => ({
  ...emptyWorkProfile(),
  country: "PT",
  rights: { us: null, uk: null, eu: "authorized", ca: null },
  ...patch,
});

describe("saying what Otto guessed", () => {
  it("says where the country came from while it is still the guess", () => {
    expect(countryHint(GUESS, "PT")).toBe("Guessed from your resume.");
    expect(countryHint({ ...GUESS, from: "device" }, "PT")).toBe(
      "Guessed from this device's time zone.",
    );
    expect(countryHint(GUESS, "ES")).toBeUndefined();
    expect(countryHint(null, "PT")).toBeUndefined();
  });

  it("names the guessed region only while it is still Yes in the guessed country", () => {
    expect(guessedRegion(GUESS, profile())).toBe("eu");
    expect(guessedRegion(GUESS, profile({ country: "ES" }))).toBeNull();
    expect(
      guessedRegion(
        GUESS,
        profile({ rights: { us: null, uk: null, eu: "sponsorship", ca: null } }),
      ),
    ).toBeNull();
    expect(guessedRegion({ ...GUESS, region: null }, profile())).toBeNull();
    expect(guessedRegion(null, profile())).toBeNull();
  });

  it("knows when the guessed region is the only answer", () => {
    expect(onlyGuessedRights(GUESS, profile())).toBe(true);
    expect(
      onlyGuessedRights(
        GUESS,
        profile({ rights: { us: "sponsorship", uk: null, eu: "authorized", ca: null } }),
      ),
    ).toBe(false);
    expect(onlyGuessedRights(null, profile())).toBe(false);
  });

  it("explains the Yes it set", () => {
    expect(homeRegionNote("eu")).toBe(
      "Set to Yes for the EU because you live there. Change it if your visa says otherwise.",
    );
  });
});
