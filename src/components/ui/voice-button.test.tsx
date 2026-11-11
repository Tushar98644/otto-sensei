import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "./toast";
import { VOICE_LABELS } from "@/lib/voice/dictation";
import { VoiceButton } from "./voice-button";
import { VoiceInput, VoiceTextarea } from "./voice-field";

const fake = vi.hoisted(() => ({
  supported: true,
  listening: false,
  onText: (() => {}) as (chunk: string) => void,
  toggle: () => {},
  stop: () => {},
  cancel: () => {},
}));

vi.mock("./use-dictation", () => ({
  useVoiceSupported: () => fake.supported,
  useDictation: (onText: (chunk: string) => void) => {
    fake.onText = onText;
    return fake;
  },
}));

vi.mock("./toast", () => ({ toast: vi.fn() }));

beforeEach(() => {
  fake.supported = true;
  fake.listening = false;
  fake.stop = vi.fn();
  fake.cancel = vi.fn();
  vi.mocked(toast).mockClear();
});

describe("VoiceButton", () => {
  it("renders nothing where the browser can't listen", () => {
    fake.supported = false;
    expect(renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />)).toBe("");
    const box = renderToStaticMarkup(
      <VoiceTextarea value="" onChange={() => {}} onDictate={() => {}} />,
    );
    expect(box).not.toContain("<button");
    expect(box).not.toContain("pr-12");
  });

  it("offers to listen, as an unpressed toggle", () => {
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.start}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('data-listening="true"');
    expect(html).toContain('type="button"');
  });

  it("shows a pressed, pulsing state while listening", () => {
    fake.listening = true;
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.stop}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-listening="true"');
    expect(html).toContain("motion-safe:animate-pulse");
  });

  it("appends what was said, and a quick second result builds on the first", () => {
    const onDictate = vi.fn();
    renderToStaticMarkup(<VoiceButton value="Led the team." onDictate={onDictate} />);
    fake.onText("cut costs by half");
    fake.onText("in six months");
    expect(onDictate.mock.calls).toEqual([
      ["Led the team. Cut costs by half"],
      ["Led the team. Cut costs by half in six months"],
    ]);
  });

  it("stops listening and says so when the box is full", () => {
    const onDictate = vi.fn();
    renderToStaticMarkup(<VoiceButton value="Hello" maxLength={14} onDictate={onDictate} />);
    fake.onText("world and more");
    expect(onDictate).toHaveBeenCalledWith("Hello world");
    expect(fake.stop).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "This box is full" }));
  });
});

describe("VoiceTextarea and VoiceInput", () => {
  it("keep the field's own label wiring and leave room for the mic", () => {
    const area = renderToStaticMarkup(
      <VoiceTextarea id="post" value="" onChange={() => {}} onDictate={() => {}} />,
    );
    expect(area).toMatch(/<textarea[^>]*id="post"[^>]*class="[^"]*pr-12/);
    expect(area).toContain(`aria-label="${VOICE_LABELS.start}"`);
    const line = renderToStaticMarkup(
      <VoiceInput id="answer" value="" onChange={() => {}} onDictate={() => {}} />,
    );
    expect(line).toMatch(/<input[^>]*id="answer"/);
    expect(line).toContain(`aria-label="${VOICE_LABELS.start}"`);
  });
});
