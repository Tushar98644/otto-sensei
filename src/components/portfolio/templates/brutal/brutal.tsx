import type { CSSProperties, ReactNode } from "react";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import type { ContentProject, ContentRole } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import {
  allSkills,
  contactHref,
  featuredFirst,
  Marked,
  nameOf,
  OutLink,
  safeId,
  seedOf,
  TemplateStyle,
  unbroken,
} from "../parts";
import type { DesignWords, PortfolioTemplateProps } from "../types";
import { ToTop } from "./on-demand";
import { BRUTAL_CSS } from "./styles";

// Ported from ElianCodes/brutal and its brutal-ui cards, buttons and pills (MIT, see ./LICENSE.txt).

const ID = {
  top: "pf-brutal-top",
  about: "pf-brutal-about",
  projects: "pf-brutal-projects",
  work: "pf-brutal-work",
  more: "pf-brutal-more",
  contact: "pf-brutal-contact",
} as const;

// brutal-ui's variant colours and the live demo's coral, teal and pink.
const PALETTE = ["#f87171", "#2dd4bf", "#fb923c", "#facc15", "#c084fc", "#86efac", "#93c5fd"];
const CORAL = "#f87171";
const TEAL = "#2dd4bf";
const ORANGE = "#fb923c";
const YELLOW = "#facc15";
const EXTRA_COLORS = ["#c084fc", "#93c5fd", "#86efac", CORAL, ORANGE];
const STACK_PILLS = 12;
const TAGS = 4;

type Words = DesignWords["brutal"];

const tone = (color: string) => ({ "--color": color }) as CSSProperties;

function Arrow() {
  return <span aria-hidden> &rarr;</span>;
}

function Button({ href, children, size }: { href: string; children: ReactNode; size?: "sm" }) {
  return (
    <OutLink href={href} className={size ? "btn btn-sm" : "btn"}>
      {children}
      <Arrow />
    </OutLink>
  );
}

function Pill({ children, href }: { children: ReactNode; href?: string | null }) {
  if (href)
    return (
      <OutLink href={href} className="pill">
        {children}
      </OutLink>
    );
  return <span className="pill">{children}</span>;
}

