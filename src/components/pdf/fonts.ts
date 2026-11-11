import { Font } from "@react-pdf/renderer";
import { fontCovers } from "@/lib/pdf/coverage";
import { PDF_FONT_FAMILIES, PDF_FONT_NAMES, primaryFont, type PdfFontName } from "@/lib/pdf/fonts";
import { keepWordsWhole } from "@/lib/pdf/text";
import type { PdfStyle, TemplateTheme, ThemeStyles } from "./theme";

// Registering only records where each file is: the browser fetches a face from /fonts/pdf/ on first
// use, Node reads public/fonts/pdf/. Subset embedding maps every glyph back to its character.

function defaultRoot(): string {
  if (typeof process !== "undefined" && process.versions?.node) {
    return `${process.cwd()}/public/fonts/pdf`;
  }
  return "/fonts/pdf";
}

let registered = false;

type Glyph = { codePoints: number[] };
type FontkitFont = { getGlyph: (id: number, codePoints?: number[]) => Glyph | null };
type Source = { data: unknown; _load?: () => Promise<void> };

// fontkit caches one glyph per id with the characters first asked for. A composite letter ("Å")
// fetches its parts with none, so the next PDF's "A" read back as a gap ("maon" for "Amazon").
// A glyph that has none takes the ones it's asked for.
function keepCharacters(font: FontkitFont) {
  const getGlyph = font.getGlyph.bind(font);
  font.getGlyph = (id, codePoints = []) => {
    const glyph = getGlyph(id, codePoints);
    if (glyph && codePoints.length > 0 && glyph.codePoints.length === 0) {
      glyph.codePoints = codePoints;
    }
    return glyph;
  };
}

function patchSources(name: PdfFontName) {
  const family = Font.getRegisteredFonts()[name] as unknown as { sources: Source[] } | undefined;
  for (const source of family?.sources ?? []) {
    const load = source._load?.bind(source);
    if (!load) continue;
    source._load = async () => {
      await load();
      if (source.data && typeof (source.data as FontkitFont).getGlyph === "function") {
        keepCharacters(source.data as FontkitFont);
      }
    };
  }
}

export function registerPdfFonts(): void {
  if (registered) return;
  const root = defaultRoot();
  for (const name of PDF_FONT_NAMES) {
    const family = PDF_FONT_FAMILIES[name];
    Font.register({
      family: name,
      fonts: family.faces.map((face) => ({
        src: `${root}/${family.dir}/${face.file}`,
        fontWeight: face.weight,
        fontStyle: face.style,
      })),
    });
    patchSources(name);
  }
  // Backstop for any Text that skips keepWordsWhole: keywords stay whole for hiring software.
  Font.registerHyphenationCallback(keepWordsWhole);
  registered = true;
}

registerPdfFonts();

// Adds a close fallback face where the family can't draw a character (Cyrillic in Pagella).
export function withFontFallbacks(theme: TemplateTheme, text: string): TemplateTheme {
  // Formats print some lines in capitals ("ĞÖKÇE"), which a family may lack where it has "ğökçe".
  const printed = text + text.toLocaleUpperCase();
  const needed = new Map<PdfFontName, boolean>();
  const needsFallback = (name: PdfFontName) => {
    let value = needed.get(name);
    if (value === undefined) {
      value = PDF_FONT_FAMILIES[name].fallback !== null && !fontCovers(name, printed);
      needed.set(name, value);
    }
    return value;
  };
  let changed = false;
  const styles = { ...theme.styles };
  for (const slot of Object.keys(styles) as (keyof ThemeStyles)[]) {
    const style: PdfStyle = styles[slot];
    const name = primaryFont(style.fontFamily);
    if (!name || Array.isArray(style.fontFamily) || !needsFallback(name)) continue;
    styles[slot] = { ...style, fontFamily: [name, PDF_FONT_FAMILIES[name].fallback!] };
    changed = true;
  }
  return changed ? { ...theme, styles } : theme;
}
