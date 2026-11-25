import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { emptyResume } from "@/lib/resume/schema";
import { inStudio } from "../testing";

vi.mock("next/navigation", () => ({ usePathname: () => "/studio" }));

const { FreeMatch } = await import("./free-match");

const resume = {
  ...emptyResume(0),
  experience: [
    {
      id: "job",
      company: "Ledgerly",
      title: "Engineer",
      location: "",
      startDate: "2021",
      endDate: "Present",
      bullets: [{ id: "b1", text: "Built the payments API in TypeScript" }],
    },
  ],
};

describe("FreeMatch", () => {
  it("shows the free word check first, then what tailoring on Pro adds", () => {
    const html = renderToStaticMarkup(
      inStudio(<FreeMatch source={resume} jobText={"Requirements\n- TypeScript\n- GraphQL"} />),
    );
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("Found 1 of 2 skills the post names");
    expect(text).toContain("Engineer at Ledgerly, line 1");
    expect(text.indexOf("Found 1 of 2")).toBeLessThan(
      text.indexOf("Tailoring on Pro goes further"),
    );
    expect(text).toContain("Try Pro for 7 days");
    expect(text).not.toContain("Already on Pro?");
  });

  it("offers a signed-out visitor, who may already have Pro, a way to sign in", () => {
    const html = renderToStaticMarkup(
      inStudio(
        <FreeMatch source={resume} jobText={"Requirements\n- TypeScript"} onSignIn={() => {}} />,
      ),
    );
    expect(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).toContain("Already on Pro? Sign in");
  });
});
