import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { AUTH_LOCALE_KEY, CODE_EMAIL, codeEmailBody, codeEmailSubject } from "./code-email";

// What the Supabase templates said before languages, byte for byte.
const ENGLISH_SUBJECT = "Your Otto Sensei code: {{ .Token }}";
const ENGLISH_BODY = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#12241d;max-width:480px">
<img src="https://www.ottosensei.com/email/otto-head.png" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 8px">Your Otto Sensei code is</p>
<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p style="margin:0 0 16px">It expires in 10 minutes.</p>
<p style="margin:0;color:#475850;font-size:14px">If you didn't ask for this, you can ignore this email.</p>
</div>`;

const BRANCH = new RegExp(
  `\\{\\{ (?:if|else if) eq \\(printf "%v" \\.Data\\.${AUTH_LOCALE_KEY}\\) "([^"]+)" \\}\\}|\\{\\{ else \\}\\}|\\{\\{ end \\}\\}`,
  "g",
);

// What Go's template does with this one if/else-if/else chain: the block whose locale matches, else the last.
function render(template: string, locale: unknown): string {
  const marks = [...template.matchAll(BRANCH)];
  expect(marks[0]?.index).toBe(0);
  expect(marks.at(-1)?.[0]).toBe("{{ end }}");
  expect(marks.at(-1)?.index).toBe(template.length - "{{ end }}".length);
  const blocks = marks.slice(0, -1).map((mark, index) => ({
    locale: mark[1] ?? null,
    text: template.slice((mark.index ?? 0) + mark[0].length, marks[index + 1]?.index),
  }));
  const value = typeof locale === "string" ? locale : "<nil>";
  return (blocks.find((block) => block.locale === value) ?? blocks.at(-1)!).text;
}

describe("the sign-in code email", () => {
  it("is exactly the old English email for anyone without a language", () => {
    expect(codeEmailSubject("en")).toBe(ENGLISH_SUBJECT);
    expect(codeEmailBody("en")).toBe(ENGLISH_BODY);
    for (const value of [undefined, null, "en", "pt", "es-MX", "EN", "<script>"]) {
      expect(render(CODE_EMAIL.subject, value)).toBe(ENGLISH_SUBJECT);
      expect(render(CODE_EMAIL.body, value)).toBe(ENGLISH_BODY);
    }
  });

  it("has a block per language, each with the code and no link", () => {
    for (const locale of LOCALES) {
      expect(render(CODE_EMAIL.subject, locale)).toBe(codeEmailSubject(locale));
      expect(render(CODE_EMAIL.body, locale)).toBe(codeEmailBody(locale));
      expect(codeEmailSubject(locale)).toContain("{{ .Token }}");
      expect(codeEmailBody(locale).match(/\{\{/g)).toHaveLength(1);
    }
    expect(CODE_EMAIL.body).not.toContain("ConfirmationURL");
    expect(render(CODE_EMAIL.body, "es")).toContain("Tu código de Otto Sensei es");
    expect(render(CODE_EMAIL.subject, "pt-BR")).toBe("Seu código do Otto Sensei: {{ .Token }}");
    expect(render(CODE_EMAIL.body, "de")).toContain("Er läuft in 10 Minuten ab.");
    expect(render(CODE_EMAIL.body, "fr")).toContain("Si tu ne l'as pas demandé");
  });

  it("stays well under Supabase's template size", () => {
    expect(CODE_EMAIL.body.length).toBeLessThan(10_000);
  });
});
