import { describe, expect, it } from "vitest";
import {
  APPLICATIONS_STALE_MS,
  portfolioQuery,
  prepPacksQuery,
  reminderSettingsQuery,
  savedJobsQuery,
  sharesQuery,
  workProfileQuery,
  writingsQuery,
} from "./options";

const FIVE_MINUTES = 5 * 60_000;

describe("how long each account list stays fresh", () => {
  it("is 5 minutes for every list, since the tab's own changes patch or drop the cache", () => {
    expect(APPLICATIONS_STALE_MS).toBe(FIVE_MINUTES);
    for (const options of [
      savedJobsQuery("ada"),
      writingsQuery("ada"),
      prepPacksQuery("ada"),
      sharesQuery("ada"),
      portfolioQuery("ada"),
      reminderSettingsQuery("ada"),
      workProfileQuery("ada"),
    ]) {
      expect(options.staleTime).toBe(FIVE_MINUTES);
    }
  });
});
