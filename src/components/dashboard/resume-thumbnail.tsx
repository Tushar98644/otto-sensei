import { Fragment, memo, type CSSProperties, type ReactNode } from "react";
import type { PdfStyle, TemplateTheme } from "@/components/pdf/theme";
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
import { visibleResume } from "@/lib/resume/ops";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { standInPage } from "./stand-in";

// Page 1 of a resume, drawn as a tiny HTML page with the same layout and the same theme numbers
// the PDF uses (src/components/pdf/document.tsx), so each card shows exactly what the PDF prints.
// Decorative art (the home page scenes) passes standIn to draw the sample person in the resume's
// layout instead (stand-in.ts), since those scenes end up in screenshots.
// One PDF point is one CSS pixel on a 612px-wide Letter page, and the page-miniature utility
// scales that down to the card. Importing the themes is cheap: they are plain style objects (with
// the resume's look settings applied, as in the PDF), and react-pdf itself never loads here.

const FONTS: Record<string, string> = {
  Helvetica: "var(--font-page-sans)",
  "Times-Roman": "var(--font-page-serif)",
  Courier: "var(--font-page-mono)",
};

// react-pdf styles are nearly CSS already: numbers are points (pixels here) and lineHeight is a
// multiplier. Only the shorthands react-pdf invents, its font names and border styles differ.
export function pdfStyleToCss(style: PdfStyle | undefined): CSSProperties {
  if (!style) return {};
  const {
    paddingHorizontal,
    paddingVertical,
    marginHorizontal,
    marginVertical,
    fontFamily,
    ...rest
  } = style as PdfStyle & Record<string, unknown>;
  const css: Record<string, unknown> = { ...rest };
  if (paddingHorizontal !== undefined) css.paddingLeft = css.paddingRight = paddingHorizontal;
  if (paddingVertical !== undefined) css.paddingTop = css.paddingBottom = paddingVertical;
  if (marginHorizontal !== undefined) css.marginLeft = css.marginRight = marginHorizontal;
  if (marginVertical !== undefined) css.marginTop = css.marginBottom = marginVertical;
  if (typeof fontFamily === "string") css.fontFamily = FONTS[fontFamily] ?? FONTS.Helvetica;
  if (typeof css.borderBottomWidth === "number" && css.borderBottomWidth > 0) {
    css.borderBottomStyle = "solid";
  }
  return css as CSSProperties;
}

type Styled = { theme: TemplateTheme };

function LinkText({ link, theme }: Styled & { link: PdfLink }) {
  const web = link.href !== null && !link.href.startsWith("mailto:");
  const style = link.href
    ? pdfStyleToCss(web ? theme.styles.webLink : theme.styles.link)
    : undefined;
  return <span style={style}>{link.text}</span>;
}

function Header({ model, theme }: Styled & { model: PdfModel }) {
  const { styles } = theme;
  return (
    <div style={{ display: "flex", flexDirection: "column", ...pdfStyleToCss(styles.header) }}>
      {model.name ? <p style={pdfStyleToCss(styles.name)}>{model.name}</p> : null}
      {model.headline ? <p style={pdfStyleToCss(styles.headline)}>{model.headline}</p> : null}
      {model.contact.map((items, line) => (
        <p key={line} style={pdfStyleToCss(line === 0 ? styles.contact : styles.contactNext)}>
          {items.map((item, index) => (
            <Fragment key={`${index}-${item.text}`}>
              {index > 0 ? theme.contactSeparator : null}
              <LinkText link={item} theme={theme} />
            </Fragment>
          ))}
        </p>
      ))}
      {theme.headerRule ? <div style={pdfStyleToCss(styles.headerRule)} /> : null}
    </div>
  );
}

function Detail({ detail, theme, lead }: Styled & { detail: PdfLink | null; lead: boolean }) {
  if (!detail) return null;
  return (
    <span style={pdfStyleToCss(theme.styles.entryDetail)}>
      {lead ? " · " : null}
      <LinkText link={detail} theme={theme} />
    </span>
  );
}

