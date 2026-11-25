import { describe, expect, it } from "vitest";
import EN_FORMATS from "@/i18n/messages/en/formats";
import { formatsLead as lead } from "./formats-lead";

const formatsLead = (free: boolean) => lead(free, EN_FORMATS.lead);

describe("formatsLead", () => {
  it("tells Free which formats are free and that the others can be tried first", () => {
    expect(formatsLead(true)).toBe(
      "One resume, 6 looks. Classic and Compact are free. The other 4 come with Pro, and you can try them on your resume first.",
    );
  });

  it("doesn't sell Pro to someone who has it", () => {
    expect(formatsLead(false)).toBe(
      "One resume, 6 looks. Switch whenever you like: your words stay the same.",
    );
    expect(formatsLead(false)).not.toMatch(/Pro|free/);
  });

  it("makes no promise about hiring software", () => {
    expect(formatsLead(true)).not.toMatch(/hiring software/i);
    expect(formatsLead(false)).not.toMatch(/hiring software/i);
  });
});
