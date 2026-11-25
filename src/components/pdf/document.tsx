import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { Fragment, type ReactElement, type ReactNode } from "react";
import { BRAND } from "@/config/brand";
import type { PdfLink } from "@/lib/pdf/links";
import {
  buildPdfModel,
  type PdfEntry,
  type PdfExtraSection,
  type PdfModel,
  type PdfSection,
} from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { keepWordsWhole } from "@/lib/pdf/text";
import type { Resume } from "@/lib/resume/schema";
import { withFontFallbacks } from "./fonts";
import {
  bulletMark,
  contactLines,
  entryRows,
  headingRuns,
  headlineLine,
  modelText,
  nameRuns,
  SECTION_KINDS,
  themeText,
  type PlannedRow,
  type Run,
} from "./layout";
import type { EntryKind, PdfStyle, TemplateTheme } from "./theme";

export type ResumeDocumentProps = {
  resume: Resume;
  pageSize?: PdfPageSize;
  theme: TemplateTheme;
};

// Every Text goes through here: react-pdf may hyphenate at a seam between text pieces.
export function Line({ style, children }: { style?: PdfStyle; children: ReactNode }) {
  return (
    <Text style={style} hyphenationCallback={keepWordsWhole}>
      {children}
    </Text>
  );
}

function linkStyle(link: PdfLink, theme: TemplateTheme): PdfStyle {
  const web = link.href !== null && !link.href.startsWith("mailto:");
  return web ? theme.styles.webLink : theme.styles.link;
}

function LinkText({
  link,
  theme,
  style,
}: {
  link: PdfLink;
  theme: TemplateTheme;
  style?: PdfStyle;
}) {
  if (!link.href) return style ? <Text style={style}>{link.text}</Text> : <>{link.text}</>;
  return (
    <Link src={link.href} style={{ ...style, ...linkStyle(link, theme) }}>
      {link.text}
    </Link>
  );
}

function Runs({ runs, theme }: { runs: readonly Run[]; theme: TemplateTheme }) {
  return runs.map((run, index) =>
    run.link ? (
      <LinkText
        key={index}
        link={{ ...run.link, text: run.text }}
        theme={theme}
        style={run.style}
      />
    ) : run.style ? (
      <Text key={index} style={run.style}>
        {run.text}
      </Text>
    ) : (
      <Fragment key={index}>{run.text}</Fragment>
    ),
  );
}

