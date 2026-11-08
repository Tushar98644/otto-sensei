import type { DocxLook, TextLook } from "./look";
import { W_NS, XML_HEAD, escapeXml, paragraphProps, runProps, type ParagraphProps } from "./xml";

// Named styles, so the file reads like one a person made in Word: "Title" for the name, "Heading 1"
// for section headings (what hiring software and screen readers look for), "List Bullet" for a real
// bulleted list. The look sits in the styles, the words in the document.

export const BULLET_LIST_ID = 1;

function textProps(look: TextLook, base: TextLook) {
  return runProps({
    font: look.font !== base.font ? look.font : undefined,
    bold: look.bold,
    italic: look.italic,
    caps: look.caps,
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

export function stylesXml(look: DocxLook): string {
  const { body } = look;
  const line = body.size * look.lineHeight;
  const center = look.centerHeader ? ("center" as const) : undefined;
  const defaults = runProps({ font: body.font, color: body.color, size: body.size });
  return [
    XML_HEAD,
    `<w:styles xmlns:w="${W_NS}">`,
    `<w:docDefaults><w:rPrDefault>${defaults.replace("</w:rPr>", '<w:lang w:val="en-US"/></w:rPr>')}</w:rPrDefault>`,
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
    paragraphStyle(
      "Heading1",
      "heading 1",
      {
        keepNext: true,
        keepLines: true,
        ruleBelow: look.heading.rule ? { ...look.heading.rule, space: 1 } : undefined,
        before: look.heading.before,
        after: look.heading.after,
        outline: 0,
      },
      textProps(look.heading, body),
    ),
    paragraphStyle(
      "EntryHeading",
      "Entry heading",
      { keepNext: true, keepLines: true, rightTab: look.textWidth },
      "",
    ),
    paragraphStyle(
      "ListBullet",
      "List Bullet",
      {
        keepLines: true,
        bulletList: BULLET_LIST_ID,
        before: look.bulletBefore,
        indent: { left: look.bulletIndent, hanging: look.bulletIndent },
      },
      "",
    ),
    `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>${runProps({ color: look.contact.color })}</w:style>`,
    "</w:styles>",
  ].join("");
}

export function numberingXml(look: DocxLook): string {
  const indent = Math.round(look.bulletIndent * 20);
  const glyph = escapeXml(look.bulletGlyph);
  return [
    XML_HEAD,
    `<w:numbering xmlns:w="${W_NS}">`,
    '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>',
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>',
    `<w:lvlText w:val="${glyph}"/><w:lvlJc w:val="left"/>`,
    `<w:pPr><w:ind w:left="${indent}" w:hanging="${indent}"/></w:pPr>`,
    runProps({ font: look.body.font }),
    "</w:lvl></w:abstractNum>",
    `<w:num w:numId="${BULLET_LIST_ID}"><w:abstractNumId w:val="0"/></w:num>`,
    "</w:numbering>",
  ].join("");
}
