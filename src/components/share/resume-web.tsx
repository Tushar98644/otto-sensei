import {
  Fragment,
  createElement,
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  bulletMark,
  contactLines,
  entryRows,
  headingRuns,
  headlineLine,
  nameRuns,
  SECTION_KINDS,
  type PlannedRow,
  type Run,
} from "@/components/pdf/layout";
import type { EntryKind, PdfStyle, TemplateTheme } from "@/components/pdf/theme";
import { themeFor } from "@/components/pdf/themes";
import type { PdfLink } from "@/lib/pdf/links";
import {
  buildPdfModel,
  type PdfEntry,
  type PdfExtraSection,
  type PdfModel,
  type PdfSection,
} from "@/lib/pdf/model";
import { templateOf } from "@/lib/pdf/templates";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { points, webStyle } from "./web-style";

type Styled = { theme: TemplateTheme };

// The heading level of the name; sections and entries sit one and two levels below it.
type Level = 1 | 3;
type Leveled = { level: Level };
type Heading = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
const heading = (level: number) => `h${level}` as Heading;

function HeadingTag({ level, ...props }: { level: number } & ComponentProps<"h1">) {
  return createElement(heading(level), props);
}

const HEADING: CSSProperties = { fontFamily: "inherit", fontWeight: "inherit" };
const PAGE_SPACING = [
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
];
const ROW: CSSProperties = { display: "flex", flexWrap: "wrap", columnGap: points(12) };
const LEAD: CSSProperties = { flex: "1 1 16rem", minWidth: 0 };
const LINK =
  "underline decoration-border-strong decoration-1 underline-offset-2 hover:decoration-current";

function LinkText({ link, theme, style }: Styled & { link: PdfLink; style?: PdfStyle }) {
  if (!link.href) return <span style={webStyle(style)}>{link.text}</span>;
  const web = !link.href.startsWith("mailto:");
  const own = web ? theme.styles.webLink : theme.styles.link;
  return (
    <a
      href={link.href}
      style={webStyle({ ...style, ...own }, ["textDecoration"])}
      className={LINK}
      {...(web ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
    >
      {link.text}
    </a>
  );
}

function Runs({ runs, theme }: Styled & { runs: readonly Run[] }) {
  return runs.map((run, index) =>
    run.link ? (
      <LinkText
        key={index}
        link={{ ...run.link, text: run.text }}
        theme={theme}
        style={run.style}
      />
    ) : run.style ? (
      <span key={index} style={webStyle(run.style)}>
        {run.text}
      </span>
    ) : (
      <Fragment key={index}>{run.text}</Fragment>
    ),
  );
}

function Header({ model, theme, level }: Styled & Leveled & { model: PdfModel }) {
  const { styles } = theme;
  const name = nameRuns(model, theme);
  const headline = headlineLine(model, theme);
  return (
    <header style={{ display: "flex", flexDirection: "column", ...webStyle(styles.header) }}>
      {name.length > 0 ? (
        <HeadingTag level={level} style={{ ...HEADING, ...webStyle(styles.name) }}>
          <Runs runs={name} theme={theme} />
        </HeadingTag>
      ) : (
        <HeadingTag level={level} className="sr-only">
          Resume
        </HeadingTag>
      )}
      {headline ? <p style={webStyle(styles.headline)}>{headline}</p> : null}
      {contactLines(model, theme).map((items, line) => (
        <p key={line} style={webStyle(line === 0 ? styles.contact : styles.contactNext)}>
          {items.map((item, index) => (
            <Fragment key={`${index}-${item.text}`}>
              {index > 0 ? <span aria-hidden>{theme.contactSeparator}</span> : null}
              <LinkText link={item} theme={theme} />
            </Fragment>
          ))}
        </p>
      ))}
      {theme.headerRule ? <div aria-hidden style={webStyle(styles.headerRule)} /> : null}
    </header>
  );
}

function Row({ row, theme, lead }: Styled & { row: PlannedRow; lead: Heading | "p" }) {
  const Lead = lead;
  return (
    <div style={{ ...ROW, ...webStyle(row.box, ["flexDirection", "justifyContent"]) }}>
      <Lead
        style={{
          ...(lead === "p" ? {} : HEADING),
          ...webStyle(row.text, ["flex", "paddingRight"]),
          ...LEAD,
        }}
      >
        <Runs runs={row.lead} theme={theme} />
      </Lead>
      {row.side ? (
        <p style={webStyle(row.side.style, ["textAlign"])} className="sm:text-right">
          {row.side.link ? <LinkText link={row.side.link} theme={theme} /> : row.side.text}
        </p>
      ) : null}
    </div>
  );
}

function entrySpacing(entry: PdfEntry, index: number, theme: TemplateTheme): CSSProperties {
  if (index === 0) return {};
  return webStyle(entry.company && !entry.company.first ? theme.styles.role : theme.styles.entry);
}

function BulletList({ items, theme }: Styled & { items: { id: string; content: ReactNode }[] }) {
  const { styles } = theme;
  if (items.length === 0) return null;
  const mark = bulletMark(theme);
  const color = typeof styles.bulletMark.color === "string" ? styles.bulletMark.color : undefined;
  return (
    // role="list": Safari drops list semantics once list-style is none.
    <ul role="list">
      {items.map((item) => (
        <li key={item.id} style={{ display: "flex", ...webStyle(styles.bullet) }}>
          <span aria-hidden style={{ flexShrink: 0, ...webStyle(styles.bulletGlyph) }}>
            {mark.kind === "glyph" ? (
              mark.glyph
            ) : (
              <span
                style={{
                  display: "block",
                  ...webStyle(styles.bulletMark),
                  ...(mark.shape === "square"
                    ? { backgroundColor: color }
                    : { border: `1px solid ${color}`, borderRadius: "50%" }),
                }}
              />
            )}
          </span>
          <span style={{ minWidth: 0, ...webStyle(styles.bulletText) }}>{item.content}</span>
        </li>
      ))}
    </ul>
  );
}

function Entries({
  entries,
  kind,
  theme,
  level,
}: Styled & Leveled & { entries: readonly PdfEntry[]; kind: EntryKind }) {
  return entries.map((entry, index) => (
    <div key={entry.id} style={entrySpacing(entry, index, theme)}>
      {entryRows(entry, kind, theme).map((row, at) => (
        <Row
          key={row.key}
          row={row}
          theme={theme}
          lead={
            at > 0 ? "p" : heading(entry.company && !entry.company.first ? level + 3 : level + 2)
          }
        />
      ))}
      {entry.note ? <p style={webStyle(theme.styles.entryNote)}>{entry.note}</p> : null}
      <BulletList
        items={entry.bullets.map((bullet) => ({ id: bullet.id, content: bullet.text }))}
        theme={theme}
      />
    </div>
  ));
}

const spaced = (style: PdfStyle, index: number) =>
  webStyle(index > 0 ? style : { ...style, marginTop: 0 });

function SectionBody({
  section,
  theme,
  level,
}: Styled & Leveled & { section: PdfSection }): ReactNode {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <p key={index} style={spaced(styles.paragraph, index)}>
          {paragraph}
        </p>
      ));
    case "skills": {
      const lines = section.lines.map((line) => ({
        id: line.id,
        content: (
          <>
            {line.label ? (
              <span style={webStyle(styles.skillLabel)}>{`${line.label}: `}</span>
            ) : null}
            <span style={webStyle(styles.skillItems)}>{line.items}</span>
          </>
        ),
      }));
      if (theme.skills === "bullets") return <BulletList items={lines} theme={theme} />;
      return lines.map((line, index) => (
        <p key={line.id} style={spaced(styles.skillLine, index)}>
          {line.content}
        </p>
      ));
    }
    default:
      return (
        <Entries
          entries={section.entries}
          kind={SECTION_KINDS[section.key]}
          theme={theme}
          level={level}
        />
      );
  }
}

