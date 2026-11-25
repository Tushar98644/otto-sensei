import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadOtto } from "./lazy-otto";
import { LOADING_SCREEN_TITLE, LoadingScreenHost, LoadingScreenView } from "./otto-loading-screen";
import { StillLoadingScreen } from "./still-loading-screen";

describe("LoadingScreenView", () => {
  it("keeps an empty status region in the page while hidden", () => {
    const html = renderToStaticMarkup(<LoadingScreenView phase="hidden" detail={null} />);
    expect(html).toBe('<div role="status" aria-live="polite" class="sr-only"></div>');
  });

  it("keeps Otto's place until his drawing code arrives", () => {
    const html = renderToStaticMarkup(<LoadingScreenView phase="shown" detail={null} />);
    expect(html).toContain(
      '<span aria-hidden="true"><span class="inline-block size-32 sm:size-36"></span></span>',
    );
  });

  it("covers the viewport with Otto, the title and what is happening", async () => {
    await loadOtto();
    const html = renderToStaticMarkup(
      <LoadingScreenView phase="shown" detail="Setting up your Pro plan" />,
    );
    expect(html).toMatch(
      /^<div role="status" aria-live="polite" class="fixed inset-0 z-50 [^"]*bg-background/,
    );
    expect(html).toContain(LOADING_SCREEN_TITLE.replace("'", "&#x27;"));
    expect(html).toContain(">Setting up your Pro plan</p>");
    expect(html).toMatch(/<span aria-hidden="true"><svg[^>]*width="144"/);
    expect(html).toContain("motion-safe:animate-otto-page");
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

  it("draws what the 404 for unmatched URLs draws without its code", () => {
    const app = <main>App</main>;
    expect(renderToStaticMarkup(<StillLoadingScreen>{app}</StillLoadingScreen>)).toBe(
      renderToStaticMarkup(<LoadingScreenHost>{app}</LoadingScreenHost>),
    );
  });
});
