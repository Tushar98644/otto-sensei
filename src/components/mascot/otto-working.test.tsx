import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OTTO } from "./lines";
import { OTTO_WORKING_DELAY_MS, OttoWorking, revealAfter } from "./otto-working";

describe("OttoWorking", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits out the delay before showing anything", () => {
    vi.useFakeTimers();
    const reveal = vi.fn();
    revealAfter(OTTO_WORKING_DELAY_MS, reveal);
    vi.advanceTimersByTime(OTTO_WORKING_DELAY_MS - 1);
    expect(reveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reveal).toHaveBeenCalledOnce();
  });

  it("never shows him when the answer comes back first", () => {
    vi.useFakeTimers();
    const reveal = vi.fn();
    const cancel = revealAfter(OTTO_WORKING_DELAY_MS, reveal);
    vi.advanceTimersByTime(250);
    cancel();
    vi.advanceTimersByTime(1_000);
    expect(reveal).not.toHaveBeenCalled();
  });

  it("starts with an empty status region and no Otto, holding his space", () => {
    const html = renderToStaticMarkup(<OttoWorking task="tailor" />);
    expect(OTTO_WORKING_DELAY_MS).toBeGreaterThanOrEqual(300);
    expect(html).not.toContain("<svg");
    expect(html).toContain('<p role="status"');
    expect(html).not.toContain(OTTO.working.tailor);
    expect(html).toMatch(/<span aria-hidden="true" class="[^"]*size-24/);
  });

  it("once shown, keeps Otto out of the accessibility tree and says what he's doing", () => {
    const html = renderToStaticMarkup(<OttoWorking task="interview" delayMs={0} />);
    // The drawing sits inside the hidden span; the line is in the status region.
    expect(html).toMatch(/<span aria-hidden="true"[^>]*><svg[^>]*role="img"/);
    expect(html).toMatch(new RegExp(`<p role="status"[^>]*>${OTTO.working.interview}</p>`));
  });

  it("takes the pose for the job and the small size for dialogs", () => {
    const reading = renderToStaticMarkup(<OttoWorking task="import" size="sm" delayMs={0} />);
    expect(reading).toContain('width="64"');
    expect(reading).toContain("motion-safe:animate-otto-page");
    const thinking = renderToStaticMarkup(<OttoWorking task="fix" delayMs={0} />);
    expect(thinking).toContain('width="96"');
    expect(thinking).toContain("motion-safe:animate-otto-chin");
  });

  it("can name the file and add a quieter second line", () => {
    const html = renderToStaticMarkup(
      <OttoWorking
        task="import"
        delayMs={0}
        message="Otto is reading cv.pdf."
        detail="A few seconds."
      />,
    );
    expect(html).toContain(">Otto is reading cv.pdf.</p>");
    expect(html).toContain("A few seconds.");
  });
});
