import { Fragment, memo, type CSSProperties, type ReactNode } from "react";
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
import { cssFontCaps, cssFontFamily } from "@/lib/pdf/fonts";
import type { PdfLink } from "@/lib/pdf/links";
import {
  buildPdfModel,
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

export function pdfStyleToCss(style: PdfStyle | undefined): CSSProperties {
  if (!style) return {};
  const {
    paddingHorizontal,
    paddingVertical,
    marginHorizontal,
    marginVertical,
    fontFamily,
    fontFeatureSettings,
    ...rest
  } = style as PdfStyle & Record<string, unknown>;
  const css: Record<string, unknown> = { ...rest };
  if (paddingHorizontal !== undefined) css.paddingLeft = css.paddingRight = paddingHorizontal;
  if (paddingVertical !== undefined) css.paddingTop = css.paddingBottom = paddingVertical;
  if (marginHorizontal !== undefined) css.marginLeft = css.marginRight = marginHorizontal;
  if (marginVertical !== undefined) css.marginTop = css.marginBottom = marginVertical;
  if (fontFamily !== undefined) css.fontFamily = cssFontFamily(fontFamily);
  const caps = cssFontCaps(fontFeatureSettings);
  if (caps) css.fontVariantCaps = caps;
  for (const side of ["Top", "Bottom"] as const) {
    if (
      typeof css[`border${side}Width`] === "number" &&
      (css[`border${side}Width`] as number) > 0
    ) {
      css[`border${side}Style`] = "solid";
    }
  }
  if (typeof css.borderWidth === "number" && css.borderWidth > 0) css.borderStyle = "solid";
  return css as CSSProperties;
}

type Styled = { theme: TemplateTheme };

function LinkText({ link, theme, style }: Styled & { link: PdfLink; style?: PdfStyle }) {
  const web = link.href !== null && !link.href.startsWith("mailto:");
  const own = link.href ? (web ? theme.styles.webLink : theme.styles.link) : undefined;
  return <span style={pdfStyleToCss({ ...style, ...own })}>{link.text}</span>;
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
    ) : (
      <span key={index} style={pdfStyleToCss(run.style)}>
        {run.text}
      </span>
    ),
  );
}

