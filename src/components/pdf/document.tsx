import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { Fragment, type ReactElement, type ReactNode } from "react";
import { BRAND } from "@/config/brand";
import type { PdfLink } from "@/lib/pdf/links";
import {
  buildPdfModel,
  type PdfCompany,
  type PdfEntry,
  type PdfExtraSection,
  type PdfModel,
  type PdfSection,
} from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { keepWordsWhole } from "@/lib/pdf/text";
import type { Resume } from "@/lib/resume/schema";
import type { PdfStyle, TemplateTheme } from "./theme";

// The one resume layout every format shares: one column, clear headings in the user's section
// order (extra sections after them), and no tables, images or icons. Reading order on the page is
// the order a parser reads it in. Formats and look settings change only the theme.

export type ResumeDocumentProps = {
  resume: Resume;
  pageSize?: PdfPageSize;
  theme: TemplateTheme;
};

// react-pdf treats the seam between two text pieces of one line (even two strings side by side
// in JSX) as a place it may break with a hyphen ("Engineer-"). So every seam below sits on a
// regular space, and a piece with punctuation is one string: `${title},` and `${label}: `.

// Every Text goes through here so no word is ever hyphenated across lines.
export function Line({ style, children }: { style?: PdfStyle; children: ReactNode }) {
  return (
    <Text style={style} hyphenationCallback={keepWordsWhole}>
      {children}
    </Text>
  );
}

// Inline only: rendered inside a Line. Web addresses can look different from the email address.
function LinkText({ link, theme }: { link: PdfLink; theme: TemplateTheme }) {
  const web = link.href !== null && !link.href.startsWith("mailto:");
  const style = web ? theme.styles.webLink : theme.styles.link;
  if (!link.href) return <>{link.text}</>;
  return (
    <Link src={link.href} style={style}>
      {link.text}
    </Link>
  );
}

// Shared with the cover letter, so both pages carry the same name block.
export function Header({ model, theme }: { model: PdfModel; theme: TemplateTheme }) {
  const { styles } = theme;
  return (
    <View style={styles.header}>
      {model.name ? <Line style={styles.name}>{model.name}</Line> : null}
      {model.headline ? <Line style={styles.headline}>{model.headline}</Line> : null}
      {model.contact.map((items, line) => (
        <Line key={line} style={line === 0 ? styles.contact : styles.contactNext}>
          {items.map((item, index) => (
            <Fragment key={`${index}-${item.text}`}>
              {index > 0 ? theme.contactSeparator : null}
              <LinkText link={item} theme={theme} />
            </Fragment>
          ))}
        </Line>
      ))}
      {theme.headerRule ? <View style={styles.headerRule} /> : null}
    </View>
  );
}

function Detail({
  detail,
  theme,
  lead,
}: {
  detail: PdfLink | null;
  theme: TemplateTheme;
  lead: boolean;
}) {
  if (!detail) return null;
  return (
    <Text style={theme.styles.entryDetail}>
      {lead ? " · " : null}
      <LinkText link={detail} theme={theme} />
    </Text>
  );
}

function InlineEntryHeader({ entry, theme }: { entry: PdfEntry; theme: TemplateTheme }) {
  const { styles } = theme;
  return (
    <View style={styles.entryHeader}>
      <Line style={styles.entryLead}>
        {entry.title ? (
          <Text style={styles.entryTitle}>{entry.org ? `${entry.title},` : entry.title}</Text>
        ) : null}
        {entry.org ? <Text style={styles.entryOrg}>{` ${entry.org}`}</Text> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title || entry.org)} />
      </Line>
      {entry.dates ? <Line style={styles.dates}>{entry.dates}</Line> : null}
    </View>
  );
}

