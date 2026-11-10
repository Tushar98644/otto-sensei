import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTENT_SECTIONS } from "@/lib/portfolio/content";
import { portfolioViews } from "@/lib/portfolio/content-view";
import { jordanContent, jordanGitHub, jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_SECTIONS, type PortfolioSection } from "@/lib/portfolio/types";
import { ContentEditor } from "./content-editor";

// The content editor draws from the editor's full copy (portfolioViews().editor), so switching a
// section off under "What shows" leaves its fields here, marked, instead of emptying them.
function editor(hiddenSections: PortfolioSection[], showEmail = true) {
  const content = { ...jordanContent(), hidden: [...CONTENT_SECTIONS] };
  const views = portfolioViews({
    resume: jordanV2Resume(),
    settings: { showEmail, showPhone: false, hiddenSections },
    content,
    github: jordanGitHub(),
  });
  return renderToStaticMarkup(
    <ContentEditor
      template="paper"
      content={content}
      auto={views.editor.auto}
      view={views.editor.content}
      github={jordanGitHub()}
      pageHidden={hiddenSections}
      showEmail={showEmail}
    />,
  );
}

describe("the content editor with sections hidden on the page", () => {
  it("keeps every field and says which sections the page leaves out", () => {
    const open = editor([]);
    const hidden = editor([...PORTFOLIO_SECTIONS], false);
    for (const text of [
      "Ledgerly",
      "Tripwise",
      "University of Manchester",
      "Tally",
      "Platform 9",
    ]) {
      expect(open, text).toContain(text);
      expect(hidden, text).toContain(text);
    }
    expect(hidden).toContain("measure before and after");
    expect(hidden).toContain("linkedin.com/in/jordan-ellis");
    expect(hidden).toContain("Hidden on your page: Projects");
    expect(hidden).toContain("Hidden on your page: About");
    expect(hidden).toContain("Hidden on your page: Experience, Education and Skills");
    expect(hidden).toContain("Hidden on your page: Links");
    expect(hidden).toContain("“Show my email” is off");
    expect(open).not.toContain("Hidden on your page:");
  });

  it("asks for words only: no picture, logo or video to upload or link", () => {
    const html = editor([]);
    expect(html).not.toMatch(/type="file"|<img/);
    // Visible words only (attributes and Jordan's own text aside).
    const text = html.replace(/<[^>]*>/g, " ");
    expect(text).not.toMatch(/upload|screenshot|logo|demo video|picture|personal photos|drop a/i);
  });
});
