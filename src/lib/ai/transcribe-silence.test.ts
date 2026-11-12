import { describe, expect, it } from "vitest";
import { isSilenceGuess } from "./transcribe";

describe("isSilenceGuess", () => {
  it("treats Whisper's stock phrases for silence as nothing heard", () => {
    expect(isSilenceGuess("Thank you.")).toBe(true);
    expect(isSilenceGuess(" Thanks for watching! ")).toBe(true);
    expect(isSilenceGuess("you")).toBe(true);
  });

  it("keeps real speech", () => {
    expect(isSilenceGuess("Thank you for the referral, it led to the offer.")).toBe(false);
    expect(isSilenceGuess("Cut onboarding time from 2 days to 3 hours.")).toBe(false);
  });
});
