import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Popover } from "./popover";

describe("Popover", () => {
  it("renders its content only once it opens", () => {
    const html = renderToStaticMarkup(
      <Popover label="Your resumes" trigger="Switch resume">
        <p>Every resume</p>
      </Popover>,
    );
    expect(html).toContain("Switch resume");
    expect(html).toMatch(/<div[^>]*popover="auto"[^>]*aria-label="Your resumes"[^>]*><\/div>/);
    expect(html).not.toContain("Every resume");
  });
});
