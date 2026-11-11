import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Code,
  Globe,
  Mic,
  Newspaper,
  Rocket,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { ContentProject, MilestoneKind } from "@/lib/portfolio/content";
import { GitHubIcon } from "../icons";
import {
  allSkills,
  contactHref,
  Marked,
  nameOf,
  OutLink,
  seeded,
  seedOf,
  TemplateStyle,
} from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { Dock, FlickeringGrid, type DockLink } from "./islands";
import { DOCK_CSS } from "./styles";

// Dock: a rebuild of Dillion Verma's portfolio (github.com/dillionverma/portfolio, the magicui
// template, MIT; ./LICENSE.txt) for anyone's data. One calm column that blurs in block by block:
// initials avatar hero, About, work as expandable rows with monogram badges, education, skill
// badges, project cards with a drawn cover (a dot, grid or line field and the project's mark, in
// place of his screenshots and videos), a hackathon timeline, a contact card, and a floating dock
// with a theme toggle.

const STEP = 0.04;
const SOCIALS_IN_DOCK = 5;

const delay = (steps: number) => ({ "--d": `${(steps * STEP).toFixed(2)}s` }) as CSSProperties;

function Logo({ monogram }: { monogram: string }) {
  return (
    <div className="logo" aria-hidden>
      {monogram}
    </div>
  );
}

const PATTERNS = ["dots", "grid", "lines"] as const;

/** The card's cover: one of three fields, lit from a spot of its own, under the project's mark. */
function Cover({ project }: { project: ContentProject }) {
  const random = seeded(seedOf(project.name));
  const style = {
    "--x": `${Math.round(15 + random() * 70)}%`,
    "--y": `${Math.round(10 + random() * 50)}%`,
  } as CSSProperties;
  const pattern = PATTERNS[Math.floor(random() * PATTERNS.length)]!;
  return (
    <div className="cover" data-pattern={pattern} style={style}>
      <span className="cover-mark" aria-hidden>
        {project.monogram}
      </span>
      {project.category ? <span className="cover-label">{project.category}</span> : null}
    </div>
  );
}

const MILESTONE_ICONS: Record<MilestoneKind, LucideIcon> = {
  award: Trophy,
  hackathon: Code,
  launch: Rocket,
  press: Newspaper,
  talk: Mic,
  other: Star,
};