export function Header({ model, theme }: { model: PdfModel; theme: TemplateTheme }) {
  const { styles } = theme;
  const name = nameRuns(model, theme);
  const headline = headlineLine(model, theme);
  return (
    <View style={styles.header}>
      {name.length > 0 ? (
        <Line style={styles.name}>
          <Runs runs={name} theme={theme} />
        </Line>
      ) : null}
      {headline ? <Line style={styles.headline}>{headline}</Line> : null}
      {contactLines(model, theme).map((items, line) => (
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

function Row({ row, theme }: { row: PlannedRow; theme: TemplateTheme }) {
  return (
    <View style={row.box}>
      <Line style={row.text}>
        <Runs runs={row.lead} theme={theme} />
      </Line>
      {row.side ? (
        <Line style={row.side.style}>
          {row.side.link ? <LinkText link={row.side.link} theme={theme} /> : row.side.text}
        </Line>
      ) : null}
    </View>
  );
}

const TEXT_PROPS = [
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "lineHeight",
  "textAlign",
] as const;

// react-pdf doesn't pass a view's text styles to its text, so the glyph copies the box's.
export function glyphStyle(box: PdfStyle): PdfStyle {
  const style: Record<string, unknown> = {};
  for (const key of TEXT_PROPS) if (box[key] !== undefined) style[key] = box[key];
  return style as PdfStyle;
}

export function markStyle(theme: TemplateTheme, shape: "square" | "circle"): PdfStyle {
  const mark = theme.styles.bulletMark;
  const color = typeof mark.color === "string" ? mark.color : "#1a1a1a";
  const size = typeof mark.width === "number" ? mark.width : 3.5;
  return shape === "square"
    ? { ...mark, backgroundColor: color }
    : { ...mark, borderWidth: 0.7, borderColor: color, borderRadius: size / 2 };
}

function Bullet({ children, theme }: { children: ReactNode; theme: TemplateTheme }) {
  const { styles } = theme;
  const mark = bulletMark(theme);
  return (
    <View style={styles.bullet} wrap={false}>
      <View style={styles.bulletGlyph}>
        {mark.kind === "glyph" ? (
          <Line
            style={{
              ...glyphStyle(styles.bulletGlyph),
              position: "relative",
              top: theme.bulletOffset ?? 0,
            }}
          >
            {mark.glyph}
          </Line>
        ) : (
          <View style={markStyle(theme, mark.shape)} />
        )}
      </View>
      <Line style={styles.bulletText}>{children}</Line>
    </View>
  );
}

function entrySpacing(
  entry: PdfEntry,
  isFirst: boolean,
  theme: TemplateTheme,
): PdfStyle | undefined {
  if (isFirst) return undefined;
  return entry.company && !entry.company.first ? theme.styles.role : theme.styles.entry;
}

function entryBlocks(
  entry: PdfEntry,
  kind: EntryKind,
  isFirst: boolean,
  theme: TemplateTheme,
): ReactElement[] {
  const [lead, ...rest] = entry.bullets;
  return [
    <View key={entry.id} wrap={false} style={entrySpacing(entry, isFirst, theme)}>
      {entryRows(entry, kind, theme).map((row) => (
        <Row key={row.key} row={row} theme={theme} />
      ))}
      {entry.note ? <Line style={theme.styles.entryNote}>{entry.note}</Line> : null}
      {lead ? <Bullet theme={theme}>{lead.text}</Bullet> : null}
    </View>,
    ...rest.map((bullet) => (
      <Bullet key={bullet.id} theme={theme}>
        {bullet.text}
      </Bullet>
    )),
  ];
}

function entryListBlocks(
  entries: readonly PdfEntry[],
  kind: EntryKind,
  theme: TemplateTheme,
): ReactElement[] {
  return entries.flatMap((entry, index) => entryBlocks(entry, kind, index === 0, theme));
}

export function spaced(style: PdfStyle, index: number): PdfStyle {
  return index > 0 ? style : { ...style, marginTop: 0 };
}

function sectionBlocks(section: PdfSection, theme: TemplateTheme): ReactElement[] {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <Line key={index} style={spaced(styles.paragraph, index)}>
          {paragraph}
        </Line>
      ));
    case "skills":
      return section.lines.map((line, index) => {
        const content = (
          <>
            {line.label ? <Text style={styles.skillLabel}>{`${line.label}: `}</Text> : null}
            <Text style={styles.skillItems}>{line.items}</Text>
          </>
        );
        return theme.skills === "bullets" ? (
          <Bullet key={line.id} theme={theme}>
            {content}
          </Bullet>
        ) : (
          <Line key={line.id} style={spaced(styles.skillLine, index)}>
            {content}
          </Line>
        );
      });
    default:
      return entryListBlocks(section.entries, SECTION_KINDS[section.key], theme);
  }
}

function extraBlocks(section: PdfExtraSection, theme: TemplateTheme): ReactElement[] {
  if (section.list) {
    return [
      <Line key="list" style={spaced(theme.styles.paragraph, 0)}>
        {section.list}
      </Line>,
    ];
  }
  return entryListBlocks(section.entries, "item", theme);
}

function SectionTitle({ title, theme }: { title: string; theme: TemplateTheme }) {
  const { styles } = theme;
  const text = (
    <Line style={styles.sectionTitle}>
      <Runs runs={headingRuns(title, theme)} theme={theme} />
    </Line>
  );
  switch (theme.headingRule) {
    case "after":
      return (
        <View style={styles.sectionTitleRow}>
          {text}
          <View style={styles.sectionTitleRule} />
        </View>
      );
    case "below":
      return (
        <View>
          {text}
          <View style={styles.sectionTitleRule} />
        </View>
      );
    case "above":
      return (
        <View>
          <View style={styles.sectionTitleRule} />
          {text}
        </View>
      );
    default:
      return text;
  }
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
      <View wrap={false} style={theme.styles.section}>
        <SectionTitle title={title} theme={theme} />
        {first}
      </View>
      {rest}
    </>
  );
}

export function ResumeDocument({ resume, pageSize = "LETTER", theme: base }: ResumeDocumentProps) {
  const model = buildPdfModel(resume);
  const theme = withFontFallbacks(base, modelText(model) + themeText(base));
  return (
    <Document
      title={model.meta.title}
      author={model.meta.author || undefined}
      subject={model.meta.subject || undefined}
      creator={BRAND.name}
      language={model.lang ?? "en"}
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
