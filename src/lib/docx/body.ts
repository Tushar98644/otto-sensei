import {
  contactLines,
  entryRows,
  headingRuns,
  headlineLine,
  nameRuns,
  SECTION_KINDS,
  type PlannedRow,
  type Run,
} from "@/components/pdf/layout";
import type { EntryKind } from "@/components/pdf/theme";
import type { PdfLink } from "@/lib/pdf/links";
import type { PdfEntry, PdfExtraSection, PdfModel, PdfSection } from "@/lib/pdf/model";
import { textLook, type DocxLook, type TextLook } from "./look";
import { BULLET_LIST_ID } from "./styles";
import { paragraph, run, runProps, tabRun, type RunProps } from "./xml";

export type Hyperlinks = {
  add: (href: string) => string;
};

function styleOf(look: TextLook, base: TextLook): RunProps {
  const changed = <K extends keyof TextLook>(key: K) =>
    look[key] !== base[key] ? look[key] : undefined;
  return {
    font: changed("font"),
    bold: changed("bold"),
    italic: changed("italic"),
    caps: changed("caps") || undefined,
    smallCaps: changed("smallCaps") || undefined,
    color: changed("color"),
    letterSpacing: changed("letterSpacing"),
    size: changed("size"),
  };
}

const linkProps = (look: TextLook, base: TextLook): RunProps => ({
  ...styleOf(look, base),
  color: look.color,
});

function linkRun(link: PdfLink, props: RunProps, links: Hyperlinks): string {
  if (!link.href) return run(link.text, props);
  const id = links.add(link.href);
  return `<w:hyperlink r:id="${id}" w:history="1">${run(link.text, { ...props, style: "Hyperlink" })}</w:hyperlink>`;
}

function linkLook(link: PdfLink, parent: TextLook, look: DocxLook): TextLook {
  const web = link.href !== null && !link.href.startsWith("mailto:");
  const { styles } = look.theme;
  return textLook(web ? styles.webLink : styles.link, parent);
}

function runsXml(
  runs: readonly Run[],
  line: TextLook,
  base: TextLook,
  look: DocxLook,
  links: Hyperlinks,
): string {
  return runs
    .map((piece) => {
      const own = textLook(piece.style, line);
      if (!piece.link) return run(piece.text, styleOf(own, base));
      const link = { ...piece.link, text: piece.text };
      return linkRun(link, linkProps(linkLook(link, own, look), base), links);
    })
    .join("");
}

export function header(model: PdfModel, look: DocxLook, links: Hyperlinks): string[] {
  const { theme } = look;
  const out: string[] = [];
  const name = nameRuns(model, theme);
  if (name.length > 0) {
    out.push(paragraph(runsXml(name, look.name, look.name, look, links), { style: "Title" }));
  }
  const headline = headlineLine(model, theme);
  if (headline) out.push(paragraph(run(headline), { style: "Subtitle" }));
  const lines = contactLines(model, theme);
  lines.forEach((items, index) => {
    const last = index === lines.length - 1;
    const lineLook = index === 0 ? look.contact : look.contactNext;
    const own = styleOf(lineLook, look.contact);
    const content = items
      .map(
        (item, at) =>
          (at > 0 ? run(theme.contactSeparator, own) : "") +
          (item.href
            ? linkRun(item, linkProps(linkLook(item, lineLook, look), look.contact), links)
            : run(item.text, own)),
      )
      .join("");
    out.push(
      paragraph(content, {
        style: "Contact",
        before: index === 0 ? look.contact.before : 1,
        ruleBelow: last && look.headerRule ? { ...look.headerRule, space: 6 } : undefined,
      }),
    );
  });
  return out;
}

function rowXml(row: PlannedRow, before: number | undefined, look: DocxLook, links: Hyperlinks) {
  const line = textLook(row.text, look.body);
  let content = runsXml(row.lead, line, look.body, look, links);
  if (row.side) {
    const side = textLook(row.side.style, line);
    content += row.side.link
      ? `<w:r><w:tab/></w:r>${linkRun(row.side.link, linkProps(linkLook(row.side.link, side, look), look.body), links)}`
      : tabRun(row.side.text, styleOf(side, look.body));
  }
  return paragraph(content, { style: "EntryHeading", before });
}

