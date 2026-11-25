import type { CSSProperties } from "react";
import { fmt } from "@/i18n/format";
import type { ContentProject } from "@/lib/portfolio/content";
import { contactHref, featuredFirst, Marked, nameOf, OutLink, TemplateStyle } from "../parts";
import type { DesignWords, PortfolioTemplateProps } from "../types";
import {
  deviceOf,
  detailId,
  indexText,
  introLabel,
  projectTarget,
  SUMMARIES_MAX,
  titleScale,
} from "./data";
import type { ReelNavLink, ReelSocial } from "./navbar";
import {
  ExtraSection,
  Intro,
  Navbar,
  Profile,
  ProjectSummary,
  ReelRoot,
  RevealFrame,
} from "./on-demand";
import { DrawnScreen, type DrawnContent } from "./screen";
import { ReelSprites } from "./sprites";
import { REEL_CSS, REEL_NOSCRIPT_CSS } from "./styles";
import { Button } from "./ui";

// Ported from HamishMW/portfolio (MIT, see ./LICENSE.txt).

type Words = DesignWords["reel"];

const SOCIALS_MAX = 4;

const hostOf = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function drawnOf(project: ContentProject): DrawnContent {
  const facts = project.outcome
    ? project.outcome
        .split("·")
        .map((fact) => fact.trim())
        .filter(Boolean)
    : project.tech;
  return {
    name: project.name,
    line: project.line || project.description,
    host: project.website ? hostOf(project.website.href) : "",
    facts,
  };
}

