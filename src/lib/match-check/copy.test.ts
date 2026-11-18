import { describe, expect, it } from "vitest";
import { countLine, listedNote, matchHeadline, matchOtto } from "./copy";

const none = { found: 0, total: 0 };

describe("match check copy", () => {
  it("states counts, never a percentage or a score", () => {
    const lines = [
      matchHeadline({ found: 8, total: 12 }),
      matchHeadline({ found: 1, total: 1 }),
      matchHeadline({ found: 0, total: 0 }),
      matchOtto({ found: 8, total: 12, must: { found: 4, total: 5 } }),
      matchOtto({ found: 12, total: 12, must: { found: 5, total: 5 } }),
      matchOtto({ found: 3, total: 9, must: none }),
      matchOtto({ found: 0, total: 0, must: none }),
    ];
    expect(lines).toEqual([
      "Found 8 of 12 skills the post names",
      "Found 1 of 1 skill the post names",
      "No skills or tools Otto knows in this post",
      "1 of the post's 5 must-haves isn't in your resume yet. Start there.",
      "Your resume names all 12 skills this post names.",
      "Your resume names 3 of the 9 skills this post names. Here's where.",
      "I couldn't find skills or tools I know in this post. A post that lists its requirements works better.",
    ]);
    for (const line of lines) expect(line).not.toMatch(/%|score/i);
  });

  it("writes a count line only for a group the post has", () => {
    expect(countLine("Must-haves", { found: 4, total: 5 })).toBe("Must-haves: 4 of 5 found");
    expect(countLine("Nice-to-haves", none)).toBeNull();
  });

  it("explains listed skills only when there are some", () => {
    expect(listedNote(0)).toBeNull();
    expect(listedNote(1)).toBe(
      "One only appears in a list, such as your skills. Recruiters look for a line that says where you used it.",
    );
    expect(listedNote(3)).toMatch(/^3 only appear in a list.+where you used them\.$/);
  });
});
