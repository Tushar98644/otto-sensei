import { ExternalLink, Folder } from "lucide-react";
import type { CSSProperties } from "react";
import type { ContentProject } from "@/lib/portfolio/content";
import { GitHubIcon, SocialIcon } from "../icons";
import {
  contactHref,
  featuredFirst,
  Marked,
  nameOf,
  OutLink,
  allSkills,
  TemplateStyle,
} from "../parts";
import { RevealOnScroll } from "../reveal";
import type { PortfolioTemplateProps } from "../types";
import { JobTabs, NavMenu, NavScroll, ShowMore, type NavLink, type NavyJob } from "./islands";
import { CodeScreen } from "./screen";
import { NAVY_CSS } from "./styles";

// Ported from bchiang7/v4 (MIT, see ./LICENSE.txt).

const A = {
  top: "pf-navy-top",
  content: "pf-navy-content",
  about: "pf-navy-about",
  jobs: "pf-navy-jobs",
  work: "pf-navy-projects",
  contact: "pf-navy-contact",
} as const;

const FEATURED_MAX = 3;
const ABOUT_SKILLS = 6;

const i = (index: number) => ({ "--i": index }) as CSSProperties;

function ProjectLinks({ project }: { project: ContentProject }) {
  if (!project.source && !project.website) return null;
  return (
    <div className="project-links">
      {project.source ? (
        <OutLink href={project.source.href} label="GitHub">
          <GitHubIcon />
        </OutLink>
      ) : null}
      {project.website ? (
        <OutLink href={project.website.href} className="external" label="External link">
          <ExternalLink aria-hidden />
        </OutLink>
      ) : null}
    </div>
  );
}

