import { ArrowUpRight, Film, Lightbulb, Mic, Newspaper } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { ContentProject } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { Marked, nameOf, OutLink, seedOf, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { ArtPlum, ToTop } from "./islands";
import { PROSE_CSS } from "./styles";

// Prose: a rebuild of Anthony Fu's site (github.com/antfu/antfu.me, code MIT; ./LICENSE.txt) for
// anyone's data, with coloured monograms where his chips have logos. Only the code and layout
// come from the original: its text and pictures (CC BY-NC-SA) are not used.

const NAV_SOCIALS = 3;

const stage = (n: number, step = 90) =>
  ({ "--enter-stage": n, "--enter-step": `${step}ms` }) as CSSProperties;

/** "Open source · analytics" files under "Open source"; no category under "Projects". */
function groupOf(project: ContentProject): string {
  return project.category.split(/\s*[·/|]\s*/)[0]?.trim() || "Projects";
}

function groups(projects: readonly ContentProject[]): [string, ContentProject[]][] {
  const byGroup = new Map<string, ContentProject[]>();
  for (const project of projects) {
    const key = groupOf(project);
    byGroup.set(key, [...(byGroup.get(key) ?? []), project]);
  }
  return [...byGroup.entries()];
}

function yearOf(date: string): string {
  return /\b(?:19|20)\d{2}\b/.exec(date)?.[0] ?? "";
}

// The chip's colour comes from the name, so Ledgerly is always the same blue and Tripwise its own.
const hueOf = (name: string) => ({ "--hue": seedOf(name) % 360 }) as CSSProperties;

function Chip({
  href,
  monogram,
  name,
  children,
}: {
  href: string | null;
  monogram: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <OutLink href={href} className="chip">
      <span className="mono" style={hueOf(name)} aria-hidden>
        {monogram.slice(0, 2)}
      </span>
      {children}
    </OutLink>
  );
}

function ChipLine({ label, children }: { label: string; children: ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <>
      <span className="label">{label}</span>{" "}
      {children.map((chip, index) => (
        <span key={index}>
          {chip}
          {index < children.length - 1 ? " " : null}
        </span>
      ))}
      <br />
    </>
  );
}

type ListItem = {
  id: string;
  title: string;
  href: string | null;
  date: string;
  more: string;
  place: string;
  recording: boolean;
};

function YearList({ items }: { items: readonly ListItem[] }) {
  return (
    <ul className="list">
      {items.map((item, index) => {
        const year = yearOf(item.date);
        const showYear =
          year !== "" && (index === 0 || yearOf(items[index - 1]?.date ?? "") !== year);
        return (
          <li key={item.id}>
            {showYear ? (
              <div className="year slide-enter" style={stage(index - 2, 60)} aria-hidden>
                <span>{year}</span>
              </div>
            ) : null}
            <div className="slide-enter" style={stage(index, 60)}>
              <OutLink href={item.href} className="post">
                <span className="post-row">
                  <span className="post-title">
                    <span>{item.title}</span>
                    {item.href ? <ArrowUpRight aria-hidden /> : null}
                  </span>
                  <span className="post-meta">
                    {item.recording ? <Film aria-label="With a recording" /> : null}
                    {item.date ? <span className="when">{item.date}</span> : null}
                    {item.more ? <span className="more">· {item.more}</span> : null}
                    {item.place ? <span className="more place-sm">· {item.place}</span> : null}
                  </span>
                </span>
                {item.place ? <span className="post-place">{item.place}</span> : null}
              </OutLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProseTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const lead = content.pitch || view.headline;
  const showLead = lead !== "" && !(content.about[0] ?? "").trim().startsWith(lead.trim());
  const socials = content.socials.filter((social) => social.kind !== "email");
  const current = content.experience.filter((job) => job.current);
  const now = current.length > 0 ? current : content.experience.slice(0, 1);
  const before = content.experience.filter((job) => !now.includes(job));
  const made = content.projects.slice(0, 6);
  const grouped = groups(content.projects);
  const hasIntro =
    showLead ||
    now.length > 0 ||
    made.length > 0 ||
    content.about.length > 0 ||
    socials.length > 0 ||
    content.email !== null;

  const talks: ListItem[] = content.talks.map((talk) => ({
    id: talk.id,
    title: talk.title,
    href: talk.href ?? talk.recording ?? talk.slides,
    date: talk.date,
    more: talk.event,
    place: talk.place,
    recording: talk.recording !== null,
  }));
  const writing: ListItem[] = content.writing.map((post) => ({
    id: post.id,
    title: post.title,
    href: post.href,
    date: post.date,
    more: post.minutes ? `${post.minutes}min` : post.publisher,
    place: "",
    recording: false,
  }));

  const jobChip = (job: (typeof content.experience)[number]) => (
    <Chip href={job.website?.href ?? null} monogram={job.monogram} name={job.company || job.title}>
      {job.company || job.title}
    </Chip>
  );

  return (
    <div className="pf-prose" id="pf-prose-top">
      <TemplateStyle css={PROSE_CSS} />
      <ArtPlum />
      <header className="header">
        <a href="#pf-prose-top" className="logo" aria-label={`${name}, back to the top`}>
          <span aria-hidden>{content.initials || "·"}</span>
        </a>
        <nav className="nav" aria-label="Sections">
          <div />
          <div className="right">
            {content.projects.length > 0 ? (
              <a href="#pf-prose-projects" title="Projects">
                <span className="label">Projects</span>
                <Lightbulb className="icon-sm" aria-hidden />
              </a>
            ) : null}
            {talks.length > 0 ? (
              <a href="#pf-prose-talks" title="Talks">
                <span className="label">Talks</span>
                <Mic className="icon-sm" aria-hidden />
              </a>
            ) : null}
            {writing.length > 0 ? (
              <a href="#pf-prose-writing" title="Writing">
                <span className="label">Writing</span>
                <Newspaper className="icon-sm" aria-hidden />
              </a>
            ) : null}
            {socials.slice(0, NAV_SOCIALS).map((social) => (
              <OutLink key={social.href} href={social.href} className="wide" label={social.label}>
                <SocialIcon kind={social.kind} />
              </OutLink>
            ))}
          </div>
        </nav>
      </header>

      <div className="page">
        <div className="prose title slide-enter" style={stage(0, 50)}>
          <h1>{name}</h1>
        </div>
        {hasIntro ? (
          <article className="prose slide-enter-content">
            {showLead ? <p>{lead}</p> : null}
            {now.length > 0 || made.length > 0 ? (
              <p className="lines">
                <ChipLine label="Currently at">{now.map(jobChip)}</ChipLine>
                <ChipLine label="Previously">{before.map(jobChip)}</ChipLine>
                <ChipLine label="Projects">
                  {made.map((project) => (
                    <Chip
                      key={project.id}
                      href={project.website?.href ?? project.source?.href ?? null}
                      monogram={project.monogram}
                      name={project.name}
                    >
                      {project.name}
                    </Chip>
                  ))}
                </ChipLine>
              </p>
            ) : null}
            {content.aboutParts.map((parts, index) => (
              <p key={index}>
                <Marked parts={parts} />
              </p>
            ))}
            {socials.length > 0 || content.email ? <hr /> : null}
            {socials.length > 0 ? <p>Elsewhere on the web</p> : null}
            {socials.length > 0 ? (
              <p className="socials">
                {socials.map((social) => (
                  <OutLink key={social.href} href={social.href}>
                    <SocialIcon kind={social.kind} />
                    {social.label}
                  </OutLink>
                ))}
              </p>
            ) : null}
            {content.email ? (
              <p>
                Say hello at{" "}
                <code>
                  <a href={`mailto:${content.email}`}>{content.email}</a>
                </code>
              </p>
            ) : null}
          </article>
        ) : null}

        {grouped.length > 0 ? (
          <section className="projects" id="pf-prose-projects" aria-label="Projects">
            <div className="prose">
              <h2>Projects</h2>
            </div>
            {grouped.map(([group, projects], groupIndex) => (
              <div key={group} className="slide-enter" style={stage(groupIndex + 1)}>
                <div
                  className="group-label slide-enter"
                  style={stage(groupIndex - 2, 60)}
                  aria-hidden
                >
                  <span>{group}</span>
                </div>
                <div className="project-grid">
                  {projects.map((project) => (
                    <OutLink
                      key={project.id}
                      href={project.website?.href ?? project.source?.href ?? null}
                      className="item"
                    >
                      <span className="item-icon">
                        <span className="mono" aria-hidden>
                          {project.monogram.slice(0, 2)}
                        </span>
                      </span>
                      <span className="item-body">
                        <span className="item-name">{project.name}</span>
                        {project.line || project.description ? (
                          <span className="item-desc" style={{ display: "block" }}>
                            {project.line || project.description}
                          </span>
                        ) : null}
                      </span>
                    </OutLink>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {talks.length > 0 ? (
          <section className="prose" id="pf-prose-talks" aria-label="Talks">
            <h2>Talks</h2>
            <YearList items={talks} />
          </section>
        ) : null}

        {writing.length > 0 ? (
          <section className="prose" id="pf-prose-writing" aria-label="Writing">
            <h2>Writing</h2>
            <YearList items={writing} />
          </section>
        ) : null}

        {footer ? (
          <footer className="prose foot slide-enter" style={stage(12)}>
            <div className="credit">{footer}</div>
          </footer>
        ) : null}
      </div>
      <ToTop />
    </div>
  );
}
