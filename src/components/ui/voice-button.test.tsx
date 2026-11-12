import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VOICE_LABELS, type VoicePhase } from "@/lib/voice/dictation";
import { toast } from "./toast";
import { VoiceButton } from "./voice-button";
import { VoiceInput, VoiceTextarea } from "./voice-field";

const fake = vi.hoisted(() => ({
  supported: true,
  phase: "idle" as VoicePhase,
  startedAt: null as number | null,
  onText: (() => {}) as (text: string) => void,
  toggle: () => {},
  stop: () => {},
  cancel: () => {},
}));

vi.mock("./use-dictation", () => ({
  useVoiceSupported: () => fake.supported,
  useDictation: (onText: (text: string) => void) => {
    fake.onText = onText;
    return fake;
  },
}));

vi.mock("./toast", () => ({ toast: vi.fn() }));

beforeEach(() => {
  fake.supported = true;
  fake.phase = "idle";
  fake.startedAt = null;
  fake.stop = vi.fn();
  fake.cancel = vi.fn();
  vi.mocked(toast).mockClear();
});

describe("VoiceButton", () => {
  it("renders nothing where the browser can't hear you at all", () => {
    fake.supported = false;
    expect(renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />)).toBe("");
    const box = renderToStaticMarkup(
      <VoiceTextarea value="" onChange={() => {}} onDictate={() => {}} />,
    );
    expect(box).not.toContain("<button");
    expect(box).not.toContain("pr-12");
  });

  it("offers to record, as an unpressed toggle", () => {
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.start}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('data-listening="true"');
    expect(html).toContain('type="button"');
  });

  it("shows a pressed, pulsing state with the time while recording", () => {
    fake.phase = "recording";
    fake.startedAt = Date.UTC(2026, 10, 12, 9);
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.recording}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-listening="true"');
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).toContain(">0:00</span>");
  });

  it("shows a pressed, pulsing state without a time while the browser listens", () => {
    fake.phase = "listening";
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.listening}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toContain(":00</span>");
  });

  it("shows a calm busy state while the clip turns into text", () => {
    fake.phase = "sending";
    const html = renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />);
    expect(html).toContain(`aria-label="${VOICE_LABELS.sending}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(`>${VOICE_LABELS.sending}</span>`);
    expect(html).toContain("animate-spin");
    expect(html).not.toContain("motion-safe:animate-pulse");
    expect(html).not.toMatch(/<button[^>]* disabled=""/);
  });

  it("appends what was said to what's already there", () => {
    const onDictate = vi.fn();
    renderToStaticMarkup(<VoiceButton value="Led the team." onDictate={onDictate} />);
    fake.onText("cut costs by half in six months");
    expect(onDictate).toHaveBeenCalledWith("Led the team. Cut costs by half in six months");
  });

  it("keeps what fits and says so when the box is full", () => {
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
