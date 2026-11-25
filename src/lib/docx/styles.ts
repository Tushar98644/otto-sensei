import type { ContentLang } from "@/lib/i18n/languages";
import { PDF_FONT_FAMILIES } from "@/lib/pdf/fonts";
import { WORD_BULLET_FONT, wordFont, type DocxLook, type TextLook } from "./look";
import { W_NS, XML_HEAD, escapeXml, paragraphProps, runProps, type ParagraphProps } from "./xml";

export const BULLET_LIST_ID = 1;

export function textProps(look: TextLook, base: TextLook) {
  return runProps({
    font: look.font !== base.font ? look.font : undefined,
    bold: look.bold || undefined,
    italic: look.italic || undefined,
    caps: look.caps,
    smallCaps: look.smallCaps,
    color: look.color !== base.color ? look.color : undefined,
    letterSpacing: look.letterSpacing || undefined,
    size: look.size !== base.size ? look.size : undefined,
  });
}

function paragraphStyle(id: string, name: string, paragraph: ParagraphProps, run: string): string {
  return [
    `<w:style w:type="paragraph" w:styleId="${id}">`,
    `<w:name w:val="${escapeXml(name)}"/>`,
    '<w:basedOn w:val="Normal"/>',
    '<w:next w:val="Normal"/>',
    "<w:qFormat/>",
    paragraphProps(paragraph),
    run,
    "</w:style>",
  ].join("");
}

function headingStyle(look: DocxLook): string {
  const { heading, body, textWidth, indent } = look;
  const rule = heading.rule;
  const props: ParagraphProps = {
    keepNext: true,
    keepLines: true,
    before: heading.before,
    after: heading.after,
    align: heading.center ? "center" : undefined,
    outline: 0,
  };
  if (rule?.place === "below") props.ruleBelow = { ...rule, space: 1 };
  if (rule?.place === "above") props.ruleAbove = { ...rule, space: 4 };
  if (rule?.place === "after")
    props.rightTab = { pos: textWidth - indent.right, leader: "underscore" };
  return paragraphStyle("Heading1", "heading 1", props, textProps(heading, body));
}

// Word's proofing language for each resume language.
const WORD_LANGUAGES: Record<ContentLang, string> = {
  en: "en-US",
  es: "es-MX",
  pt: "pt-BR",
  fr: "fr-FR",
  de: "de-DE",
};

export function stylesXml(look: DocxLook, lang: ContentLang = "en"): string {
  const { body } = look;
  const line = body.size * look.lineHeight;
  const center = look.centerHeader ? ("center" as const) : undefined;
  const defaults = runProps({ font: body.font, color: body.color, size: body.size });
  return [
    XML_HEAD,
    `<w:styles xmlns:w="${W_NS}">`,
    `<w:docDefaults><w:rPrDefault>${defaults.replace("</w:rPr>", `<w:lang w:val="${WORD_LANGUAGES[lang]}"/></w:rPr>`)}</w:rPrDefault>`,
    `<w:pPrDefault>${paragraphProps({ before: 0, after: 0, line })}</w:pPrDefault></w:docDefaults>`,
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>',
    '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>',
    paragraphStyle("Title", "Title", { align: center }, textProps(look.name, body)),
    paragraphStyle(
      "Subtitle",
      "Subtitle",
      { before: 2, align: center },
      textProps(look.headline, body),
    ),
    paragraphStyle("Contact", "Contact", { align: center }, textProps(look.contact, body)),
    headingStyle(look),
    paragraphStyle(
      "EntryHeading",
      "Entry heading",
      {
        keepNext: true,
        keepLines: true,
        rightTab: look.textWidth - look.indent.right,
        indent: look.indent.left || look.indent.right ? { ...look.indent } : undefined,
      },
      "",
    ),
    paragraphStyle(
      "ListBullet",
      "List Bullet",
      {
        keepLines: true,
        bulletList: BULLET_LIST_ID,
        before: look.bulletBefore,
        indent: { left: look.bulletLeft, hanging: look.bulletHanging, right: look.indent.right },
      },
      "",
    ),
    `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>${runProps({ color: look.contact.color })}</w:style>`,
    "</w:styles>",
  ].join("");
}

export function numberingXml(look: DocxLook): string {
  const left = Math.round(look.bulletLeft * 20);
  const hanging = Math.round(look.bulletHanging * 20);
  const glyph = escapeXml(look.bulletGlyph);
  const font = look.bulletGlyph === "•" ? look.body.font : WORD_BULLET_FONT;
  const { bulletLook, body } = look;
  return [
    XML_HEAD,
    `<w:numbering xmlns:w="${W_NS}">`,
    '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>',
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>',
    `<w:lvlText w:val="${glyph}"/><w:lvlJc w:val="left"/>`,
    `<w:pPr><w:ind w:left="${left}" w:hanging="${hanging}"/></w:pPr>`,
    runProps({
      font,
      color: bulletLook.color !== body.color ? bulletLook.color : undefined,
      size: bulletLook.size !== body.size ? Math.max(6, bulletLook.size) : undefined,
    }),
    "</w:lvl></w:abstractNum>",
    `<w:num w:numId="${BULLET_LIST_ID}"><w:abstractNumId w:val="0"/></w:num>`,
    "</w:numbering>",
  ].join("");
}

export function fontTableXml(look: DocxLook): string {
  const names = new Map<string, "roman" | "swiss">();
  for (const family of look.fonts) {
    const { wordClass } = PDF_FONT_FAMILIES[family];
    names.set(wordFont(family), wordClass);
    names.set(wordFont(family, true), wordClass);
  }
  names.set(WORD_BULLET_FONT, "swiss");
  return [
    XML_HEAD,
    `<w:fonts xmlns:w="${W_NS}">`,
    ...[...names].map(
      ([name, kind]) =>
        `<w:font w:name="${escapeXml(name)}"><w:family w:val="${kind}"/><w:pitch w:val="variable"/></w:font>`,
    ),
    "</w:fonts>",
  ].join("");
}
