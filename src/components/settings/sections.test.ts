import { describe, expect, it } from "vitest";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";
import { accountSections, pickActive } from "./sections";

describe("accountSections", () => {
  it("lists the groups in the order the page shows them, delete last", () => {
    expect(accountSections({ paid: true }).map((section) => section.label)).toEqual([
      "Profile",
      "Writing style",
      "Job search",
      "Notifications",
      "Plan and billing",
      "Invite friends",
      "Delete account",
    ]);
  });

  it("leaves billing out of a free account's nav", () => {
    const free = accountSections({ paid: false });
    expect(free.find((section) => section.key === "plan")?.label).toBe("Plan");
    expect(free.map((section) => `${section.label} ${section.description}`).join(" ")).not.toMatch(
      /billing|subscription/i,
    );
  });

  it("gives every group its own id, and links to the writing style land on it", () => {
    for (const paid of [false, true]) {
      const ids = accountSections({ paid }).map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain(ACCOUNT_SECTIONS.writingStyle);
      for (const cardId of [
        ACCOUNT_SECTIONS.work,
        ACCOUNT_SECTIONS.lookingFor,
        ACCOUNT_SECTIONS.reminders,
      ]) {
        expect(ids).not.toContain(cardId);
      }
    }
  });
});

describe("pickActive", () => {
  const ids = ["profile", "writing-style", "job-search", "delete-account"];
  const middle = { atTop: false, atEnd: false };

  it("picks the first section in page order that crosses the band", () => {
    expect(pickActive(ids, new Set(["job-search", "writing-style"]), middle)).toBe("writing-style");
  });

  it("keeps the current section while nothing crosses the band", () => {
    expect(pickActive(ids, new Set(), middle)).toBeNull();
    expect(pickActive(ids, new Set(["gone"]), middle)).toBeNull();
  });

  it("picks the first section at the top of the page, even when a later one fills the band", () => {
    expect(pickActive(ids, new Set(["writing-style"]), { atTop: true, atEnd: false })).toBe(
      "profile",
    );
  });

  it("picks the last section at the end of the page, where it can't reach the band", () => {
    expect(pickActive(ids, new Set(["job-search"]), { atTop: false, atEnd: true })).toBe(
      "delete-account",
    );
  });

  it("has nothing to pick without sections", () => {
    expect(pickActive([], new Set(["profile"]), { atTop: true, atEnd: true })).toBeNull();
  });
});
