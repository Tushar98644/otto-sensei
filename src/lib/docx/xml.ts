// Small WordprocessingML builders. Word rejects a file whose property elements are out of schema
// order ("unreadable content"), so each builder writes its children in the order the schema
// lists them, not in the order the options happen to be given.

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Word measures in twentieths of a point (twips), font sizes in half points and rules in eighths.
export const twips = (points: number) => Math.round(points * 20);
export const halfPoints = (points: number) => Math.max(2, Math.round(points * 2));
export const eighths = (points: number) => Math.min(96, Math.max(2, Math.round(points * 8)));
export const hex = (color: string) => color.replace(/^#/, "").toUpperCase();

export type RunProps = {
  style?: string;
  font?: string;
  bold?: boolean;
  italic?: boolean;
  caps?: boolean;
  smallCaps?: boolean;
  color?: string;
  // Extra space between letters, in points.
  letterSpacing?: number;
  size?: number;
};

export function runProps(props: RunProps): string {
  const parts: string[] = [];
  if (props.style) parts.push(`<w:rStyle w:val="${props.style}"/>`);
  if (props.font) {
    const font = escapeXml(props.font);
    parts.push(
      `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`,
    );
  }
  // False turns off what the paragraph's style turns on (a plain headline beside a bold name).
  if (props.bold !== undefined)
    parts.push(props.bold ? "<w:b/><w:bCs/>" : '<w:b w:val="0"/><w:bCs w:val="0"/>');
  if (props.italic !== undefined)
    parts.push(props.italic ? "<w:i/><w:iCs/>" : '<w:i w:val="0"/><w:iCs w:val="0"/>');
  if (props.caps) parts.push("<w:caps/>");
  else if (props.smallCaps) parts.push("<w:smallCaps/>");
  if (props.color) parts.push(`<w:color w:val="${hex(props.color)}"/>`);
  if (props.letterSpacing) parts.push(`<w:spacing w:val="${twips(props.letterSpacing)}"/>`);
  if (props.size) {
    const size = halfPoints(props.size);
    parts.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  }
  return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

export function run(text: string, props: RunProps = {}): string {
  return `<w:r>${runProps(props)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

// A tab and then text in one run, so the right-aligned dates are one piece for a parser.
export function tabRun(text: string, props: RunProps = {}): string {
  return `<w:r>${runProps(props)}<w:tab/><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

export type Rule = { color: string; width: number; space: number };

export type TabStop = { pos: number; leader?: "underscore" };

export type ParagraphProps = {
  style?: string;
  keepNext?: boolean;
  keepLines?: boolean;
  bulletList?: number;
  ruleBelow?: Rule;
  ruleAbove?: Rule;
  // A right-aligned tab stop this far from the left margin. Every length here is in points.
  rightTab?: number | TabStop;
  before?: number;
  after?: number;
  // Line pitch in points; never tighter than the font needs.
  line?: number;
  indent?: { left: number; hanging?: number; right?: number };
  align?: "left" | "center";
  outline?: number;
};

export function paragraphProps(props: ParagraphProps): string {
  const parts: string[] = [];
  if (props.style) parts.push(`<w:pStyle w:val="${props.style}"/>`);
  if (props.keepNext) parts.push("<w:keepNext/>");
  if (props.keepLines) parts.push("<w:keepLines/>");
  if (props.bulletList !== undefined) {
    parts.push(`<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${props.bulletList}"/></w:numPr>`);
  }
  if (props.ruleAbove || props.ruleBelow) {
    const border = (side: "top" | "bottom", { color, width, space }: Rule) =>
      `<w:${side} w:val="single" w:sz="${eighths(width)}" w:space="${Math.max(0, Math.round(space))}" w:color="${hex(color)}"/>`;
    parts.push(
      `<w:pBdr>${props.ruleAbove ? border("top", props.ruleAbove) : ""}${props.ruleBelow ? border("bottom", props.ruleBelow) : ""}</w:pBdr>`,
    );
  }
  if (props.rightTab !== undefined) {
    const tab = typeof props.rightTab === "number" ? { pos: props.rightTab } : props.rightTab;
    const leader = tab.leader ? ` w:leader="${tab.leader}"` : "";
    parts.push(`<w:tabs><w:tab w:val="right"${leader} w:pos="${twips(tab.pos)}"/></w:tabs>`);
  }
  if (props.before !== undefined || props.after !== undefined || props.line !== undefined) {
    const attrs = [
      props.before !== undefined ? `w:before="${twips(props.before)}"` : "",
      props.after !== undefined ? `w:after="${twips(props.after)}"` : "",
      props.line !== undefined ? `w:line="${twips(props.line)}" w:lineRule="atLeast"` : "",
    ].filter(Boolean);
    parts.push(`<w:spacing ${attrs.join(" ")}/>`);
  }
  if (props.indent) {
    const { left, hanging, right } = props.indent;
    const attrs = [
      `w:left="${twips(left)}"`,
      right ? `w:right="${twips(right)}"` : "",
      hanging ? `w:hanging="${twips(hanging)}"` : "",
    ].filter(Boolean);
    parts.push(`<w:ind ${attrs.join(" ")}/>`);
  }
  if (props.align === "center") parts.push('<w:jc w:val="center"/>');
  if (props.outline !== undefined) parts.push(`<w:outlineLvl w:val="${props.outline}"/>`);
  return parts.length ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}

export function paragraph(content: string, props: ParagraphProps = {}): string {
  return `<w:p>${paragraphProps(props)}${content}</w:p>`;
}