function Header({ model, theme }: Styled & { model: PdfModel }) {
  const { styles } = theme;
  const name = nameRuns(model, theme);
  const headline = headlineLine(model, theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", ...pdfStyleToCss(styles.header) }}>
      {name.length > 0 ? (
        <p style={pdfStyleToCss(styles.name)}>
          <Runs runs={name} theme={theme} />
        </p>
      ) : null}
      {headline ? <p style={pdfStyleToCss(styles.headline)}>{headline}</p> : null}
      {contactLines(model, theme).map((items, line) => (
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

function Row({ row, theme }: Styled & { row: PlannedRow }) {
  return (
    <div style={{ display: "flex", ...pdfStyleToCss(row.box) }}>
      <p style={pdfStyleToCss(row.text)}>
        <Runs runs={row.lead} theme={theme} />
      </p>
      {row.side ? (
        <p style={pdfStyleToCss(row.side.style)}>
          {row.side.link ? <LinkText link={row.side.link} theme={theme} /> : row.side.text}
        </p>
      ) : null}
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

function Entries({
  entries,
  kind,
  theme,
}: Styled & { entries: readonly PdfEntry[]; kind: EntryKind }) {
  return entries.map((entry, index) => (
    <div key={entry.id} style={entrySpacing(entry, index, theme)}>
      {entryRows(entry, kind, theme).map((row) => (
        <Row key={row.key} row={row} theme={theme} />
      ))}
      {entry.note ? <p style={pdfStyleToCss(theme.styles.entryNote)}>{entry.note}</p> : null}
      {entry.bullets.map((bullet) => (
        <Bullet key={bullet.id} theme={theme}>
          {bullet.text}
        </Bullet>
      ))}
    </div>
  ));
}

function Bullet({ children, theme }: Styled & { children: ReactNode }) {
  const { styles } = theme;
  const mark = bulletMark(theme);
  const markColor =
    typeof styles.bulletMark.color === "string" ? styles.bulletMark.color : undefined;
  return (
    <div style={{ display: "flex", ...pdfStyleToCss(styles.bullet) }}>
      <span style={{ flexShrink: 0, ...pdfStyleToCss(styles.bulletGlyph) }}>
        {mark.kind === "glyph" ? (
          mark.glyph
        ) : (
          <span
            style={{
              display: "block",
              ...pdfStyleToCss(styles.bulletMark),
              ...(mark.shape === "square"
                ? { backgroundColor: markColor }
                : { border: `0.7px solid ${markColor}`, borderRadius: "50%" }),
            }}
          />
        )}
      </span>
      <p style={pdfStyleToCss(styles.bulletText)}>{children}</p>
    </div>
  );
}

const spaced = (style: PdfStyle, index: number) =>
  pdfStyleToCss(index > 0 ? style : { ...style, marginTop: 0 });

function SectionBody({ section, theme }: Styled & { section: PdfSection }): ReactNode {
  const { styles } = theme;
  switch (section.key) {
    case "summary":
      return section.paragraphs.map((paragraph, index) => (
        <p key={index} style={spaced(styles.paragraph, index)}>
          {paragraph}
        </p>
      ));
    case "skills":
      return section.lines.map((line, index) => {
        const content = (
          <>
            {line.label ? (
              <span style={pdfStyleToCss(styles.skillLabel)}>{`${line.label}: `}</span>
            ) : null}
            <span style={pdfStyleToCss(styles.skillItems)}>{line.items}</span>
          </>
        );
        return theme.skills === "bullets" ? (
          <Bullet key={line.id} theme={theme}>
            {content}
          </Bullet>
        ) : (
          <p key={line.id} style={spaced(styles.skillLine, index)}>
            {content}
          </p>
        );
      });
    default:
      return <Entries entries={section.entries} kind={SECTION_KINDS[section.key]} theme={theme} />;
  }
}

function ExtraBody({ section, theme }: Styled & { section: PdfExtraSection }): ReactNode {
  if (section.list !== null) return <p style={spaced(theme.styles.paragraph, 0)}>{section.list}</p>;
  return <Entries entries={section.entries} kind="item" theme={theme} />;
}

function SectionTitle({ title, theme }: Styled & { title: string }) {
  const { styles } = theme;
  const text = (
    <p style={pdfStyleToCss(styles.sectionTitle)}>
      <Runs runs={headingRuns(title, theme)} theme={theme} />
    </p>
  );
  const rule = <div style={pdfStyleToCss(styles.sectionTitleRule)} />;
  switch (theme.headingRule) {
    case "after":
      return (
        <div style={{ display: "flex", ...pdfStyleToCss(styles.sectionTitleRow) }}>
          {text}
          {rule}
        </div>
      );
    case "below":
      return (
        <>
          {text}
          {rule}
        </>
      );
    case "above":
      return (
        <>
          {rule}
          {text}
        </>
      );
    default:
      return text;
  }
}

export type ResumePageProps = {
  resume: Resume;
  template?: TemplateId;
  standIn?: boolean;
  className?: string;
};

export function ownPage(resume: Resume): { model: PdfModel; blank: boolean } {
  const model = buildPdfModel(visibleResume(resume));
  const blank =
    !model.name && !model.headline && model.sections.length === 0 && !model.extras?.length;
  return { model, blank };
}

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
          <PageContent model={model} theme={theme} />
        </div>
      )}
    </div>
  );
});

// The page's flow (header, then one block per section); the studio's live preview pages it.
export function PageContent({ model, theme }: Styled & { model: PdfModel }) {
  return (
    <>
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
    </>
  );
}

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
