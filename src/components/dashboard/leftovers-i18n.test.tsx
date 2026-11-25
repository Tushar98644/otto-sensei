import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { chosenFormatLines } from "@/components/formats/chosen-format-note";
import { formatsLead } from "@/components/formats/formats-lead";
import { pullMeta, repoMeta } from "@/components/github/format";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Label } from "@/components/ui/label";
import { formatFor } from "@/i18n/intl";
import { loadMessages } from "@/i18n/messages";
import { withMessages } from "@/i18n/messages-testing";
import { categoryOf } from "@/lib/portfolio/content-auto";
import { voiceProblemCopy } from "@/lib/voice/problems";

vi.mock("@/components/account/pro-tools", () => ({ useProTools: () => false }));

const es = formatFor("es");

describe("dashboard leftovers in Spanish", () => {
  it("words the formats page and the chosen-format note", async () => {
    const { lead, chosen } = await loadMessages("es", "formats");
    expect(formatsLead(true, lead)).toMatch(
      /^Un currículum, \d+ estilos\. Classic y Compact son gratis\./,
    );
    expect(chosenFormatLines("modern", false, chosen).detail).toBe(
      "Modern es un formato de Pro, así que en Free tu descarga sale en Classic.",
    );
  });

  it("draws shared controls from the ui namespace", async () => {
    const html = renderToStaticMarkup(
      await withMessages(
        "es",
        ["ui"],
        <>
          <FeedbackButton />
          <Label optional>Ciudad</Label>
        </>,
      ),
    );
    expect(html).toContain("Enviar comentarios");
    expect(html).toContain(" (opcional)");
    expect(html).not.toContain("Send feedback");
  });

  it("words voice problems and GitHub details in Spanish", async () => {
    const ui = await loadMessages("es", "ui");
    expect(voiceProblemCopy({ code: "no-speech" }, ui.voice.problems).title).toBe(
      "Otto no oyó nada",
    );
    const { pick } = await loadMessages("es", "github");
    const repo = { language: "TypeScript", stars: 1200, archived: true } as Parameters<
      typeof repoMeta
    >[0];
    expect(repoMeta(repo, pick, es)).toMatch(/^TypeScript · 1\D?200 estrellas · Archivado$/);
    const pull = { repo: "a/b", number: 7, mergedAt: "2026-03-04T00:00:00Z" } as Parameters<
      typeof pullMeta
    >[0];
    expect(pullMeta(pull, pick, es)).toMatch(/^a\/b #7 · Fusionado en mar/);
  });
});

describe("what Otto fills in on a portfolio", () => {
  it("follows the resume's language", () => {
    expect(categoryOf(["Won the city hackathon"], "me/app", [])).toBe("Hackathon · Open source");
    expect(categoryOf(["Won the city hackathon"], "me/app", [], "es")).toBe(
      "Hackatón · Código abierto",
    );
  });
});