export function ReelTemplate({ view, content, words, footer, resumeHref }: PortfolioTemplateProps) {
  const t = words.reel;
  const name = nameOf(view, words.shared.untitled);
  const disciplines =
    content.disciplines.length > 0 ? content.disciplines : view.headline ? [view.headline] : [];
  const role = disciplines[0] ?? t.role;
  const rotating = disciplines.slice(1);
  const projects = featuredFirst(content.projects);
  const summaries = projects.slice(0, SUMMARIES_MAX);
  const more = projects.slice(SUMMARIES_MAX);
  const socials: ReelSocial[] = content.socials
    .filter((social) => social.kind !== "email")
    .slice(0, SOCIALS_MAX)
    .map(({ label, href, kind }) => ({ label, href, kind }));
  const hello = contactHref(content);
  const about =
    content.aboutParts.length > 0
      ? content.aboutParts
      : content.pitch
        ? [[{ text: content.pitch, mark: false }]]
        : [];
  const roles = content.experience;
  const firstProject = summaries.length > 0 ? "#pf-reel-project-1" : null;
  const year = new Date().getUTCFullYear();

  const links: ReelNavLink[] = [
    firstProject ? { label: t.nav.projects, href: firstProject } : null,
    about.length > 0 ? { label: t.nav.details, href: "#pf-reel-details" } : null,
    roles.length > 0 ? { label: t.nav.experience, href: "#pf-reel-experience" } : null,
    resumeHref ? { label: t.nav.resume, href: resumeHref } : null,
    hello ? { label: t.nav.contact, href: hello } : null,
  ].filter((link) => link !== null);

  const pages = projects.filter((project) => projectTarget(project, t.view)?.href.startsWith("#"));

  return (
    <ReelRoot>
      <TemplateStyle css={REEL_CSS} />
      <noscript dangerouslySetInnerHTML={{ __html: `<style>${REEL_NOSCRIPT_CSS}</style>` }} />
      <ReelSprites />
      <div className="shell">
        <Navbar
          labels={{ home: fmt(t.home, { name }), menu: t.menu, theme: t.theme }}
          initials={content.initials || name.charAt(0)}
          home="#pf-reel-intro"
          links={links}
          socials={socials}
        />
        <div className="home">
          <Intro
            id="pf-reel-intro"
            name={name}
            role={role}
            disciplines={rotating}
            label={introLabel(role, rotating, t.and)}
            titleScale={titleScale(role, rotating)}
            scrollTarget={firstProject}
            scrollLabel={t.scroll}
          />

          {summaries.map((project, index) => (
            <ProjectSummary
              key={project.id}
              id={`pf-reel-project-${index + 1}`}
              index={index + 1}
              title={project.name}
              description={project.line || project.description}
              button={projectTarget(project, t.view)}
              alternate={index % 2 === 1}
              device={deviceOf(project)}
              drawn={drawnOf(project)}
              alt={fmt(t.drawn[deviceOf(project)], { name: project.name })}
              loading={t.loading}
            />
          ))}

          {more.length > 0 ? (
            <ExtraSection id="pf-reel-more" title={t.more}>
              <table className="extra-table">
                <tbody>
                  {more.map((project, index) => {
                    const target = projectTarget(project, t.view);
                    return (
                      <tr key={project.id} className="extra-row">
                        <td className="extra-cell" data-kind="index">
                          {indexText(SUMMARIES_MAX + index + 1)}
                        </td>
                        <td className="extra-cell">
                          {target ? (
                            <OutLink href={target.href} className="extra-name link">
                              {project.name}
                            </OutLink>
                          ) : (
                            <span className="extra-name">{project.name}</span>
                          )}
                          {project.line ? (
                            <span className="text" data-size="s">
                              {project.line}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ExtraSection>
          ) : null}

          {about.length > 0 ? (
            <Profile
              id="pf-reel-details"
              paragraphs={about.map((parts, index) => (
                <Marked key={index} parts={parts} mark="span" className="mark" />
              ))}
              contact={hello}
              initials={content.initials || name.charAt(0)}
              caption={content.location?.city || view.headline}
              words={{ hello: t.hello, message: t.message, about: t.aboutMe }}
            />
          ) : null}

          {roles.length > 0 ? (
            <ExtraSection id="pf-reel-experience" title={t.experience}>
              <table className="extra-table">
                <tbody>
                  {roles.map((job) => (
                    <tr key={job.id} className="extra-row">
                      <td className="extra-cell">
                        <span className="extra-name">{job.title || job.company}</span>
                        {job.title && job.company ? (
                          <span className="text" data-size="s" data-secondary>
                            {job.website ? (
                              <OutLink href={job.website.href} className="link">
                                {job.company}
                              </OutLink>
                            ) : (
                              job.company
                            )}
                            {job.location ? ` · ${job.location}` : ""}
                          </span>
                        ) : null}
                        {job.summary ? (
                          <span className="text" data-size="s">
                            {job.summary}
                          </span>
                        ) : null}
                      </td>
                      {job.dates ? (
                        <td className="extra-cell" data-kind="date">
                          <span className="text" data-size="s" data-secondary>
                            {job.dates}
                          </span>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ExtraSection>
          ) : null}

          <footer className="footer">
            <div className="text" data-size="s" data-align="center">
              <span className="footer-date">{`© ${year} ${name}.`}</span>
            </div>
            {footer ? <div className="credit">{footer}</div> : null}
          </footer>
        </div>

        {pages.map((project) => (
          <ProjectPage
            key={project.id}
            project={project}
            back={firstProject ?? "#pf-reel-intro"}
            t={t}
          />
        ))}
      </div>
    </ReelRoot>
  );
}

function ProjectPage({ project, back, t }: { project: ContentProject; back: string; t: Words }) {
  const link = project.website ?? project.source;
  const meta = [...project.roles, project.category, project.years].filter(Boolean);
  const paragraphs =
    project.details.length > 0 ? project.details : project.description ? [project.description] : [];
  const id = detailId(project);
  return (
    <article id={id} className="project" aria-labelledby={`${id}-title`}>
      <section className="section project-header">
        <div className="project-header-content" style={{ "--initDelay": "300ms" } as CSSProperties}>
          <div className="project-details">
            <h2 className="heading project-title" data-level="2" id={`${id}-title`}>
              {project.name}
            </h2>
            {project.line ? (
              <p className="text project-description" data-size="xl">
                {project.line}
              </p>
            ) : null}
            {link ? (
              <Button
                secondary
                iconHoverShift
                className="project-link"
                icon="chevron-right"
                href={link.href}
              >
                {project.website ? t.visit : t.source}
              </Button>
            ) : null}
          </div>
          {meta.length > 0 ? (
            <ul className="project-meta">
              {meta.map((item, index) => (
                <li
                  key={item}
                  className="project-meta-item"
                  style={{ "--delay": `${300 + 300 + index * 140}ms` } as CSSProperties}
                >
                  <span className="text" data-secondary>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <section className="project-section">
        <div className="section project-section-inner">
          <div className="project-section-content">
            <div className="project-image">
              <RevealFrame delay={300}>
                <DrawnScreen device="laptop" content={drawnOf(project)} id={`${id}-cover`} />
              </RevealFrame>
            </div>
          </div>
        </div>
      </section>
      {paragraphs.length > 0 ? (
        <section className="project-section">
          <div className="section project-section-inner">
            <div className="project-text-row">
              {project.outcome ? (
                <h3 className="heading project-section-heading" data-level="3">
                  {project.outcome}
                </h3>
              ) : null}
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text project-section-text" data-size="l">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <section className="project-section">
        <div className="section project-section-inner">
          <Button secondary icon="chevron-right" href={back}>
            {t.back}
          </Button>
        </div>
      </section>
    </article>
  );
}
