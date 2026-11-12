import { describe, expect, it } from "vitest";
import { voiceProblemCopy } from "./problems";

describe("voiceProblemCopy", () => {
  it("says each problem in plain words", () => {
    expect(voiceProblemCopy({ code: "mic-blocked" }).description).toBe(
      "Allow the microphone in your browser to talk to Otto.",
    );
    expect(voiceProblemCopy({ code: "no-speech" })).toEqual({
      title: "Otto didn't catch anything",
      description: "Try again a little closer to the mic.",
    });
    expect(voiceProblemCopy({ code: "offline" }).title).toBe("Voice typing needs the internet");
    expect(voiceProblemCopy({ code: "failed" })).toEqual({
      title: "Couldn't turn that into text",
      description: "Try again, or type instead.",
    });
    expect(
      voiceProblemCopy({ code: "sign-in", message: "Sign in to talk to Otto." }).description,
    ).toBe("Sign in to talk to Otto.");
  });
});