function ExtraBody({
  section,
  theme,
  level,
}: Styled & Leveled & { section: PdfExtraSection }): ReactNode {
  if (section.list !== null) return <p style={spaced(theme.styles.paragraph, 0)}>{section.list}</p>;
  return <Entries entries={section.entries} kind="item" theme={theme} level={level} />;
}

type SectionProps = Styled & Leveled & { id: string; title: string; children: ReactNode };

function Section({ id, title, theme, level, children }: SectionProps) {
  const { styles } = theme;
  const titled = (
    <HeadingTag level={level + 1} id={id} style={{ ...HEADING, ...webStyle(styles.sectionTitle) }}>
      <Runs runs={headingRuns(title, theme)} theme={theme} />
    </HeadingTag>
  );
  const rule = <div aria-hidden style={webStyle(styles.sectionTitleRule)} />;
  return (
    <section aria-labelledby={id} style={webStyle(styles.section)}>
      {theme.headingRule === "after" ? (
        <div style={{ display: "flex", ...webStyle(styles.sectionTitleRow) }}>
          {titled}
          {rule}
        </div>
      ) : (
        <>
          {theme.headingRule === "above" ? rule : null}
          {titled}
          {theme.headingRule === "below" ? rule : null}
        </>
      )}
      {children}
    </section>
  );
}

// Every address keeps its text and loses its link.
function unlinked<T>(value: T): T {
  if (Array.isArray(value)) return value.map(unlinked) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, key === "href" ? null : unlinked(item)]),
  ) as T;
}

// headingLevel 3 nests the resume under a page's own h1 and h2; linked false suits made-up addresses.
export type ResumeWebProps = {
  resume: Resume;
  className?: string;
  headingLevel?: Level;
  linked?: boolean;
};

export function ResumeWeb({ resume, className, headingLevel = 1, linked = true }: ResumeWebProps) {
  const theme = themeFor(resume);
  const built = buildPdfModel(resume, { charset: "unicode" });
  const model = linked ? built : unlinked(built);
  return (
    <article
      data-format={templateOf(resume)}
      style={webStyle(theme.styles.page, PAGE_SPACING)}
      className={cn("wrap-anywhere [--pt:1.45px] sm:[--pt:1.6px]", className)}
    >
      <Header model={model} theme={theme} level={headingLevel} />
      {model.sections.map((section) => (
        <Section
          key={section.key}
          id={`section-${section.key}`}
          title={section.title}
          theme={theme}
          level={headingLevel}
        >
          <SectionBody section={section} theme={theme} level={headingLevel} />
        </Section>
      ))}
      {(model.extras ?? []).map((section) => (
        <Section
          key={`extra-${section.id}`}
          id={`section-extra-${section.id}`}
          title={section.title}
          theme={theme}
          level={headingLevel}
        >
          <ExtraBody section={section} theme={theme} level={headingLevel} />
        </Section>
      ))}
    </article>
  );
}