function entries(
  list: readonly PdfEntry[],
  kind: EntryKind,
  look: DocxLook,
  links: Hyperlinks,
): string[] {
  const note = textLook(look.theme.styles.entryNote, look.body);
  return list.flatMap((entry, index) => {
    const before =
      index === 0
        ? undefined
        : entry.company && !entry.company.first
          ? look.roleBefore
          : look.entryBefore;
    return [
      ...entryRows(entry, kind, look.theme).map((row, at) =>
        rowXml(row, at === 0 ? before : undefined, look, links),
      ),
      ...(entry.note
        ? [
            paragraph(run(entry.note, styleOf(note, look.body)), {
              before: 1,
              keepNext: entry.bullets.length > 0,
              indent: look.indent.left ? { left: look.indent.left } : undefined,
            }),
          ]
        : []),
      // The list on each paragraph too, not only on the style: many parsers read just this.
      ...entry.bullets.map((bullet) => bulletXml(run(bullet.text, bulletText(look)))),
    ];
  });
}

const bulletText = (look: DocxLook) =>
  styleOf(textLook(look.theme.styles.bulletText, look.body), look.body);

function bulletXml(content: string): string {
  return paragraph(content, { style: "ListBullet", bulletList: BULLET_LIST_ID });
}

function sectionBody(section: PdfSection, look: DocxLook, links: Hyperlinks): string[] {
  const { styles } = look.theme;
  const indent = look.indent.left ? { left: look.indent.left } : undefined;
  switch (section.key) {
    case "summary": {
      const text = styleOf(textLook(styles.paragraph, look.body), look.body);
      return section.paragraphs.map((value, index) =>
        paragraph(run(value, text), {
          before: index > 0 ? look.paragraphBefore : undefined,
          indent,
        }),
      );
    }
    case "skills": {
      const line = textLook(styles.skillLine, look.body);
      return section.lines.map((item, index) => {
        const content =
          (item.label
            ? run(`${item.label}: `, styleOf(textLook(styles.skillLabel, line), look.body))
            : "") + run(item.items, styleOf(textLook(styles.skillItems, line), look.body));
        if (look.theme.skills === "bullets") return bulletXml(content);
        return paragraph(content, { before: index > 0 ? look.skillBefore : undefined, indent });
      });
    }
    default:
      return entries(section.entries, SECTION_KINDS[section.key], look, links);
  }
}

function extraBody(section: PdfExtraSection, look: DocxLook, links: Hyperlinks): string[] {
  return section.list
    ? [
        paragraph(run(section.list), {
          indent: look.indent.left ? { left: look.indent.left } : undefined,
        }),
      ]
    : entries(section.entries, "item", look, links);
}

function heading(title: string, look: DocxLook): string {
  const runs = headingRuns(title, look.theme)
    .map((piece) => {
      const own = textLook(piece.style, look.heading);
      return own.color !== look.heading.color
        ? run(piece.text, { color: own.color })
        : run(piece.text);
    })
    .join("");
  const rule = look.heading.rule;
  const leader =
    rule?.place === "after" ? `<w:r>${runProps({ color: rule.color })}<w:tab/></w:r>` : "";
  return paragraph(runs + leader, { style: "Heading1" });
}

export function bodyXml(model: PdfModel, look: DocxLook, links: Hyperlinks): string {
  return [
    ...header(model, look, links),
    ...model.sections.flatMap((section) => [
      heading(section.title, look),
      ...sectionBody(section, look, links),
    ]),
    ...(model.extras ?? []).flatMap((section) => [
      heading(section.title, look),
      ...extraBody(section, look, links),
    ]),
  ].join("");
}

export function sectionPropsXml(look: DocxLook): string {
  const t = (points: number) => Math.round(points * 20);
  const { page } = look;
  return `<w:sectPr><w:pgSz w:w="${t(page.width)}" w:h="${t(page.height)}"/><w:pgMar w:top="${t(page.top)}" w:right="${t(page.right)}" w:bottom="${t(page.bottom)}" w:left="${t(page.left)}" w:header="${t(page.top / 2)}" w:footer="${t(page.bottom / 2)}" w:gutter="0"/></w:sectPr>`;
}
