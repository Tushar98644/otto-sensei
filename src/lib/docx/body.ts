import type { PdfLink } from "@/lib/pdf/links";
import type { PdfCompany, PdfEntry, PdfExtraSection, PdfModel, PdfSection } from "@/lib/pdf/model";
import type { DocxLook, TextLook } from "./look";
import { BULLET_LIST_ID } from "./styles";
import { paragraph, run, tabRun, type RunProps } from "./xml";

// The document body, from the same model the PDF draws: one column of paragraphs in reading order,
// no tables, text boxes, headers or footers (parsers skip or scramble those), dates on a
// right-aligned tab stop and bullets as a real list.

export type Hyperlinks = {
  // Relationship id for an address, added to the document's relationships.
  add: (href: string) => string;
};

const styleOf = (look: TextLook): RunProps => ({
  font: look.font,
  bold: look.bold,
  italic: look.italic,
  caps: look.caps,
  color: look.color,
  letterSpacing: look.letterSpacing || undefined,
  size: look.size,
});

function linkRun(link: PdfLink, props: RunProps, links: Hyperlinks): string {
  if (!link.href) return run(link.text, props);
  const id = links.add(link.href);
  return `<w:hyperlink r:id="${id}" w:history="1">${run(link.text, { ...props, style: "Hyperlink" })}</w:hyperlink>`;
}

function header(model: PdfModel, look: DocxLook, links: Hyperlinks): string[] {
  const out: string[] = [];
  if (model.name) out.push(paragraph(run(model.name), { style: "Title" }));
  if (model.headline) out.push(paragraph(run(model.headline), { style: "Subtitle" }));
  model.contact.forEach((items, index) => {
    const last = index === model.contact.length - 1;
    const content = items
      .map((item, at) => (at > 0 ? run(look.contactSeparator) : "") + linkRun(item, {}, links))
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

const detailRuns = (detail: PdfLink | null, lead: boolean, look: DocxLook, links: Hyperlinks) =>
  detail
    ? (lead ? run(" · ", styleOf(look.detail)) : "") + linkRun(detail, styleOf(look.detail), links)
    : "";

function datesRun(dates: string, look: DocxLook): string {
  return dates ? tabRun(dates, styleOf(look.dates)) : "";
}

function companyHeading(
  company: PdfCompany,
  before: number | undefined,
  look: DocxLook,
  links: Hyperlinks,
) {
  return paragraph(
    run(company.name, styleOf(look.entryTitle)) + detailRuns(company.detail, true, look, links),
    { style: "EntryHeading", before },
  );
}

function entryHeadings(
  entry: PdfEntry,
  isFirst: boolean,
  look: DocxLook,
  links: Hyperlinks,
): string[] {
  const out: string[] = [];
  if (entry.company) {
    const before = isFirst ? undefined : entry.company.first ? look.entryBefore : look.roleBefore;
    if (entry.company.first) out.push(companyHeading(entry.company, before, look, links));
    const role =
      (entry.title ? run(entry.title, styleOf(look.roleTitle)) : "") +
      detailRuns(entry.detail, Boolean(entry.title), look, links) +
      datesRun(entry.dates, look);
    if (role) {
      out.push(
        paragraph(role, {
          style: "EntryHeading",
          before: entry.company.first ? undefined : before,
        }),
      );
    }
    return out;
  }
  const before = isFirst ? undefined : look.entryBefore;
  const title = entry.title
    ? run(
        entry.org && look.entryLayout === "inline" ? `${entry.title},` : entry.title,
        styleOf(look.entryTitle),
      )
    : "";
  if (look.entryLayout === "stacked" && entry.org) {
    out.push(paragraph(title + datesRun(entry.dates, look), { style: "EntryHeading", before }));
    out.push(
      paragraph(run(entry.org, styleOf(look.org)) + detailRuns(entry.detail, true, look, links), {
        style: "EntryHeading",
      }),
    );
    return out;
  }
  const org = entry.org ? run(` ${entry.org}`, styleOf(look.org)) : "";
  const content =
    title +
    org +
    detailRuns(entry.detail, Boolean(entry.title || entry.org), look, links) +
    datesRun(entry.dates, look);
  if (content) out.push(paragraph(content, { style: "EntryHeading", before }));
  return out;
}

function entries(list: readonly PdfEntry[], look: DocxLook, links: Hyperlinks): string[] {
  return list.flatMap((entry, index) => [
    ...entryHeadings(entry, index === 0, look, links),
    ...(entry.note
      ? [paragraph(run(entry.note), { before: 1, keepNext: entry.bullets.length > 0 })]
      : []),
    // The list on each paragraph too, not only on the style: many parsers read just this.
    ...entry.bullets.map((bullet) =>
      paragraph(run(bullet.text), { style: "ListBullet", bulletList: BULLET_LIST_ID }),
    ),
  ]);
}

function sectionBody(section: PdfSection, look: DocxLook, links: Hyperlinks): string[] {
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((text, index) =>
        paragraph(run(text), { before: index > 0 ? look.paragraphBefore : undefined }),
      );
    case "skills":
      return section.lines.map((line, index) =>
        paragraph(
          (line.label ? run(`${line.label}: `, { bold: look.skillLabelBold }) : "") +
            run(line.items),
          { before: index > 0 ? look.skillBefore : undefined },
        ),
      );
    default:
      return entries(section.entries, look, links);
  }
}

function extraBody(section: PdfExtraSection, look: DocxLook, links: Hyperlinks): string[] {
  return section.list ? [paragraph(run(section.list))] : entries(section.entries, look, links);
}

const heading = (title: string) => paragraph(run(title), { style: "Heading1" });

export function bodyXml(model: PdfModel, look: DocxLook, links: Hyperlinks): string {
  return [
    ...header(model, look, links),
    ...model.sections.flatMap((section) => [
      heading(section.title),
      ...sectionBody(section, look, links),
    ]),
    ...(model.extras ?? []).flatMap((section) => [
      heading(section.title),
      ...extraBody(section, look, links),
    ]),
  ].join("");
}

export function sectionPropsXml(look: DocxLook): string {
  const t = (points: number) => Math.round(points * 20);
  const { page } = look;
  return `<w:sectPr><w:pgSz w:w="${t(page.width)}" w:h="${t(page.height)}"/><w:pgMar w:top="${t(page.top)}" w:right="${t(page.right)}" w:bottom="${t(page.bottom)}" w:left="${t(page.left)}" w:header="${t(page.top / 2)}" w:footer="${t(page.bottom / 2)}" w:gutter="0"/></w:sectPr>`;
}
