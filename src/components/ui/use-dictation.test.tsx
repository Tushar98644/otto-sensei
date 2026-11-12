import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "./toast";
import { reportVoiceProblem, useVoiceSupported } from "./use-dictation";
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

describe("reportVoiceProblem", () => {
  it("turns a blocked microphone into a plain error toast", () => {
    reportVoiceProblem({ code: "mic-blocked" });
    expect(toast).toHaveBeenCalledWith({
      title: "Otto can't hear you",
      description: "Allow the microphone in your browser to talk to Otto.",
      variant: "error",
    });
  });

  it("shows the server's words when sign-in is needed", () => {
    reportVoiceProblem({ code: "sign-in", message: "Sign in to talk to Otto." });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Sign in to talk to Otto.", variant: "error" }),
    );
  });
});
