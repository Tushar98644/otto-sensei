import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { TemplateTheme } from "@/components/pdf/theme";
import { themeFor } from "@/components/pdf/themes";
import type { PdfLink } from "@/lib/pdf/links";
import {
  buildPdfModel,
  type PdfCompany,
  type PdfEntry,
  type PdfExtraSection,
  type PdfModel,
  type PdfSection,
} from "@/lib/pdf/model";
import { templateOf } from "@/lib/pdf/templates";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { points, webStyle } from "./web-style";

// The resume as a web page: the PDF's own model (buildPdfModel) in its format's theme, with real
// headings, lists and links. Same order and words as the PDF, one column, reflowing to the screen.
// No hooks and no browser APIs, so it renders on the server.

type Styled = { theme: TemplateTheme };

// The base layer gives h1/h2 the app's serif and h3 Inter; a resume heading takes its format's type.
const HEADING: CSSProperties = { fontFamily: "inherit", fontWeight: "normal" };
// The page sets its own margins per screen; only the format's type carries over.
const PAGE_SPACING = [
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
];
// Rows wrap on a phone, so the dates drop under a long title instead of squeezing it.
const ROW: CSSProperties = { display: "flex", flexWrap: "wrap", columnGap: points(12) };
const LEAD: CSSProperties = { flex: "1 1 16rem", minWidth: 0 };
const LINK =
  "underline decoration-border-strong decoration-1 underline-offset-2 hover:decoration-current";