function StackedEntryHeader({ entry, theme }: { entry: PdfEntry; theme: TemplateTheme }) {
  const { styles } = theme;
  // A project has no company, so its link moves up beside the name instead of sitting alone.
  const subline = Boolean(entry.org);
  return (
    <View>
      <View style={styles.entryHeader}>
        <Line style={styles.entryLead}>
          {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
          {subline ? null : (
            <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
          )}
        </Line>
        {entry.dates ? <Line style={styles.dates}>{entry.dates}</Line> : null}
      </View>
      {subline ? (
        <Line style={styles.entrySub}>
          <Text style={styles.entryOrg}>{entry.org}</Text>
          <Detail detail={entry.detail} theme={theme} lead />
        </Line>
      ) : null}
    </View>
  );
}

// The company once, in the entry title's weight, with the location when every role shares it.
function CompanyHeader({ company, theme }: { company: PdfCompany; theme: TemplateTheme }) {
  const { styles } = theme;
  return (
    <View style={styles.entryHeader}>
      <Line style={styles.entryLead}>
        <Text style={styles.entryTitle}>{company.name}</Text>
        <Detail detail={company.detail} theme={theme} lead />
      </Line>
    </View>
  );
}

// Same shape in every layout: the role, its own location when the company header has none, and
// its dates on the right.
function RoleHeader({ entry, theme }: { entry: PdfEntry; theme: TemplateTheme }) {
  const { styles } = theme;
  if (!entry.title && !entry.detail && !entry.dates) return null;
  return (
    <View style={styles.entryHeader}>
      <Line style={styles.entryLead}>
        {entry.title ? <Text style={styles.roleTitle}>{entry.title}</Text> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
      </Line>
      {entry.dates ? <Line style={styles.dates}>{entry.dates}</Line> : null}
    </View>
  );
}

function EntryHeader({ entry, theme }: { entry: PdfEntry; theme: TemplateTheme }) {
  if (!entry.title && !entry.org && !entry.detail && !entry.dates) return null;
  return theme.entryLayout === "stacked" ? (
    <StackedEntryHeader entry={entry} theme={theme} />
  ) : (
    <InlineEntryHeader entry={entry} theme={theme} />
  );
}

// The hanging indent keeps wrapped lines aligned with the text, not the bullet. A bullet never
// splits across pages.
function Bullet({ text, theme }: { text: string; theme: TemplateTheme }) {
  const { styles } = theme;
  return (
    <View style={styles.bullet} wrap={false}>
      <Line style={styles.bulletGlyph}>{theme.bulletGlyph}</Line>
      <Line style={styles.bulletText}>{text}</Line>
    </View>
  );
}

function entrySpacing(
  entry: PdfEntry,
  isFirst: boolean,
  theme: TemplateTheme,
): PdfStyle | undefined {
  if (isFirst) return undefined;
  // A second role at the same company sits closer than the next company does.
  return entry.company && !entry.company.first ? theme.styles.role : theme.styles.entry;
}

// An entry's heading and first bullet stay together, so a heading never ends a page on its own.
// A company header travels with its first role the same way.
function entryBlocks(entry: PdfEntry, isFirst: boolean, theme: TemplateTheme): ReactElement[] {
  const [lead, ...rest] = entry.bullets;
  return [
    <View key={entry.id} wrap={false} style={entrySpacing(entry, isFirst, theme)}>
      {entry.company?.first ? <CompanyHeader company={entry.company} theme={theme} /> : null}
      {entry.company ? (
        <RoleHeader entry={entry} theme={theme} />
      ) : (
        <EntryHeader entry={entry} theme={theme} />
      )}
      {entry.note ? <Line style={theme.styles.entryNote}>{entry.note}</Line> : null}
      {lead ? <Bullet text={lead.text} theme={theme} /> : null}
    </View>,
    ...rest.map((bullet) => <Bullet key={bullet.id} text={bullet.text} theme={theme} />),
  ];
}

function entryListBlocks(entries: readonly PdfEntry[], theme: TemplateTheme): ReactElement[] {
  return entries.flatMap((entry, index) => entryBlocks(entry, index === 0, theme));
}

// Page-break units of a section, in reading order.
function sectionBlocks(section: PdfSection, theme: TemplateTheme): ReactElement[] {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <Line key={index} style={index > 0 ? styles.paragraph : undefined}>
          {paragraph}
        </Line>
      ));
    case "skills":
      return section.lines.map((line, index) => (
        <Line key={line.id} style={index > 0 ? styles.skillLine : undefined}>
          {line.label ? <Text style={styles.skillLabel}>{`${line.label}: `}</Text> : null}
          <Text style={styles.skillItems}>{line.items}</Text>
        </Line>
      ));
    default:
      return entryListBlocks(section.entries, theme);
  }
}

function extraBlocks(section: PdfExtraSection, theme: TemplateTheme): ReactElement[] {
  if (section.list) return [<Line key="list">{section.list}</Line>];
  return entryListBlocks(section.entries, theme);
}

function SectionTitle({ title, theme }: { title: string; theme: TemplateTheme }) {
  const { styles } = theme;
  if (theme.headingRule === "after") {
    return (
      <View style={styles.sectionTitleRow}>
        <Line style={styles.sectionTitle}>{title}</Line>
        <View style={styles.sectionTitleRule} />
      </View>
    );
  }
  return <Line style={styles.sectionTitle}>{title}</Line>;
}

function Section({
  title,
  blocks,
  theme,
}: {
  title: string;
  blocks: ReactElement[];
  theme: TemplateTheme;
}) {
  const [first, ...rest] = blocks;
  return (
    <>
      {/* The heading moves to the next page with the start of its content, never alone. */}
      <View wrap={false} style={theme.styles.section}>
        <SectionTitle title={title} theme={theme} />
        {first}
      </View>
      {rest}
    </>
  );
}

export function ResumeDocument({ resume, pageSize = "LETTER", theme }: ResumeDocumentProps) {
  const model = buildPdfModel(resume);
  return (
    <Document
      title={model.meta.title}
      author={model.meta.author || undefined}
      subject={model.meta.subject || undefined}
      creator={BRAND.name}
      language="en"
    >
      <Page size={pageSize} style={theme.styles.page}>
        <Header model={model} theme={theme} />
        {model.sections.map((section) => (
          <Section
            key={section.key}
            title={section.title}
            blocks={sectionBlocks(section, theme)}
            theme={theme}
          />
        ))}
        {(model.extras ?? []).map((section) => (
          <Section
            key={`extra-${section.id}`}
            title={section.title}
            blocks={extraBlocks(section, theme)}
            theme={theme}
          />
        ))}
      </Page>
    </Document>
  );
}
