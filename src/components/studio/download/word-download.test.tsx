import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { emptyResume } from "@/lib/resume/schema";
import { useProTools } from "@/components/account/pro-tools";
import { WordDownload } from "./word-download";

vi.mock("@/components/account/pro-tools", () => ({ useProTools: vi.fn(), unlockProTool: vi.fn() }));

const render = () =>
  renderToStaticMarkup(
    <WordDownload resume={emptyResume(1_000)} pageSize="LETTER" fileName="resume.pdf" />,
  ).replace(/<[^>]+>/g, " ");

describe("WordDownload", () => {
  it("marks Word as Pro on Free, and not on a paid plan or before the plan is known", () => {
    vi.mocked(useProTools).mockReturnValue(false);
    expect(render()).toMatch(/Download Word\s+Pro/);
    for (const known of [true, null]) {
      vi.mocked(useProTools).mockReturnValue(known);
      expect(render()).not.toMatch(/Pro/);
    }
  });
});
