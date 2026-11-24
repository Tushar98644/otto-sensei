import { describe, expect, it } from "vitest";
import { previewLinkAction } from "./preview-links";

describe("previewLinkAction", () => {
  it("scrolls the preview to a section a template's nav names", () => {
    expect(previewLinkAction("#pf-paper-about", "")).toEqual({
      kind: "section",
      id: "pf-paper-about",
    });
    expect(previewLinkAction("#caf%C3%A9", "")).toEqual({ kind: "section", id: "café" });
    expect(previewLinkAction("#%E0%A4%A", "")).toEqual({ kind: "section", id: "%E0%A4%A" });
    expect(previewLinkAction("#", "")).toEqual({ kind: "section", id: "" });
  });

  it("leaves new-tab, mail and phone links to the browser", () => {
    expect(previewLinkAction("https://github.com/maya", "_blank")).toEqual({ kind: "own" });
    expect(previewLinkAction("mailto:maya@example.com", "")).toEqual({ kind: "own" });
    expect(previewLinkAction("tel:+14155550134", "")).toEqual({ kind: "own" });
  });

  it("opens any other link in a new tab, so the editor never leaves its page", () => {
    expect(previewLinkAction("/r/maya-resume", "")).toEqual({ kind: "tab" });
    expect(previewLinkAction("https://example.com", "")).toEqual({ kind: "tab" });
  });
});
