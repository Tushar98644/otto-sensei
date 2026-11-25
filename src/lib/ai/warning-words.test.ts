import { describe, expect, it } from "vitest";
import de from "@/i18n/messages/de/otto";
import en from "@/i18n/messages/en/otto";
import es from "@/i18n/messages/es/otto";
import {
  clicheWarning,
  fillInWarning,
  unbackedWarning,
  verbWarning,
  warningIn,
} from "./warning-text";

const WARNINGS = [
  fillInWarning(["[number]", "[team]"], "before you send it. Otto never guesses numbers."),
  fillInWarning(["[team]"], "with your own words before you send it."),
  fillInWarning(["[team]"], "before you send it."),
  "Fill in [team] before you use it.",
  "Put your real figure in [number], or cut it. Otto never guesses numbers.",
  verbWarning("Led", "“Helped with the launch”"),
  unbackedWarning("award-winning"),
  clicheWarning(["team player", "results-driven"]),
];

describe("warnings under AI results", () => {
  it("read the same in English", () => {
    for (const warning of WARNINGS) expect(warningIn(warning, en.warnings)).toBe(warning);
  });

  it("read in Spanish and German", () => {
    const [numbers, , , , number, verb, unbacked, cliche] = WARNINGS.map((warning) =>
      warningIn(warning, es.warnings),
    );
    expect(numbers).toBe("Completa [number], [team] antes de enviarlo. Otto nunca inventa números.");
    expect(number).toBe(es.warnings.number);
    expect(verb).toBe("Revisa “Led”. Tu currículum dice “Helped with the launch”.");
    expect(unbacked).toMatch(/^Revisa “award-winning”: /);
    expect(cliche).toMatch(/^Cambia “team player”, “results-driven” por /);
    expect(warningIn(WARNINGS[7]!, de.warnings)).toMatch(/^Ersetz „team player“, „results-driven“ /);
  });

  it("keeps a warning it can't read", () => {
    expect(warningIn("Something new", es.warnings)).toBe("Something new");
    expect(warningIn("Fill in [x] tomorrow.", es.warnings)).toBe("Fill in [x] tomorrow.");
  });
});