function EntryHeader({ entry, theme }: Styled & { entry: PdfEntry }) {
  const { styles } = theme;
  if (!entry.title && !entry.org && !entry.detail && !entry.dates) return null;
  const row = { display: "flex", ...pdfStyleToCss(styles.entryHeader) };
  const dates = entry.dates ? <p style={pdfStyleToCss(styles.dates)}>{entry.dates}</p> : null;
  if (theme.entryLayout === "stacked") {
    const subline = Boolean(entry.org);
    return (
      <div>
        <div style={row}>
          <p style={pdfStyleToCss(styles.entryLead)}>
            {entry.title ? (
              <span style={pdfStyleToCss(styles.entryTitle)}>{entry.title}</span>
            ) : null}
            {subline ? null : (
              <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
            )}
          </p>
          {dates}
        </div>
        {subline ? (
          <p style={pdfStyleToCss(styles.entrySub)}>
            <span style={pdfStyleToCss(styles.entryOrg)}>{entry.org}</span>
            <Detail detail={entry.detail} theme={theme} lead />
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div style={row}>
      <p style={pdfStyleToCss(styles.entryLead)}>
        {entry.title ? (
          <span style={pdfStyleToCss(styles.entryTitle)}>
            {entry.org ? `${entry.title},` : entry.title}
          </span>
        ) : null}
        {entry.org ? <span style={pdfStyleToCss(styles.entryOrg)}>{` ${entry.org}`}</span> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title || entry.org)} />
      </p>
      {dates}
    </div>
  );
}

// Roles at one company, as the PDF prints them: the company once, then each role with its dates.
function CompanyHeader({ company, theme }: Styled & { company: PdfCompany }) {
  const { styles } = theme;
  return (
    <div style={{ display: "flex", ...pdfStyleToCss(styles.entryHeader) }}>
      <p style={pdfStyleToCss(styles.entryLead)}>
        <span style={pdfStyleToCss(styles.entryTitle)}>{company.name}</span>
        <Detail detail={company.detail} theme={theme} lead />
      </p>
    </div>
  );
}

function RoleHeader({ entry, theme }: Styled & { entry: PdfEntry }) {
  const { styles } = theme;
  if (!entry.title && !entry.detail && !entry.dates) return null;
  return (
    <div style={{ display: "flex", ...pdfStyleToCss(styles.entryHeader) }}>
      <p style={pdfStyleToCss(styles.entryLead)}>
        {entry.title ? <span style={pdfStyleToCss(styles.roleTitle)}>{entry.title}</span> : null}
        <Detail detail={entry.detail} theme={theme} lead={Boolean(entry.title)} />
      </p>
      {entry.dates ? <p style={pdfStyleToCss(styles.dates)}>{entry.dates}</p> : null}
    </div>
  );
}

function entrySpacing(
  entry: PdfEntry,
  index: number,
  theme: TemplateTheme,
): CSSProperties | undefined {
  if (index === 0) return undefined;
  return pdfStyleToCss(
    entry.company && !entry.company.first ? theme.styles.role : theme.styles.entry,
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
      {entry.note ? <p style={pdfStyleToCss(theme.styles.entryNote)}>{entry.note}</p> : null}
      {entry.bullets.map((bullet) => (
        <Bullet key={bullet.id} text={bullet.text} theme={theme} />
      ))}
    </div>
  ));
}

function Bullet({ text, theme }: Styled & { text: string }) {
  const { styles } = theme;
  return (
    <div style={{ display: "flex", ...pdfStyleToCss(styles.bullet) }}>
      <span style={{ flexShrink: 0, ...pdfStyleToCss(styles.bulletGlyph) }}>
        {theme.bulletGlyph}
      </span>
      <p style={pdfStyleToCss(styles.bulletText)}>{text}</p>
    </div>
  );
}

function SectionBody({ section, theme }: Styled & { section: PdfSection }): ReactNode {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <p key={index} style={index > 0 ? pdfStyleToCss(styles.paragraph) : undefined}>
          {paragraph}
        </p>
      ));
    case "skills":
      return section.lines.map((line, index) => (
        <p key={line.id} style={index > 0 ? pdfStyleToCss(styles.skillLine) : undefined}>
          {line.label ? (
            <span style={pdfStyleToCss(styles.skillLabel)}>{`${line.label}: `}</span>
          ) : null}
          <span style={pdfStyleToCss(styles.skillItems)}>{line.items}</span>
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

function SectionTitle({ title, theme }: Styled & { title: string }) {
  const { styles } = theme;
  if (theme.headingRule === "after") {
    return (
      <div style={{ display: "flex", ...pdfStyleToCss(styles.sectionTitleRow) }}>
        <p style={pdfStyleToCss(styles.sectionTitle)}>{title}</p>
        <div style={pdfStyleToCss(styles.sectionTitleRule)} />
      </div>
    );
  }
  return <p style={pdfStyleToCss(styles.sectionTitle)}>{title}</p>;
}

export type ResumePageProps = {
  resume: Resume;
  // Draw it in another format than the resume's own, e.g. to compare formats side by side.
  template?: TemplateId;
  // The sample person's words in this resume's layout, for decorative art.
  standIn?: boolean;
  className?: string;
};

/** Page 1 as the PDF prints it: hidden items left out, the person's own words. */
export function ownPage(resume: Resume): { model: PdfModel; blank: boolean } {
  const model = buildPdfModel(visibleResume(resume));
  const blank =
    !model.name && !model.headline && model.sections.length === 0 && !model.extras?.length;
  return { model, blank };
}

// Decorative: the card around it names the resume, so screen readers skip the miniature.
export const ResumeThumbnail = memo(function ResumeThumbnail({
  resume,
  template,
  standIn = false,
  className,
}: ResumePageProps) {
  const theme = themeFor(resume, template);
  const { model, blank } = standIn ? standInPage(resume) : ownPage(resume);

  return (
    <div
      aria-hidden
      data-format={template ?? templateOf(resume)}
      className={cn(
        "@container relative aspect-17/22 w-full overflow-hidden bg-surface text-left select-none",
        className,
      )}
    >
      {blank ? (
        <BlankPage />
      ) : (
        <div
          className="absolute top-0 left-0 page-miniature overflow-hidden"
          style={{ ...pdfStyleToCss(theme.styles.page), overflowWrap: "break-word" }}
        >
          <Header model={model} theme={theme} />
          {model.sections.map((section) => (
            <div key={section.key} style={pdfStyleToCss(theme.styles.section)}>
              <SectionTitle title={section.title} theme={theme} />
              <SectionBody section={section} theme={theme} />
            </div>
          ))}
          {(model.extras ?? []).map((section) => (
            <div key={`extra-${section.id}`} style={pdfStyleToCss(theme.styles.section)}>
              <SectionTitle title={section.title} theme={theme} />
              <ExtraBody section={section} theme={theme} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// A resume started from scratch has nothing to draw yet: faint bars where the name, contact line
// and the first sections will go, so the card reads as a fresh page rather than a missing image.
// Sized in page pixels, like the real miniature, so it scales the same way.
function BlankPage() {
  return (
    <div className="absolute top-0 left-0 flex page-miniature flex-col gap-3 px-12 py-11">
      <div className="h-6 w-56 rounded-sm bg-surface-strong" />
      <div className="h-3 w-80 rounded-sm bg-surface-muted" />
      {[0, 1, 2].map((block) => (
        <div key={block} className="mt-8 flex flex-col gap-3">
          <div className="h-3.5 w-28 rounded-sm bg-surface-strong" />
          <div className="h-2.5 w-full rounded-sm bg-surface-muted" />
          <div className="h-2.5 w-11/12 rounded-sm bg-surface-muted" />
          <div className="h-2.5 w-4/5 rounded-sm bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
