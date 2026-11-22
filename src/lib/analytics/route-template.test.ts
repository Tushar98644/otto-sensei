import { describe, expect, it } from "vitest";
import { routeTemplate } from "./route-template";

describe("routeTemplate", () => {
  it.each([
    ["/", {}, "/"],
    ["/pricing", {}, "/pricing"],
    ["/resume-examples/nurse", { role: "nurse" }, "/resume-examples/[role]"],
    ["/p/jane-doe", { slug: "jane-doe" }, "/p/[slug]"],
    ["/s/Ab3xYz", { slug: "Ab3xYz" }, "/s/[slug]"],
    [
      "/dashboard/applications/8b571196-03b7-4f3e-9f1e-2c1d0e7a6b11/prep",
      { id: "8b571196-03b7-4f3e-9f1e-2c1d0e7a6b11" },
      "/dashboard/applications/[id]/prep",
    ],
    ["/ats/greenhouse", { system: "greenhouse" }, "/ats/[system]"],
    ["/compare/r%C3%A9sum%C3%A9-io", { competitor: "résumé-io" }, "/compare/[competitor]"],
    ["/docs/a/b/c", { path: ["a", "b", "c"] }, "/docs/[...path]"],
    ["/docs", { path: [] }, "/docs"],
  ])("%s becomes %s's template", (pathname, params, template) => {
    expect(routeTemplate(pathname, params)).toBe(template);
  });

  it("replaces the dynamic segment, not a static one with the same text", () => {
    expect(routeTemplate("/dashboard/interview/interview", { id: "interview" })).toBe(
      "/dashboard/interview/[id]",
    );
  });

  it("keeps a path with no params as it is", () => {
    expect(routeTemplate("/login", null)).toBe("/login");
  });
});