function Card({
  color,
  className,
  children,
  id,
  label,
}: {
  color: string;
  className?: string;
  children: ReactNode;
  id?: string;
  label?: string;
}) {
  return (
    <section
      className={className ? `card ${className}` : "card"}
      style={tone(color)}
      id={id}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function ProjectCard({
  project,
  index,
  t,
}: {
  project: ContentProject;
  index: number;
  t: Words["projects"];
}) {
  const href = project.website?.href ?? project.source?.href ?? null;
  const text = project.description || project.line || project.lines[0] || "";
  return (
    <article className="post" id={safeId("pf-brutal-p", project.id)}>
      <h3 className="post-title">{project.name}</h3>
      <div
        className="cover"
        style={tone(PALETTE[(seedOf(project.name) + index) % PALETTE.length]!)}
        aria-hidden
      >
        <span className="cover-mark">{project.monogram}</span>
        <span className="cover-line">{project.line || project.category || project.name}</span>
      </div>
      {project.category || project.years ? (
        <p className="post-meta">{[project.category, project.years].filter(Boolean).join(" · ")}</p>
      ) : null}
      {text ? <p className="post-text">{text}</p> : null}
      {project.outcome ? <p className="post-outcome">{project.outcome}</p> : null}
      {href || project.source ? (
        <div className="post-actions">
          {project.source && project.website ? (
            <Button href={project.source.href} size="sm">
              {t.source}
            </Button>
          ) : null}
          {href ? <Button href={href}>{project.website ? t.visit : t.source}</Button> : null}
        </div>
      ) : null}
      {project.tech.length > 0 ? (
        <div className="tags">
          <p>{t.tags}</p>
          <ul>
            {project.tech.slice(0, TAGS).map((tech) => (
              <li key={tech}>
                <Pill>{tech}</Pill>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function JobCard({ job }: { job: ContentRole }) {
  return (
    <article className="post job">
      <div className="job-head">
        <div>
          <h3 className="post-title">{job.title || job.company}</h3>
          {job.title && job.company ? (
            <p className="job-company">
              {job.website ? <OutLink href={job.website.href}>{job.company}</OutLink> : job.company}
              {job.location ? <span className="muted"> · {job.location}</span> : null}
            </p>
          ) : null}
        </div>
        {job.dates ? <span className="date">{unbroken(job.dates)}</span> : null}
      </div>
      {job.highlight ? <p className="job-highlight">{job.highlight}</p> : null}
      {job.summary ? <p className="post-text">{job.summary}</p> : null}
      {job.lines.length > 0 ? (
        <ul className="job-lines">
          {job.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {job.tags.length > 0 ? (
        <ul className="tags-row">
          {job.tags.slice(0, 6).map((tag) => (
            <li key={tag}>
              <Pill>{tag}</Pill>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function BrutalTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.brutal;
  const name = nameOf(view, words.shared.untitled);
  const first = content.first || name;
  const lead = [content.pitch, content.headline || view.headline].find(
    (text) => text && text !== content.about[0],
  );
  const [intro, ...moreAbout] = content.about.length > 0 ? content.aboutParts : [];
  const projects = featuredFirst(content.projects);
  const stack = allSkills(view).slice(0, STACK_PILLS);
  const socials = content.socials.filter((social) => social.kind !== "email");
  const hello = contactHref(content);
  const nav = [
    { on: content.about.length > 0, href: `#${ID.about}`, label: t.nav.about },
    { on: projects.length > 0, href: `#${ID.projects}`, label: t.nav.projects },
    { on: content.experience.length > 0, href: `#${ID.work}`, label: t.nav.work },
    { on: hello !== null, href: `#${ID.contact}`, label: t.nav.contact },
  ].filter((item) => item.on);

  const extras = [
    content.education.length > 0 && {
      key: "education",
      title: view.titles.education || t.extras.education,
      rows: content.education.map((school) => ({
        id: school.id,
        main: school.school || school.degree,
        sub: [school.school ? school.degree : "", school.dates].filter(Boolean).join(" · "),
        href: school.website?.href ?? null,
      })),
    },
    view.certifications.length > 0 && {
      key: "certs",
      title: view.titles.certifications || t.extras.certifications,
      rows: view.certifications.map((cert) => ({
        id: cert.id,
        main: cert.name,
        sub: [cert.issuer, cert.date].filter(Boolean).join(" · "),
        href: null,
      })),
    },
    content.writing.length > 0 && {
      key: "writing",
      title: t.extras.writing,
      rows: content.writing.map((post) => ({
        id: post.id,
        main: post.title,
        sub: [
          post.date,
          post.minutes ? fmt(t.extras.minutes, { minutes: post.minutes }) : "",
          post.publisher,
        ]
          .filter(Boolean)
          .join(" · "),
        href: post.href,
      })),
    },
    content.talks.length > 0 && {
      key: "talks",
      title: t.extras.talks,
      rows: content.talks.map((talk) => ({
        id: talk.id,
        main: talk.title,
        sub: [talk.event, talk.date].filter(Boolean).join(" · "),
        href: talk.href ?? talk.recording ?? talk.slides,
      })),
    },
    content.milestones.length > 0 && {
      key: "milestones",
      title: t.extras.milestones,
      rows: content.milestones.map((milestone) => ({
        id: milestone.id,
        main: milestone.title,
        sub: [milestone.result, milestone.date].filter(Boolean).join(" · "),
        href: milestone.href,
      })),
    },
    ...view.extras.map((section) => ({
      key: `x-${section.id}`,
      title: section.title,
      rows: section.items.map((item) => ({
        id: item.id,
        main: item.title || item.detail,
        sub: [item.subtitle, item.date].filter(Boolean).join(" · "),
        href: null,
      })),
    })),
  ].filter((item) => item !== false);

  const heroCards = 1 + (stack.length > 0 ? 1 : 0) + (intro ? 1 : 0);

  return (
    <div className="pf-brutal" id={ID.top}>
      <TemplateStyle css={BRUTAL_CSS} />
      <header className="head">
        <a href={`#${ID.top}`} className="logo">
          {name}
        </a>
        {nav.length > 0 || resumeHref || socials.length > 0 ? (
          <nav aria-label={t.nav.label}>
            <ul>
              {nav.map((item) => (
                <li key={item.href} className="nav-text">
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
              {resumeHref ? (
                <li>
                  <a href={resumeHref} className="nav-resume">
                    {t.resume}
                  </a>
                </li>
              ) : null}
              {socials.slice(0, 4).map((social) => (
                <li key={social.href} className="nav-icon">
                  <OutLink href={social.href} label={social.label}>
                    <SocialIcon kind={social.kind} className="icon" />
                  </OutLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="main">
        {socials.length > 0 ? (
          <ul className="mobile-socials">
            {socials.map((social) => (
              <li key={social.href}>
                <OutLink href={social.href} label={social.label} className="pill icon-pill">
                  <SocialIcon kind={social.kind} className="icon" />
                </OutLink>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="hero" data-cards={heroCards}>
          <Card color={CORAL} className="hero-card" label={t.hero.label}>
            <h1 className="hero-title">
              {rich(
                t.hero.hello,
                { b: (chunk) => <span className="white">{chunk}</span> },
                { name: first },
              )}
            </h1>
            {lead ? <p className="hero-lead">{lead}</p> : null}
            {hello || resumeHref ? (
              <div className="actions">
                {hello ? <Button href={hello}>{t.hero.getInTouch}</Button> : null}
                {resumeHref ? <Button href={resumeHref}>{t.resume}</Button> : null}
              </div>
            ) : null}
          </Card>
          {stack.length > 0 ? (
            <Card color={TEAL} label={t.stack.label}>
              <h2 className="serif-title">{fmt(t.stack.title, { name: first })}</h2>
              <ul className="pills">
                {stack.map((skill) => (
                  <li key={skill}>
                    <Pill>{skill}</Pill>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {intro ? (
            <Card color={ORANGE} id={ID.about} label={t.nav.about}>
              <h2 className="serif-title">{fmt(t.about.title, { name: first })}</h2>
              <p className="body-text">
                <Marked parts={intro} />
              </p>
              {content.location?.label || content.availability ? (
                <ul className="pills small">
                  {content.location?.label ? (
                    <li>
                      <Pill>{content.location.label}</Pill>
                    </li>
                  ) : null}
                  {content.availability ? (
                    <li>
                      <Pill>{content.availability.short || content.availability.text}</Pill>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </Card>
          ) : null}
        </div>

        {moreAbout.length > 0 ? (
          <Card color="#ffffff" className="wide prose-card" label={t.about.moreLabel}>
            <h2 className="serif-title">{fmt(t.about.more, { name: first })}</h2>
            {moreAbout.map((parts, i) => (
              <p key={i} className="body-text">
                <Marked parts={parts} />
              </p>
            ))}
          </Card>
        ) : null}

        {projects.length > 0 ? (
          <Card color={TEAL} className="wide" id={ID.projects} label={t.projects.title}>
            <div className="wide-head">
              <h2 className="serif-title big">{view.titles.projects || t.projects.title}</h2>
              {content.github ? (
                <Button href={content.github.href}>{t.projects.github}</Button>
              ) : null}
            </div>
            <div className="posts" data-count={Math.min(projects.length, 3)}>
              {projects.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} t={t.projects} />
              ))}
            </div>
          </Card>
        ) : null}

        {content.experience.length > 0 ? (
          <Card color={YELLOW} className="wide" id={ID.work} label={t.experience.title}>
            <div className="wide-head">
              <h2 className="serif-title big">{view.titles.experience || t.experience.title}</h2>
              {resumeHref ? <Button href={resumeHref}>{t.experience.fullResume}</Button> : null}
            </div>
            <div className="jobs">
              {content.experience.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </Card>
        ) : null}

        {extras.length > 0 ? (
          <div className="extras" id={ID.more}>
            {extras.map((group, i) => (
              <Card
                key={group.key}
                color={EXTRA_COLORS[i % EXTRA_COLORS.length]!}
                label={group.title}
              >
                <h2 className="serif-title">{group.title}</h2>
                <ul className="rows">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      {row.href ? (
                        <OutLink href={row.href} className="row-main">
                          {row.main}
                        </OutLink>
                      ) : (
                        <span className="row-main">{row.main}</span>
                      )}
                      {row.sub ? <span className="row-sub">{row.sub}</span> : null}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : null}

        {hello ? (
          <Card color={ORANGE} className="wide contact" id={ID.contact} label={t.nav.contact}>
            <h2 className="serif-title big">{t.contact.title}</h2>
            <p className="hero-lead small">
              {content.availability?.text ||
                fmt(content.email ? t.contact.byEmail : t.contact.below, { name: first })}
            </p>
            <div className="actions">
              {content.email ? (
                <Button href={`mailto:${content.email}`}>{content.email}</Button>
              ) : null}
              {socials.map((social) => (
                <Button key={social.href} href={social.href} size="sm">
                  {social.label}
                </Button>
              ))}
            </div>
          </Card>
        ) : null}
      </main>

      <footer className="foot">
        <p>
          {name}
          {content.headline || view.headline ? ` - ${content.headline || view.headline}` : ""}
        </p>
        {footer ? <div className="foot-credit">{footer}</div> : null}
      </footer>
      <ToTop label={t.backToTop} />
    </div>
  );
}
