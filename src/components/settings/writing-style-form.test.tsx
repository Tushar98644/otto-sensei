import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WRITING_STYLE, type WritingStyle } from "@/lib/writing-style/schema";
import { WritingStyleForm } from "./writing-style-form";

vi.mock("@/components/ui/use-dictation", () => ({
  useVoiceSupported: () => false,
  useDictation: () => ({ phase: "idle", startedAt: null, toggle() {}, stop() {}, cancel() {} }),
}));

const render = (saved: WritingStyle | null) =>
  renderToStaticMarkup(
    <WritingStyleForm saved={saved} onSave={async () => saved ?? DEFAULT_WRITING_STYLE} />,
  );

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("WritingStyleForm", () => {
  it("groups each choice under a legend with the saved one picked", () => {
    const html = render({ ...DEFAULT_WRITING_STYLE, tone: "warm", spelling: "uk" });
    for (const legend of ["Tone", "Length", "Spelling"]) {
      expect(html).toContain(
        `<legend class="mb-2 text-sm font-medium text-ink">${legend}</legend>`,
      );
    }
    expect(html.match(/type="radio"/g)).toHaveLength(8);
    expect(html).toMatch(/checked="" value="warm"/);
    expect(html).toMatch(/checked="" value="uk"/);
    expect(html).toMatch(/checked="" value="standard"/);
    expect(text(html)).toContain("Warm Direct Formal Friendly and personal, still professional.");
  });

  it("shows each choice as segments, with only the picked one's description under it", () => {
    const words = text(render({ ...DEFAULT_WRITING_STYLE, tone: "direct", length: "shorter" }));
    expect(words).toContain("Natural Warm Direct Formal Short sentences, straight to the point.");
    expect(words).toContain("Standard Shorter About 140 words for a letter, 80 for a message.");
    expect(words).toContain("US English UK English organize, color, résumé");
    expect(words).not.toContain("Friendly and personal");
  });

  it("says where the style is used and that Otto still won't make things up", () => {
    const words = text(render(DEFAULT_WRITING_STYLE));
    expect(words).toContain("cover letters, application answers and outreach messages");
    expect(words).toContain("work history still comes only from your resume");
    expect(words).toContain("Otto never makes anything up");
    expect(words).not.toContain("not the facts");
    expect(words).toContain("Mention I&#x27;m open to relocating");
  });

  it("saves on its own, with a quiet status instead of a Save button", () => {
    const html = render(DEFAULT_WRITING_STYLE);
    expect(html).not.toContain('type="submit"');
    expect(text(html)).not.toContain("Save style");
    expect(html).toMatch(/<p role="status"[^>]*>Changes save as you go\.<\/p>/);
    expect(html).toMatch(/<button (?=[^>]*aria-disabled="true")(?=[^>]*type="button")[^>]*>.*Reset to default<\/button>/);
    expect(text(html)).toContain("0/500");
  });

  it("lets a custom style go back to the default", () => {
    const html = render({ ...DEFAULT_WRITING_STYLE, notes: "Keep it modest." });
    expect(html).toMatch(/<button (?=[^>]*aria-disabled="false")(?=[^>]*type="button")[^>]*>.*Reset to default<\/button>/);
    expect(html).toContain('placeholder="Best regards"');
    expect(html).toContain('maxLength="40"');
    expect(text(html)).toContain("15/500");
  });

  it("waits disabled, with nothing picked, while the saved style loads", () => {
    const loading = render(null);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain("checked=");
    expect(loading.match(/<fieldset disabled=""/g)).toHaveLength(3);
    expect(loading).toMatch(/<input disabled=""[^>]*placeholder="Best regards"/);
    expect(loading).toMatch(/<textarea disabled=""/);
    expect(loading).toMatch(/<button (?=[^>]*aria-disabled="true")(?=[^>]*type="button")[^>]*>.*Reset to default<\/button>/);
    expect(text(loading)).not.toContain("Plain and friendly");
  });
});
