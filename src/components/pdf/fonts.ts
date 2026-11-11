import { Font } from "@react-pdf/renderer";
import { fontCovers } from "@/lib/pdf/coverage";
import { PDF_FONT_FAMILIES, PDF_FONT_NAMES, primaryFont, type PdfFontName } from "@/lib/pdf/fonts";
import { keepWordsWhole } from "@/lib/pdf/text";
import type { PdfStyle, TemplateTheme, ThemeStyles } from "./theme";

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

// fontkit caches a composite glyph's parts with no characters ("maon" for "Amazon"); refill them.
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
  Font.registerHyphenationCallback(keepWordsWhole);
  registered = true;
}

registerPdfFonts();

export function withFontFallbacks(theme: TemplateTheme, text: string): TemplateTheme {
  // Some lines print in capitals, which a family may lack ("ĞÖKÇE" but not "ğökçe").
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