function Featured({ project }: { project: ContentProject }) {
  const href = project.website?.href ?? project.source?.href ?? null;
  const screen = <CodeScreen project={project} />;
  return (
    <li className="project" data-reveal>
      <div className="project-content">
        <div>
          <p className="project-overline">Featured Project</p>
          <h3 className="project-title">
            <OutLink href={href}>{project.name}</OutLink>
          </h3>
          {project.description || project.line ? (
            <div className="project-description">
              <p>{project.description || project.line}</p>
            </div>
          ) : null}
          {project.tech.length > 0 ? (
            <ul className="project-tech-list">
              {project.tech.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          ) : null}
          <ProjectLinks project={project} />
        </div>
      </div>
      <div className="project-image">
        {href ? <OutLink href={href}>{screen}</OutLink> : <div className="frame">{screen}</div>}
      </div>
    </li>
  );
}

function Card({ project }: { project: ContentProject }) {
  const href = project.website?.href ?? project.source?.href ?? null;
  return (
    <li className="card" data-reveal>
      <div className="card-inner">
        <header>
          <div className="card-top">
            <div className="folder">
              <Folder strokeWidth={1} aria-hidden />
            </div>
            <ProjectLinks project={project} />
          </div>
          <h3 className="card-title">
            <OutLink href={href}>{project.name}</OutLink>
          </h3>
          {project.line || project.description ? (
            <div className="card-description">
              <p>{project.line || project.description}</p>
            </div>
          ) : null}
        </header>
        {project.tech.length > 0 ? (
          <footer>
            <ul className="tech">
              {project.tech.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
    </li>
  );
}

export function NavyTemplate({ view, content, footer, resumeHref }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const initial = (content.initials || name).charAt(0).toUpperCase();
  const socials = content.socials.filter((social) => social.kind !== "email");
  const skills = allSkills(view).slice(0, ABOUT_SKILLS);
  const hasAbout = content.about.length > 0 || skills.length > 0;
  const featured = featuredFirst(content.projects).slice(0, FEATURED_MAX);
  const others = content.projects.filter((project) => !featured.includes(project));
  const hello = contactHref(content);

  const jobs: NavyJob[] = content.experience.map((job) => ({
    id: job.id,
    tab: job.company || job.title,
    title: job.title || job.company,
    company: job.title ? job.company : "",
    href: job.website?.href ?? null,
    range: job.start && job.end ? `${job.start} - ${job.end}` : job.dates,
    lines: job.lines,
  }));

  const links: NavLink[] = [
    hasAbout ? { href: `#${A.about}`, label: "About" } : null,
    jobs.length > 0 ? { href: `#${A.jobs}`, label: "Experience" } : null,
    content.projects.length > 0 ? { href: `#${A.work}`, label: "Work" } : null,
    { href: `#${A.contact}`, label: "Contact" },
  ].filter((link): link is NavLink => link !== null);

  const othersGrid =
    others.length > 0 ? (
      <>
        <ul className="projects-grid">
          {others.map((project) => (
            <Card key={project.id} project={project} />
          ))}
        </ul>
        {others.length > 6 ? <ShowMore /> : null}
      </>
    ) : null;

  return (
    <div className="pf-navy">
      <TemplateStyle css={NAVY_CSS} />
      <RevealOnScroll />
      <a className="skip" href={`#${A.content}`}>
        Skip to Content
      </a>
      <header className="nav" data-top="true">
        <NavScroll />
        <nav>
          <div className="logo">
            <a href={`#${A.top}`} aria-label="Home">
              <span className="hex-container" aria-hidden>
                <svg viewBox="0 0 84 96">
                  <polygon
                    transform="translate(3 3)"
                    points="39 0 0 22 0 67 39 90 78 68 78 23"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="logo-container" aria-hidden>
                <svg viewBox="0 0 84 96">
                  <polygon
                    transform="translate(3 3)"
                    points="39 0 0 22 0 67 39 90 78 68 78 23"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                  <text x="42" y="49" textAnchor="middle" dominantBaseline="central">
                    {initial}
                  </text>
                </svg>
              </span>
            </a>
          </div>
          <div className="links">
            <ol>
              {links.map((link, index) => (
                <li key={link.href} style={i(index)}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ol>
            {resumeHref ? (
              <div className="resume" style={i(links.length)}>
                <a className="btn-small" href={resumeHref}>
                  Resume
                </a>
              </div>
            ) : null}
          </div>
          <NavMenu links={links} resumeHref={resumeHref ?? null} />
        </nav>
      </header>

      {socials.length > 0 ? (
        <div className="side side-left">
          <ul className="side-list">
            {socials.map((social) => (
              <li key={social.href}>
                <OutLink href={social.href} label={social.label}>
                  <SocialIcon kind={social.kind} />
                </OutLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {content.email ? (
        <div className="side side-right">
          <div className="side-email">
            <a href={`mailto:${content.email}`}>{content.email}</a>
          </div>
        </div>
      ) : null}

      <div className="content" id={A.content}>
        <div className="main">
          <section className="hero" id={A.top}>
            <h1 style={i(0)}>Hi, my name is</h1>
            <h2 className="big-heading" style={i(1)}>
              {name}.
            </h2>
            {view.headline ? (
              <h3 className="big-heading" style={i(2)}>
                {view.headline}.
              </h3>
            ) : null}
            {content.pitch ? (
              <div style={i(3)}>
                <p>{content.pitch}</p>
              </div>
            ) : null}
            {hello ? (
              <div style={i(4)}>
                <OutLink href={hello} className="btn-big">
                  Get In Touch
                </OutLink>
              </div>
            ) : null}
          </section>

          {hasAbout ? (
            <section className="about" id={A.about} data-reveal>
              <h2 className="numbered-heading">
                <span className="label">About Me</span>
              </h2>
              <div className="inner">
                <div>
                  {content.aboutParts.map((parts, index) => (
                    <p key={index}>
                      <Marked parts={parts} mark="span" className="hl" />
                    </p>
                  ))}
                  {skills.length > 0 ? (
                    <>
                      <p>Here are a few technologies I&rsquo;ve been working with recently:</p>
                      <ul className="skills-list">
                        {skills.map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
                <div className="pic">
                  <div className="wrapper">
                    <div className="initials" aria-hidden>
                      {content.initials || initial}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {jobs.length > 0 ? (
            <section className="jobs" id={A.jobs} data-reveal>
              <h2 className="numbered-heading">
                <span className="label">Where I&rsquo;ve Worked</span>
              </h2>
              <JobTabs jobs={jobs} />
            </section>
          ) : null}

          {featured.length > 0 ? (
            <section id={A.work}>
              <h2 className="numbered-heading" data-reveal>
                <span className="label">Some Things I&rsquo;ve Built</span>
              </h2>
              <ul className="featured-list">
                {featured.map((project) => (
                  <Featured key={project.id} project={project} />
                ))}
              </ul>
            </section>
          ) : null}

          {othersGrid && featured.length > 0 ? (
            <section className="others">
              <h2 data-reveal>Other Noteworthy Projects</h2>
              {othersGrid}
            </section>
          ) : othersGrid ? (
            <section className="others numbered" id={A.work}>
              <h2 className="numbered-heading" data-reveal>
                <span className="label">Some Things I&rsquo;ve Built</span>
              </h2>
              {othersGrid}
            </section>
          ) : null}

          <section className="contact" id={A.contact} data-reveal>
            <h2 className="numbered-heading overline">What&rsquo;s Next?</h2>
            <h2 className="title">Get In Touch</h2>
            <p>
              {content.availability?.text
                ? content.availability.text
                : "Whether it’s a role, a project or a quick question, my inbox is open and I’ll get back to you."}
            </p>
            {hello ? (
              <OutLink href={hello} className="btn-big">
                Say Hello
              </OutLink>
            ) : null}
          </section>
        </div>

        <footer className="footer">
          {socials.length > 0 ? (
            <div className="footer-social">
              <ul>
                {socials.map((social) => (
                  <li key={social.href}>
                    <OutLink href={social.href} label={social.label}>
                      <SocialIcon kind={social.kind} />
                    </OutLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {footer ? <div className="credit">{footer}</div> : null}
        </footer>
      </div>
    </div>
  );
}
