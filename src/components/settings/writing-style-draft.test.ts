import { describe, expect, it } from "vitest";
import { DEFAULT_WRITING_STYLE, isDefaultStyle } from "@/lib/writing-style/schema";
import { bodyOf, DEFAULT_BODY, draftAfterSave, sameStyle, tidyStyle } from "./writing-style-draft";

const saved = { ...DEFAULT_WRITING_STYLE, signOff: "Best regards", notes: "Keep it modest." };

describe("writing style drafts", () => {
  it("doesn't count spaces alone as a change", () => {
    expect(
      sameStyle(
        { ...bodyOf(saved), signOff: "  Best   regards ", notes: "\nKeep it modest.  " },
        saved,
      ),
    ).toBe(true);
  });

  it("counts a new choice or new words as a change", () => {
    expect(sameStyle({ ...bodyOf(saved), tone: "warm" }, saved)).toBe(false);
    expect(sameStyle({ ...bodyOf(saved), spelling: "uk" }, saved)).toBe(false);
    expect(sameStyle({ ...bodyOf(saved), notes: "Keep it modest. No superlatives." }, saved)).toBe(
      false,
    );
  });

  it("sends only the fields the server takes, cleaned the way it cleans them", () => {
    expect(tidyStyle({ ...saved, signOff: " Thanks,\n Maya " })).toEqual({
      tone: "natural",
      length: "standard",
      spelling: "us",
      signOff: "Thanks, Maya",
      notes: "Keep it modest.",
    });
  });

  it("takes the saved copy once a save lands, but keeps edits made while it was on its way", () => {
    const sent = { ...bodyOf(saved), tone: "warm" as const };
    const stored = { ...saved, tone: "warm" as const, updatedAt: 2 };
    expect(draftAfterSave({ ...sent, notes: " Keep it modest. " }, sent, stored)).toEqual(
      bodyOf(stored),
    );
    const typedMore = { ...sent, notes: "Keep it modest. I can start in May." };
    expect(draftAfterSave(typedMore, sent, stored)).toBe(typedMore);
    expect(sameStyle(draftAfterSave(typedMore, sent, stored), stored)).toBe(false);
  });

  it("resets to Otto's default style", () => {
    expect(isDefaultStyle(DEFAULT_BODY)).toBe(true);
    expect(DEFAULT_BODY).not.toHaveProperty("updatedAt");
  });
});
