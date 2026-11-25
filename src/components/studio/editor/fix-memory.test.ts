import { beforeEach, describe, expect, it } from "vitest";
import type { FixResponse } from "@/lib/api/types";
import { forgetFixesForTests, recallFix, rememberFix } from "./fix-memory";

const role = { title: "Engineer", company: "Lumen" };
const response = (suggestion: string) => ({ suggestion }) as unknown as FixResponse;

beforeEach(() => forgetFixesForTests());

describe("fix memory", () => {
  it("keeps a separate suggestion for each resume language", () => {
    const request = { bullet: "Gestioné el inventario", role, answers: [] };
    rememberFix({ ...request, lang: "es" }, response("es"));

    expect(recallFix(request)).toBeNull();
    expect(recallFix({ ...request, lang: "es" })).toEqual(response("es"));
  });

  it("gives back the suggestion for the same line, role and answers", () => {
    rememberFix({ bullet: "Worked on the CI pipeline", role, answers: [] }, response("a"));

    expect(recallFix({ bullet: "Worked on the CI pipeline ", role, answers: [] })).toEqual(
      response("a"),
    );
  });

  it("asks again when the line, the role or an answer changed", () => {
    rememberFix({ bullet: "Worked on the CI pipeline", role, answers: [] }, response("a"));
    const answers = [{ question: "How much faster?", answer: "40%" }];
    rememberFix({ bullet: "Worked on the CI pipeline", role, answers }, response("b"));

    expect(recallFix({ bullet: "Worked on CI", role, answers: [] })).toBeNull();
    expect(
      recallFix({
        bullet: "Worked on the CI pipeline",
        role: { ...role, company: "X" },
        answers: [],
      }),
    ).toBeNull();
    expect(recallFix({ bullet: "Worked on the CI pipeline", role, answers })).toEqual(
      response("b"),
    );
    expect(
      recallFix({
        bullet: "Worked on the CI pipeline",
        role,
        answers: [{ question: "How much faster?", answer: "50%" }],
      }),
    ).toBeNull();
  });

  it("keeps only the newest suggestions", () => {
    for (let i = 0; i < 45; i++)
      rememberFix({ bullet: `Line ${i}`, role, answers: [] }, response(String(i)));

    expect(recallFix({ bullet: "Line 0", role, answers: [] })).toBeNull();
    expect(recallFix({ bullet: "Line 44", role, answers: [] })).toEqual(response("44"));
  });
});
