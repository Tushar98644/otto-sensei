import type { ReactNode } from "react";
import { fmt, selectPlural } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import type { ContentProject } from "@/lib/portfolio/content";
import { allSkills, designLocale, nameOf, OutLink, safeId, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { Frame, Fx, ModeButtons, Reveal } from "./on-demand";
import { PAPER_CSS } from "./styles";

// Ported from umutxyp/Personal-Website (MIT, see ./LICENSE.txt); its fox world, day and night.

type Line = 0 | 1 | 2;

function Pic({ name, className }: { name: string; className: string }) {
  return <span className={`pic ${className}`} data-pic={name} aria-hidden />;
}

function Heading({ children, line, id }: { children: string; line: Line; id?: string }) {
  return (
    <div className="heading" id={id}>
      <Fx className="fx-heading">
        <h2 className="wavy">{children}</h2>
      </Fx>
      <Pic name={`line-${line}`} className={`strip line-${line}`} />
    </div>
  );
}

function Figures({ text }: { text: string }) {
  const parts = text
    .split(/\s+·\s+|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="figures">
      {parts.map((part) => {
        const [value, ...rest] = part.split(" ");
        return (
          <span key={part}>
            <mark>{value}</mark> {rest.join(" ")}
          </span>
        );
      })}
    </div>
  );
}

function hostOf(project: ContentProject): string {
  return project.website?.text ?? project.source?.repo ?? project.source?.text ?? "";
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

type Row = { id: string; title: string; href: string | null; meta: string; text?: string };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="rows">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="row-head">
            {row.href ? (
              <OutLink href={row.href} className="row-title">
                {row.title}
              </OutLink>
            ) : (
              <span className="row-title">{row.title}</span>
            )}
          </div>
          {row.text ? <p>{row.text}</p> : null}
          {row.meta ? <p className="meta">{row.meta}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function PaperTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.paper;
  const locale = designLocale(view);
  const name = nameOf(view, words.shared.untitled);
  const headline = view.headline || content.headline;
  const roles = content.disciplines.length > 0 ? content.disciplines : headline ? [headline] : [];
  const socials = content.socials.filter((social) => social.kind !== "email");
  const projects = [
    ...content.projects.filter((project) => project.featured),
    ...content.projects.filter((project) => !project.featured),
  ];
  const [lead, ...rest] = projects;
  const skills = allSkills(view);
  const year =
    view.updatedAt > Date.UTC(2000, 0, 1) ? new Date(view.updatedAt).getUTCFullYear() : null;
  const repos = content.github
    ? [...content.github.repos].sort((a, b) => b.stars - a.stars).slice(0, 6)
    : [];
  const ids = {
    about: "pf-paper-about",
    projects: "pf-paper-projects",
    work: "pf-paper-work",
    stack: "pf-paper-stack",
  };

  const sections: { key: string; title: string; id?: string; body: ReactNode }[] = [];
  // Numbers sit in About, so hiding About hides them too.
  const aboutShown = !view.hidden.includes("about");
  const stats = aboutShown ? content.stats : [];
  const about = content.aboutParts.length > 0 ? content.aboutParts : null;
  if (about || (aboutShown && content.pitch) || stats.length > 0 || resumeHref)
    sections.push({
      key: "about",
      title: t.about,
      id: ids.about,
      body: (
        <>
          {about ? (
            about.map((parts, index) => (
              <p key={index} className="note">
                {parts.map((part, at) =>
                  part.mark ? <mark key={at}>{part.text}</mark> : part.text,
                )}
              </p>
            ))
          ) : aboutShown && content.pitch ? (
            <p className="note">{content.pitch}</p>
          ) : null}
          {resumeHref ? (
            <p className="more">
              <a className="link" href={resumeHref}>
                {t.myResume}
              </a>
            </p>
          ) : null}
          {stats.length > 0 ? (
            <div className="stats" data-n={Math.min(stats.length, 4)}>
              {stats.slice(0, 4).map((stat) => (
                <div className="stat" key={`${stat.value}-${stat.label}`}>
                  <b>
                    <mark>{stat.value}</mark>
                  </b>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ),
    });

  if (lead)
    sections.push({
      key: "projects",
      title: view.titles.projects || t.projects,
      id: ids.projects,
      body: (
        <>
          <div className="studio sketch">
            <Frame />
            <Pic name="grow-3" className="grown" />
            <Pic name="perch" className="perch" />
            <div className="studio-head">
              <span className="logo" aria-hidden>
                {lead.monogram}
              </span>
              <div>
                <h3>{lead.name}</h3>
                {hostOf(lead) || lead.category ? (
                  <p>
                    {lead.website || lead.source ? (
                      <OutLink href={(lead.website ?? lead.source)!.href}>{hostOf(lead)}</OutLink>
                    ) : null}
                    {hostOf(lead) && lead.category ? " · " : null}
                    {lead.category}
                  </p>
                ) : null}
              </div>
            </div>
            {lead.description || lead.line ? <p>{lead.description || lead.line}</p> : null}
            {lead.tech.length > 0 ? (
              <ul className="products">
                {lead.tech.map((tech) => (
                  <li key={tech}>
                    <span className="tag small">{tech}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {lead.outcome ? <Figures text={lead.outcome} /> : null}
          </div>
          {rest.length > 0 ? (
            <div className="cards">
              {rest.map((project, index) => {
                const href = project.website?.href ?? project.source?.href ?? null;
                const inner = (
                  <>
                    <Frame />
                    <Pic name={`grow-${index % 4}`} className="grown" />
                    <div className="card-head">
                      <span className="logo" aria-hidden>
                        {project.monogram}
                      </span>
                      <div>
                        <h3>{project.name}</h3>
                        {hostOf(project) ? <span>{hostOf(project)}</span> : null}
                      </div>
                    </div>
                    {project.line || project.description ? (
                      <p>{project.line || project.description}</p>
                    ) : null}
                    {project.stars || project.years ? (
                      <div className="figures">
                        {project.stars ? (
                          <span>
                            {rich(
                              selectPlural(locale, t.stars, project.stars),
                              { b: (chunk) => <mark>{chunk}</mark> },
                              { count: compact(project.stars) },
                            )}
                          </span>
                        ) : null}
                        {project.years ? <span>{project.years}</span> : null}
                      </div>
                    ) : null}
                  </>
                );
                return href ? (
                  <OutLink key={project.id} href={href} className="card sketch">
                    {inner}
                  </OutLink>
                ) : (
                  <div key={project.id} className="card sketch">
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ),
    });

  if (content.experience.length > 0)
    sections.push({
      key: "work",
      title: view.titles.experience || t.work,
      id: ids.work,
      body: content.experience.map((role) => (
        <article key={role.id} className="job sketch" id={safeId("pf-paper-job", role.id)}>
          <Frame />
          <div className="job-head">
            <h3>
              {role.website ? (
                <OutLink href={role.website.href}>{role.company || role.title}</OutLink>
              ) : (
                role.company || role.title
              )}
            </h3>
            {role.company && role.title ? <span className="role">{role.title}</span> : null}
            {role.dates ? <span className="when">{role.dates}</span> : null}
          </div>
          {role.summary ? <p className="job-lead">{role.summary}</p> : null}
          {role.lines.length > 0 ? (
            <ul>
              {role.lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : null}
        </article>
      )),
    });

  if (skills.length > 0)
    sections.push({
      key: "stack",
      title: t.stack,
      id: ids.stack,
      body: (
        <ul className="stack">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      ),
    });

  if (content.education.length > 0)
    sections.push({
      key: "education",
      title: view.titles.education || t.education,
      body: (
        <Rows
          rows={content.education.map((school) => ({
            id: school.id,
            title: school.school || school.degree,
            href: school.website?.href ?? null,
            text: school.school ? school.degree : "",
            meta: [school.dates, school.lines[0] ?? ""].filter(Boolean).join(" · "),
          }))}
        />
      ),
    });

  if (repos.length > 0 && content.github)
    sections.push({
      key: "open-source",
      title: t.openSource,
      body: (
        <>
          <ul className="rows">
            {repos.map((repo) => (
              <li key={repo.fullName}>
                <div className="row-head">
                  <OutLink href={repo.url} className="row-title">
                    {repo.name}
                  </OutLink>
                  {repo.stars > 0 ? (
                    <span className="stars">
                      <i className="star" />
                      {compact(repo.stars)}
                    </span>
                  ) : null}
                </div>
                {repo.description ? <p>{repo.description}</p> : null}
              </li>
            ))}
          </ul>
          <p className="more spaced">
            <OutLink href={content.github.href} className="link">
              {t.allOfIt}
            </OutLink>
          </p>
        </>
      ),
    });

  if (content.writing.length > 0)
    sections.push({
      key: "writing",
      title: t.writing,
      body: (
        <Rows
          rows={content.writing.map((post) => ({
            id: post.id,
            title: post.title,
            href: post.href,
            meta: [
              post.date,
              post.minutes ? fmt(t.minRead, { count: post.minutes }) : "",
              post.publisher,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      ),
    });

  if (content.talks.length > 0)
    sections.push({
      key: "talks",
      title: t.talks,
      body: (
        <Rows
          rows={content.talks.map((talk) => ({
            id: talk.id,
            title: talk.title,
            href: talk.href ?? talk.recording ?? talk.slides,
            meta: [talk.event, talk.date, talk.place].filter(Boolean).join(" · "),
          }))}
        />
      ),
    });

  const honours: Row[] = [
    ...content.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      href: milestone.href,
      meta: [milestone.result || milestone.detail, milestone.place, milestone.date]
        .filter(Boolean)
        .join(" · "),
    })),
    ...view.certifications.map((cert) => ({
      id: cert.id,
      title: cert.name,
      href: null,
      meta: [cert.issuer, cert.date].filter(Boolean).join(" · "),
    })),
  ];
  if (honours.length > 0)
    sections.push({
      key: "milestones",
      title:
        content.milestones.length > 0
          ? t.milestones
          : view.titles.certifications || t.certifications,
      body: <Rows rows={honours} />,
    });

  for (const extra of view.extras) {
    if (extra.items.length === 0) continue;
    sections.push({
      key: extra.id,
      title: extra.title,
      body: (
        <Rows
          rows={extra.items.map((item) => ({
            id: item.id,
            title: item.title || item.subtitle,
            href: null,
            text: item.detail || item.lines[0] || "",
            meta: [item.title ? item.subtitle : "", item.date].filter(Boolean).join(" · "),
          }))}
        />
      ),
    });
  }

  const nav = [
    sections.some((section) => section.key === "about")
      ? { href: `#${ids.about}`, label: t.nav.about }
      : null,
    lead ? { href: `#${ids.projects}`, label: t.nav.work } : null,
    content.experience.length > 0 ? { href: `#${ids.work}`, label: t.nav.jobs } : null,
    skills.length > 0 ? { href: `#${ids.stack}`, label: t.nav.stack } : null,
  ].filter((item) => item !== null);

  return (
    <div className="pf-paper" data-world="fox">
      <TemplateStyle css={PAPER_CSS} />
      <header className="header">
        <div className="wrap">
          <a href="#pf-paper-top" className="brand">
            <span className="brand-mark" aria-hidden>
              {content.initials || name.slice(0, 1)}
            </span>
            <span className="brand-name">{name}</span>
          </a>
          {nav.length > 0 || resumeHref ? (
            <nav className="nav" aria-label={t.sections}>
              {nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
              {resumeHref ? <a href={resumeHref}>{t.resume}</a> : null}
            </nav>
          ) : null}
          <ModeButtons header words={t.mode} />
        </div>
      </header>

      <div id="pf-paper-top">
        <section className="hero">
          <div className="hero-text">
            <Fx steady>
              <h1>{name}</h1>
            </Fx>
            <span className="underline" aria-hidden>
              <i />
              <i />
            </span>
            {roles.length > 0 ? (
              <ul className="roles">
                {roles.map((role) => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="scene" aria-hidden />
        </section>

        <div className="wrap">
          {socials.length > 0 || content.email ? (
            <nav className="links" aria-label={t.elsewhere}>
              {socials.map((social) => (
                <OutLink key={social.href} href={social.href} className="tag">
                  {social.label.toLowerCase()}
                </OutLink>
              ))}
              {content.email ? (
                <a className="tag" href={`mailto:${content.email}`}>
                  {t.email}
                </a>
              ) : null}
            </nav>
          ) : null}

          {sections.map((section, index) => (
            <Reveal key={section.key}>
              <section className="section">
                <Heading line={(index % 3) as Line} id={section.id}>
                  {section.title}
                </Heading>
                {section.body}
              </section>
            </Reveal>
          ))}
        </div>
      </div>

      <footer className="footer">
        <Pic name="ground" className="ground" />
        <div className="footer-body">
          <div className="wrap">
            <h4>{t.dayOrNight}</h4>
            <ModeButtons words={t.mode} />
            <p className="small">
              {year ? `© ${year} ` : null}
              {fmt(t.drawn, { name })}
            </p>
            {footer ? <div className="credit">{footer}</div> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
