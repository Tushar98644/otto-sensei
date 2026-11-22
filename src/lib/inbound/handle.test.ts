import { describe, expect, it } from "vitest";
import { handleProblem, handleVariants, suggestHandle } from "./handle";

describe("handles", () => {
  it("take lowercase letters and numbers, with single dots or hyphens inside", () => {
    expect(handleProblem("priya.sharma")).toBeNull();
    expect(handleProblem("rahul-v2")).toBeNull();
    expect(handleProblem("ab")).toBe("short");
    expect(handleProblem("a".repeat(31))).toBe("long");
    for (const bad of [
      "Priya",
      ".priya",
      "priya.",
      "pri..ya",
      "pri-.ya",
      "priya_s",
      "priya s",
      "príya",
    ]) {
      expect(handleProblem(bad), bad).toBe("shape");
    }
  });

  it("keep the words a mailbox or Otto needs", () => {
    for (const word of [
      "admin",
      "support",
      "help",
      "billing",
      "postmaster",
      "abuse",
      "noreply",
      "no-reply",
      "otto",
      "team",
      "hello",
      "info",
      "security",
      "root",
      "mail",
      "jobs",
      "careers",
      "otto.jobs",
      "no.reply",
    ]) {
      expect(handleProblem(word), word).toBe("reserved");
    }
    expect(handleProblem("ottoman")).toBeNull();
  });

  it("suggest one from the name, else the email", () => {
    expect(suggestHandle("Priya Sharma", "ps1990@gmail.com")).toBe("priya.sharma");
    expect(suggestHandle("Zoë O'Brien", "x@y.com")).toBe("zoe.o.brien");
    expect(suggestHandle("", "rahul.verma+jobs@gmail.com")).toBe("rahul.verma");
    expect(suggestHandle("", "hr@acme.com")).toBe("hr.jobs");
    expect(handleVariants("priya.sharma", 2026)).toEqual([
      "priya.sharma.jobs",
      "priya.sharma26",
      "priya.sharma.2026",
      "priya.sharma2",
      "priya.sharma3",
      "priya.sharma4",
      "priya.sharma5",
    ]);
  });
});