function LinkText({ link, theme }: Styled & { link: PdfLink }) {
  if (!link.href) return <span>{link.text}</span>;
  const web = !link.href.startsWith("mailto:");
  // The PDF draws its links without underlines; on a screen they need one to look clickable.
  const style = webStyle(web ? theme.styles.webLink : theme.styles.link, ["textDecoration"]);
  return (
    <a
      href={link.href}
      style={style}
      className={LINK}
      {...(web ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
    >
      {link.text}
    </a>
  );
}

function Header({ model, theme }: Styled & { model: PdfModel }) {
  const { styles } = theme;
  return (
    <header style={{ display: "flex", flexDirection: "column", ...webStyle(styles.header) }}>
      {model.name ? (
        <h1 style={{ ...HEADING, ...webStyle(styles.name) }}>{model.name}</h1>
      ) : (
        <h1 className="sr-only">Resume</h1>
      )}
      {model.headline ? <p style={webStyle(styles.headline)}>{model.headline}</p> : null}
      {model.contact.map((items, line) => (
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

function Detail({ detail, theme, lead }: Styled & { detail: PdfLink | null; lead: boolean }) {
  if (!detail) return null;
  return (
    <span style={webStyle(theme.styles.entryDetail)}>
      {lead ? " · " : null}
      <LinkText link={detail} theme={theme} />
    </span>
  );
}

function Dates({ dates, theme }: Styled & { dates: string }) {
  if (!dates) return null;
  // Right-aligned beside the title; under it, on a phone, it starts at the left like the text.
  return (
    <p style={webStyle(theme.styles.dates, ["textAlign"])} className="sm:text-right">
      {dates}
    </p>
  );
}

function leadStyle(theme: TemplateTheme): CSSProperties {
  return { ...HEADING, ...webStyle(theme.styles.entryLead, ["flex", "paddingRight"]), ...LEAD };
}

function EntryHeader({ entry, theme }: Styled & { entry: PdfEntry }) {
  const { styles } = theme;
  if (!entry.title && !entry.org && !entry.detail && !entry.dates) return null;
  const row = { ...ROW, ...webStyle(styles.entryHeader) };
  if (theme.entryLayout === "stacked") {
    const subline = Boolean(entry.org);
    return (
      <div>
        <div style={row}>
          <h3 style={leadStyle(theme)}>
            {entry.title ? <span style={webStyle(styles.entryTitle)}>{entry.title}</span> : null}
            {subline ? null : (
              <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
            )}
          </h3>
          <Dates dates={entry.dates} theme={theme} />
        </div>
        {subline ? (
          <p style={webStyle(styles.entrySub)}>
            <span style={webStyle(styles.entryOrg)}>{entry.org}</span>
            <Detail detail={entry.detail} theme={theme} lead />
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div style={row}>
      <h3 style={leadStyle(theme)}>
        {entry.title ? (
          <span style={webStyle(styles.entryTitle)}>
            {entry.org ? `${entry.title},` : entry.title}
          </span>
        ) : null}
        {entry.org ? <span style={webStyle(styles.entryOrg)}>{` ${entry.org}`}</span> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title || entry.org)} />
      </h3>
      <Dates dates={entry.dates} theme={theme} />
    </div>
  );
}

// Roles at one company, as the PDF prints them: the company once, then each role with its dates.
function CompanyHeader({ company, theme }: Styled & { company: PdfCompany }) {
  const { styles } = theme;
  return (
    <div style={{ ...ROW, ...webStyle(styles.entryHeader) }}>
      <h3 style={leadStyle(theme)}>
        <span style={webStyle(styles.entryTitle)}>{company.name}</span>
        <Detail detail={company.detail} theme={theme} lead />
      </h3>
    </div>
  );
}

function RoleHeader({ entry, theme }: Styled & { entry: PdfEntry }) {
  const { styles } = theme;
  if (!entry.title && !entry.detail && !entry.dates) return null;
  return (
    <div style={{ ...ROW, ...webStyle(styles.entryHeader) }}>
      <h4 style={leadStyle(theme)}>
        {entry.title ? <span style={webStyle(styles.roleTitle)}>{entry.title}</span> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
      </h4>
      <Dates dates={entry.dates} theme={theme} />
    </div>
  );
}

function entrySpacing(entry: PdfEntry, index: number, theme: TemplateTheme): CSSProperties {
  if (index === 0) return {};
  return webStyle(entry.company && !entry.company.first ? theme.styles.role : theme.styles.entry);
}

function Bullets({ bullets, theme }: Styled & { bullets: PdfEntry["bullets"] }) {
  const { styles } = theme;
  if (bullets.length === 0) return null;
  return (
    // role="list": Safari drops list semantics once list-style is none.
    <ul role="list">
      {bullets.map((bullet) => (
        <li key={bullet.id} style={{ display: "flex", ...webStyle(styles.bullet) }}>
          <span aria-hidden style={{ flexShrink: 0, ...webStyle(styles.bulletGlyph) }}>
            {theme.bulletGlyph}
          </span>
          <span style={{ minWidth: 0, ...webStyle(styles.bulletText) }}>{bullet.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Entries({ entries, theme }: Styled & { entries: readonly PdfEntry[] }) {
  return entries.map((entry, index) => (
    <div key={entry.id} style={entrySpacing(entry, index, theme)}>
      {entry.company?.first ? <CompanyHeader company={entry.company} theme={theme} /> : null}
      {entry.company ? (
        <RoleHeader entry={entry} theme={theme} />
      ) : (
        <EntryHeader entry={entry} theme={theme} />
      )}
      {entry.note ? <p style={webStyle(theme.styles.entryNote)}>{entry.note}</p> : null}
      <Bullets bullets={entry.bullets} theme={theme} />
    </div>
  ));
}

function SectionBody({ section, theme }: Styled & { section: PdfSection }): ReactNode {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <p key={index} style={index > 0 ? webStyle(styles.paragraph) : undefined}>
          {paragraph}
        </p>
      ));
    case "skills":
      return section.lines.map((line, index) => (
        <p key={line.id} style={index > 0 ? webStyle(styles.skillLine) : undefined}>
          {line.label ? <span style={webStyle(styles.skillLabel)}>{`${line.label}: `}</span> : null}
          <span style={webStyle(styles.skillItems)}>{line.items}</span>
        </p>
      ));
    default:
      return <Entries entries={section.entries} theme={theme} />;
  }
}

function ExtraBody({ section, theme }: Styled & { section: PdfExtraSection }): ReactNode {
  if (section.list !== null) return <p>{section.list}</p>;
  return <Entries entries={section.entries} theme={theme} />;
}

type SectionProps = Styled & { id: string; title: string; children: ReactNode };

function Section({ id, title, theme, children }: SectionProps) {
  const { styles } = theme;
  const heading = (
    <h2 id={id} style={{ ...HEADING, ...webStyle(styles.sectionTitle) }}>
      {title}
    </h2>
  );
  return (
    <section aria-labelledby={id} style={webStyle(styles.section)}>
      {theme.headingRule === "after" ? (
        <div style={{ display: "flex", ...webStyle(styles.sectionTitleRow) }}>
          {heading}
          <div aria-hidden style={webStyle(styles.sectionTitleRule)} />
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

export type ResumeWebProps = { resume: Resume; className?: string };

export function ResumeWeb({ resume, className }: ResumeWebProps) {
  const theme = themeFor(resume);
  // Every character, as the Word file keeps them: a screen has the fonts the PDF lacks.
  const model = buildPdfModel(resume, { charset: "unicode" });
  return (
    <article
      data-format={templateOf(resume)}
      style={webStyle(theme.styles.page, PAGE_SPACING)}
      className={cn("wrap-anywhere [--pt:1.45px] sm:[--pt:1.6px]", className)}
    >
      <Header model={model} theme={theme} />
      {model.sections.map((section) => (
        <Section
          key={section.key}
          id={`section-${section.key}`}
          title={section.title}
          theme={theme}
        >
          <SectionBody section={section} theme={theme} />
        </Section>
      ))}
      {(model.extras ?? []).map((section) => (
        <Section
          key={`extra-${section.id}`}
          id={`section-extra-${section.id}`}
          title={section.title}
          theme={theme}
        >
          <ExtraBody section={section} theme={theme} />
        </Section>
      ))}
    </article>
  );
}