function ProjectCard({ project }: { project: ContentProject }) {
  const href = project.website?.href ?? project.source?.href ?? null;
  const links: { href: string; label: string; icon: ReactNode }[] = [];
  if (project.website)
    links.push({ href: project.website.href, label: "Website", icon: <Globe aria-hidden /> });
  if (project.source)
    links.push({ href: project.source.href, label: "Source", icon: <GitHubIcon /> });
  const cover = <Cover project={project} />;
  return (
    <div className="card">
      <div className="media">
        {href ? <OutLink href={href}>{cover}</OutLink> : <div>{cover}</div>}
        {links.length > 0 ? (
          <div className="media-links">
            {links.map((link) => (
              <OutLink key={link.href} href={link.href} className="badge black">
                {link.icon}
                {link.label}
              </OutLink>
            ))}
          </div>
        ) : null}
      </div>
      <div className="card-body">
        <div className="card-top">
          <div>
            <h3>{project.name}</h3>
            {project.years ? <time>{project.years}</time> : null}
          </div>
          {href ? (
            <OutLink href={href} className="open" label={`Open ${project.name}`}>
              <ArrowUpRight aria-hidden />
            </OutLink>
          ) : null}
        </div>
        {project.description || project.line ? (
          <div className="card-desc">
            <p>{project.description || project.line}</p>
          </div>
        ) : null}
        {project.tech.length > 0 ? (
          <div className="tags">
            {project.tech.map((tech) => (
              <span key={tech} className="badge outline">
                {tech}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionHead({ pill, title, text }: { pill: string; title: string; text: string }) {
  return (
    <div className="head">
      <div className="pill-row">
        <div className="rule l" />
        <div className="pill">{pill}</div>
        <div className="rule r" />
      </div>
      <div className="head-text">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function DockTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const first = content.first || name;
  const skills = [...new Set(allSkills(view))];
  const socials = content.socials.filter((social) => social.kind !== "email");
  const hello = contactHref(content);
  const dockSocials: DockLink[] = [
    ...socials
      .slice(0, SOCIALS_IN_DOCK)
      .map((social) => ({ href: social.href, label: social.label, kind: social.kind })),
    ...(content.email
      ? [{ href: `mailto:${content.email}`, label: "Email", kind: "email" as const }]
      : []),
  ];

  return (
    <div className="pf-dock" id="pf-dock-top">
      <TemplateStyle css={DOCK_CSS} />
      <div className="grid-top">
        <FlickeringGrid />
      </div>
      <div className="page">
        <div className="main">
          <section className="hero">
            <div className="hero-row">
              <div className="hero-text">
                <h1 className="bf bf-text" style={delay(0)}>
                  Hi, I&rsquo;m {first}
                </h1>
                {content.pitch || view.headline ? (
                  <p className="lead bf" style={delay(0)}>
                    {content.pitch || view.headline}
                  </p>
                ) : null}
              </div>
              <div className="avatar-wrap bf" style={delay(0)}>
                <span className="avatar">
                  <span className="fallback" aria-hidden>
                    {content.initials}
                  </span>
                </span>
              </div>
            </div>
          </section>

          {content.about.length > 0 ? (
            <section className="section gap-4">
              <h2 className="title bf" style={delay(2)}>
                About
              </h2>
              <div className="prose bf" style={delay(3)}>
                {content.aboutParts.map((parts, index) => (
                  <p key={index}>
                    <Marked parts={parts} mark="span" className="mark" />
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {content.experience.length > 0 ? (
            <section className="section gap-6">
              <h2 className="title bf" style={delay(4)}>
                Work Experience
              </h2>
              <div className="rows bf" style={delay(5)}>
                {content.experience.map((job) => {
                  const lines = job.lines.length > 0 ? job.lines : job.summary ? [job.summary] : [];
                  const head = (
                    <div className="row-head">
                      <div className="row-main">
                        <Logo monogram={job.monogram} />
                        <div className="row-text">
                          <div className="row-title">
                            {job.company || job.title}
                            {lines.length > 0 ? (
                              <span className="chev" aria-hidden>
                                <ChevronRight className="right" />
                                <ChevronDown className="down" />
                              </span>
                            ) : null}
                          </div>
                          {job.company && job.title ? (
                            <div className="row-sub">{job.title}</div>
                          ) : null}
                        </div>
                      </div>
                      {job.dates ? (
                        <div className="row-date">
                          <span>
                            {job.start && job.end ? `${job.start} - ${job.end}` : job.dates}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                  return lines.length > 0 ? (
                    <details key={job.id} className="row">
                      <summary>{head}</summary>
                      <div className="row-body">
                        {lines.map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <div key={job.id} className="row">
                      {head}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {content.education.length > 0 ? (
            <section className="section gap-6">
              <h2 className="title bf" style={delay(6)}>
                Education
              </h2>
              <div className="edu">
                {content.education.map((school, index) => {
                  const inner = (
                    <>
                      <div className="row-main">
                        <Logo monogram={school.monogram} />
                        <div className="row-text">
                          <div className="row-title">
                            {school.school || school.degree}
                            {school.website ? <ArrowUpRight className="arrow" aria-hidden /> : null}
                          </div>
                          {school.school && school.degree ? (
                            <div className="row-sub">{school.degree}</div>
                          ) : null}
                        </div>
                      </div>
                      {school.dates ? (
                        <div className="row-date">
                          <span>
                            {school.start && school.end
                              ? `${school.start} - ${school.end}`
                              : school.dates}
                          </span>
                        </div>
                      ) : null}
                    </>
                  );
                  return (
                    <div key={school.id} className="bf" style={delay(7 + index * 1.25)}>
                      {school.website ? (
                        <OutLink href={school.website.href} className="row-head">
                          {inner}
                        </OutLink>
                      ) : (
                        <div className="row-head">{inner}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {skills.length > 0 ? (
            <section className="section gap-4">
              <h2 className="title bf" style={delay(8)}>
                Skills
              </h2>
              <div className="badges">
                {skills.map((skill, index) => (
                  <div key={skill} className="skill bf" style={delay(9 + index * 1.25)}>
                    {skill}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {content.projects.length > 0 ? (
            <section className="section bf" style={delay(10)}>
              <div className="section gap-6" style={{ rowGap: "2rem" }}>
                <SectionHead
                  pill="My Projects"
                  title="Check out my latest work"
                  text="A few of the things I’ve built, with links to try them out."
                />
                <div className="cards">
                  {content.projects.map((project, index) => (
                    <div key={project.id} className="bf" style={delay(11 + index * 1.25)}>
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {content.milestones.length > 0 ? (
            <section className="section bf" style={{ ...delay(12), overflow: "hidden" }}>
              <div className="section" style={{ rowGap: "2rem" }}>
                <SectionHead
                  pill="Hackathons"
                  title="I like building things"
                  text="Hackathons, awards and launches along the way."
                />
                <div className="timeline">
                  <div className="timeline-list">
                    {content.milestones.map((milestone) => {
                      const Icon = MILESTONE_ICONS[milestone.kind];
                      return (
                        <div key={milestone.id} className="t-item">
                          <div className="t-connect">
                            <div className="t-line" />
                            <div className="t-dot">
                              <span className="t-icon">
                                <Icon aria-hidden />
                              </span>
                            </div>
                          </div>
                          <div className="t-body">
                            {milestone.date ? <time>{milestone.date}</time> : null}
                            <h3>{milestone.title}</h3>
                            {milestone.place ? <p>{milestone.place}</p> : null}
                            {milestone.detail || milestone.result ? (
                              <p className="detail">
                                {[milestone.result, milestone.detail].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                            {milestone.href ? (
                              <div className="t-links">
                                <OutLink href={milestone.href} className="badge solid">
                                  <Globe aria-hidden />
                                  Link
                                </OutLink>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="bf" style={delay(15)}>
            <div className="contact">
              <div className="grid-half">
                <FlickeringGrid />
              </div>
              <div className="pill">Contact</div>
              <div className="contact-body">
                <h2>Get in Touch</h2>
                <p>
                  {content.availability?.text ? `${content.availability.text}. ` : "Want to chat? "}
                  {hello ? (
                    <>
                      Just{" "}
                      <OutLink href={hello}>
                        {content.email ? "send me an email" : "send me a message"}
                      </OutLink>{" "}
                      and I&rsquo;ll get back to you.
                    </>
                  ) : (
                    "I’d love to hear from you."
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <footer className="foot">{footer ? <div className="credit">{footer}</div> : null}</footer>
      <Dock home={{ href: "#pf-dock-top", label: "Home", kind: "home" }} socials={dockSocials} />
    </div>
  );
}
