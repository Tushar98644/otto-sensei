import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LOADING_SCREEN_TITLE, LoadingScreenHost, LoadingScreenView } from "./otto-loading-screen";

describe("LoadingScreenView", () => {
  it("keeps an empty status region in the page while hidden", () => {
    const html = renderToStaticMarkup(<LoadingScreenView phase="hidden" detail={null} />);
    expect(html).toBe('<div role="status" aria-live="polite" class="sr-only"></div>');
  });

  it("covers the viewport with Otto, the title and what is happening", () => {
    const html = renderToStaticMarkup(
      <LoadingScreenView phase="shown" detail="Setting up your Pro plan" />,
    );
    expect(html).toMatch(
      /^<div role="status" aria-live="polite" class="fixed inset-0 z-50 [^"]*bg-background/,
    );
    expect(html).toContain(LOADING_SCREEN_TITLE.replace("'", "&#x27;"));
    expect(html).toContain(">Setting up your Pro plan</p>");
    // Otto is decoration; the words carry the meaning.
    expect(html).toMatch(/<span aria-hidden="true"><svg[^>]*width="144"/);
    expect(html).toContain("motion-safe:animate-otto-page");
    // No progress bar or percentage: we don't know how far along it is.
    expect(html).not.toMatch(/progressbar|%/);
  });

  it("fades out with motion and just goes without it", () => {
    const html = renderToStaticMarkup(<LoadingScreenView phase="leaving" detail={null} />);
    expect(html).toContain("motion-safe:animate-fade-out");
    expect(html).toContain("motion-reduce:hidden");
    expect(html).toContain("pointer-events-none");
  });
});

describe("LoadingScreenHost", () => {
  it("renders the app untouched while nothing is loading", () => {
    const html = renderToStaticMarkup(
      <LoadingScreenHost>
        <main>App</main>
      </LoadingScreenHost>,
    );
    expect(html).toContain('<div class="contents"><main>App</main></div>');
    expect(html).not.toContain("aria-busy");
  });
});
