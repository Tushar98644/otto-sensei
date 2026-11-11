import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "./toast";
import { reportDictationError, useVoiceSupported } from "./use-dictation";
import { VoiceButton } from "./voice-button";

vi.mock("./toast", () => ({ toast: vi.fn() }));

beforeEach(() => {
  vi.mocked(toast).mockClear();
});

function Support() {
  return <>{String(useVoiceSupported())}</>;
}

describe("useDictation on the server", () => {
  it("says no support and renders no button, so hydration matches", () => {
    expect(renderToStaticMarkup(<Support />)).toBe("false");
    expect(renderToStaticMarkup(<VoiceButton value="" onDictate={() => {}} />)).toBe("");
  });
});

describe("reportDictationError", () => {
  it("turns a blocked microphone into a plain error toast", () => {
    reportDictationError("not-allowed");
    expect(toast).toHaveBeenCalledWith({
      title: "Otto can't hear you",
      description: "Allow the microphone in your browser to talk to Otto.",
      variant: "error",
    });
  });

  it("tells you when it heard nothing", () => {
    reportDictationError("no-speech");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Otto didn't hear anything", variant: "error" }),
    );
  });

  it("stays quiet when the session was stopped on purpose", () => {
    reportDictationError("aborted");
    expect(toast).not.toHaveBeenCalled();
  });
});
