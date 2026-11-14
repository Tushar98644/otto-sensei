import { Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { jordanPage } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { LazyTemplate, loadTemplate } from "./lazy";
import { PORTFOLIO_TEMPLATES } from "./registry";

const page = jordanPage();

function draw(id: PortfolioTemplateId) {
  return renderToStaticMarkup(
    <Suspense fallback={<p>Loading the design</p>}>
      <LazyTemplate id={id} view={page.view} content={page.content} />
    </Suspense>,
  );
}

describe("the designs the editor loads one at a time", () => {
  it("waits for a design's code the first time, then draws it straight away", async () => {
    const waiting = draw("folio");
    expect(waiting).toContain("Loading the design");
    expect(waiting).not.toContain('class="pf-folio"');

    await loadTemplate("folio");
    const html = draw("folio");
    expect(html).toContain('class="pf-folio"');
    expect(html).toContain("Jordan Ellis");
    expect(html).not.toContain("Loading the design");
  });

  it("asks for each design's code once, however often it's wanted", () => {
    expect(loadTemplate("cv")).toBe(loadTemplate("cv"));
  });

  it("loads, for every design, the same component the public page draws", async () => {
    for (const id of PORTFOLIO_TEMPLATE_IDS)
      expect(await loadTemplate(id), id).toBe(PORTFOLIO_TEMPLATES[id].Component);
  });
});
