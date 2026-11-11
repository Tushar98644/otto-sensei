import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VOICE_LABELS } from "@/lib/voice/dictation";
import { JobForm } from "./job-form";
import type { TailorDraft } from "./session";

const fake = vi.hoisted(() => ({ onText: (() => {}) as (chunk: string) => void }));

vi.mock("@/components/ui/use-dictation", () => ({
  useVoiceSupported: () => true,
  useDictation: (onText: (chunk: string) => void) => {
    fake.onText = onText;
    return { supported: true, listening: false, toggle() {}, stop() {}, cancel() {} };
  },
}));

describe("JobForm with voice typing", () => {
  it("puts a mic on the job post and appends what was said through onChange", () => {
    const draft: TailorDraft = {
      title: "Designer",
      company: "",
      text: "We need a product designer.",
      link: "",
      paste: true,
    };
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <JobForm draft={draft} onChange={onChange} onSubmit={() => {}} busy={false} checks={false} />,
    );
    expect(html).toContain(`aria-label="${VOICE_LABELS.start}"`);

    fake.onText("must know Figma and user research");
    expect(onChange).toHaveBeenCalledWith({
      ...draft,
      text: "We need a product designer. Must know Figma and user research",
    });
  });
});
