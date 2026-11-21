import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import type { StudioActions } from "../use-studio-actions";
import { ActionCards } from "./action-cards";

const plan = vi.hoisted(() => ({ tailorLocked: false }));

vi.mock("../use-tailor-locked", () => ({ useTailorLocked: () => plan.tailorLocked }));
vi.mock("@/components/account/upgrade-prompt", () => ({ openFeaturePrompt: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function cards(tailorLocked: boolean): string {
  plan.tailorLocked = tailorLocked;
  return renderToStaticMarkup(
    <ActionCards actions={{} as StudioActions} latest={null} pageResume={createSampleResume(0)} />,
  );
}

describe("the Home action cards", () => {
  it("mark Tailor to a job as Pro, on the phone row and the card, only once no tailors are left", () => {
    expect(cards(false)).not.toContain("comes with");
    expect(cards(true).match(/, comes with <\/span>Pro/g)).toHaveLength(2);
  });
});
