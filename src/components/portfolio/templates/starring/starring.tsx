import type { CSSProperties, ReactNode } from "react";
import type { ContentProject } from "@/lib/portfolio/content";
import { featuredFirst, nameOf, OutLink, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { Stage } from "./islands";
import { STARRING_CSS } from "./styles";

// Ported from pipozzz/starring (MIT, see ./LICENSE.txt): a career told as a film, act by act.

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
];

function Star() {
  return (
    <svg className="star" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5l2.9 6.6 7.1.6-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.7l7.1-.6z"
        fill="currentColor"
      />
    </svg>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

function yearOf(text: string): string {
  return /\d{4}/.exec(text)?.[0] ?? "";
}

function longest(text: string): number {
  return Math.max(4, ...text.split(/\s+/).map((word) => word.length));
}

function visibility(project: ContentProject): { label: string; solid: boolean; private: boolean } {
  if (project.source) return { label: "Open source", solid: true, private: false };
  if (project.website) return { label: "Live", solid: false, private: false };
  return { label: "Private", solid: false, private: true };
}

function Feature({ project, index }: { project: ContentProject; index: number }) {
  const vis = visibility(project);
  const impact = project.outcome
    .split(/\s+·\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <article className={vis.private ? "project reveal vis-private" : "project reveal"}>
      <div className="project-meta mono">
        <span>{String(index + 1).padStart(2, "0")}</span>
        {project.years ? <span>{project.years}</span> : null}
        <span className={vis.solid ? "tag solid" : "tag"}>{vis.label}</span>
      </div>
      <h3 className="display project-title">{project.name}</h3>
      {project.category || project.roles.length > 0 ? (
        <p className="mono">
          {project.category ? <span className="accent">{project.category}</span> : null}
          {project.category && project.roles.length > 0 ? " · " : null}
          {project.roles.join(" · ")}
        </p>
      ) : null}
      {project.description || project.line ? (
        <p className="project-blurb">{project.description || project.line}</p>
      ) : null}
      {impact.length > 0 ? (
        <ul className="impact">
          {impact.map((item) => (
            <li key={item} className="display">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {project.tech.length > 0 ? (
        <ul className="chips">
          {project.tech.map((tech) => (
            <li key={tech} className="tag">
              {tech}
            </li>
          ))}
        </ul>
      ) : null}
      {project.website || project.source ? (
        <p className="project-links mono">
          {project.website ? (
            <OutLink href={project.website.href} className="project-link">
              See it live ↗
            </OutLink>
          ) : null}
          {project.source ? (
            <OutLink href={project.source.href} className="project-link">
              View source ↗
            </OutLink>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

type Row = {
  id: string;
  tag: string;
  title: string;
  note?: string;
  href: string | null;
  meta: string;
};

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="rows">
      {rows.map((row) => (
        <li key={row.id} className="reveal">
          <span className="tag">{row.tag}</span>
          <h3>
            {row.href ? <OutLink href={row.href}>{row.title} ↗</OutLink> : row.title}
            {row.note ? <span className="note">{row.note}</span> : null}
          </h3>
          {row.meta ? <p className="mono muted">{row.meta}</p> : <span />}
        </li>
      ))}
    </ul>
  );
}

export function StarringTemplate({ view, content, footer, resumeHref }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const [first = name, ...rest] = name.split(/\s+/);
  const headline = view.headline || content.headline;
  const aboutShown = !view.hidden.includes("about");
  const socials = content.socials.filter((social) => social.kind !== "email");
  const stats = aboutShown ? content.stats.slice(0, 4) : [];
  const quotes = aboutShown ? content.testimonials : [];
  const projects = featuredFirst(content.projects);
  const featured = projects.filter((project) => project.featured);
  const leads =
    featured.length > 0 ? featured : projects.slice(0, projects.length <= 3 ? projects.length : 2);
  const others = projects.filter((project) => !leads.includes(project));
  const github = content.github;
  const shownRepos = new Set(
    content.projects.flatMap((project) => [
      project.name.toLowerCase(),
      (project.source?.repo ?? "").toLowerCase(),
    ]),
  );
  const repos = github
    ? [...github.repos]
        .filter(
          (repo) =>
            !shownRepos.has(repo.name.toLowerCase()) &&
            !shownRepos.has(repo.fullName.toLowerCase()),
        )
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 6)
    : [];
  const weeks = github?.activity.weeks ?? [];
  const busiest = Math.max(1, ...weeks);
  const languages = github?.languages.slice(0, 4) ?? [];
  const press: Row[] = [
    ...content.talks.map((talk) => ({
      id: talk.id,
      tag: "Talk",
      title: talk.title,
      href: talk.href ?? talk.recording ?? talk.slides,
      meta: [talk.event, talk.date].filter(Boolean).join(" · "),
    })),
    ...content.writing.map((post) => ({
      id: post.id,
      tag: "Article",
      title: post.title,
      href: post.href,
      meta: [post.publisher, post.date].filter(Boolean).join(" · "),
    })),
  ];
  const bonus: Row[] = view.extras.flatMap((extra) =>
    extra.items.map((item) => ({
      id: `${extra.id}-${item.id}`,
      tag: extra.title,
      title: item.title || item.subtitle,
      note: item.detail || item.lines[0] || undefined,
      href: null,
      meta: [item.title ? item.subtitle : "", item.date].filter(Boolean).join(" · "),
    })),
  );

  const acts: { key: string; title: string; className?: string; body: ReactNode }[] = [];
  if (stats.length > 0 || github)
    acts.push({
      key: "numbers",
      title: "By the numbers",
      body: (
        <>
          {stats.length === 1 ? (
            <p className="iceberg reveal" style={{ marginTop: 0 }}>
              <span className="display accent">{stats[0]!.value}</span>
              {stats[0]!.label}
            </p>
          ) : null}
          {stats.length > 1 ? (
            <div className="stats" style={{ "--n": Math.min(stats.length, 4) } as CSSProperties}>
              {stats.map((stat) => (
                <div key={`${stat.value}-${stat.label}`} className="stat reveal">
                  <b className="display" data-count="">
                    {stat.value}
                  </b>
                  <span className="mono">{stat.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          {github ? (
            <p className="iceberg reveal">
              <span className="display accent">{compact(github.totalStars)}</span>
              stars across {github.publicRepos} public{" "}
              {github.publicRepos === 1 ? "repository" : "repositories"}, and{" "}
              {compact(github.followers)} people following along.
            </p>
          ) : null}
        </>
      ),
    });
  if (content.experience.length > 0) {
    const studios = [
      ...new Map(
        content.experience
          .filter((job) => job.company)
          .map((job) => [job.company.toLowerCase(), job] as const),
      ).values(),
    ];
    if (studios.length > 0)
      acts.push({
        key: "studios",
        title: "Studios I’ve worked with",
        className: "act-studios",
        body: (
          <>
            <div className="marquee" aria-hidden>
              <div className="marquee-track display">
                {[...studios, ...studios, ...studios, ...studios].map((job, index) => (
                  <span key={index} className="studio">
                    {job.company}
                    <Star />
                  </span>
                ))}
              </div>
            </div>
            <ul className="studio-list">
              {studios.map((job) => (
                <li key={job.id} className="reveal">
                  <span>
                    {job.website ? (
                      <OutLink href={job.website.href}>{job.company}</OutLink>
                    ) : (
                      job.company
                    )}
                  </span>
                  <span className="muted">{job.type || job.location}</span>
                  {job.current ? (
                    <span className="tag solid">Now</span>
                  ) : (
                    <span className="tag">
                      {[yearOf(job.start), yearOf(job.end)].filter(Boolean).join("–") || "Past"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        ),
      });
    acts.push({
      key: "road",
      title: "The road",
      body: (
        <>
          <ol>
            {content.experience.map((job) => {
              const from = yearOf(job.start);
              const to = job.current ? "now" : yearOf(job.end);
              return (
                <li key={job.id} className="tl-item reveal">
                  <div className="tl-year display">
                    {from || job.dates || "—"}
                    {from && to && to !== from ? <span className="muted">–{to}</span> : null}
                  </div>
                  <div className="tl-body">
                    <h3>
                      {job.title || job.company}
                      {job.title && job.company ? (
                        <span className="muted"> @ {job.company}</span>
                      ) : null}
                    </h3>
                    {job.highlight ? <p className="tl-hit">{job.highlight}</p> : null}
                    {job.summary ? <p>{job.summary}</p> : null}
                    {job.lines.length > 0 ? (
                      <ul className="tl-lines">
                        {job.lines.map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                    {job.tags.length > 0 ? (
                      <ul className="chips">
                        {job.tags.map((tag) => (
                          <li key={tag} className="tag">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ),
    });
  }
  if (projects.length > 0)
    acts.push({
      key: "work",
      title:
        view.titles.projects && view.titles.projects !== "Projects"
          ? view.titles.projects
          : "Featured work",
      body: (
        <>
          <div className="projects">
            {leads.map((project, index) => (
              <Feature key={project.id} project={project} index={index} />
            ))}
          </div>
          {others.length > 0 ? (
            <div className="more-work">
              <p className="mono accent">Also playing</p>
              <Rows
                rows={others.map((project) => ({
                  id: project.id,
                  tag: project.category.split(/\s+·\s+/)[0] || visibility(project).label,
                  title: project.name,
                  note: project.line || project.description || undefined,
                  href: project.website?.href ?? project.source?.href ?? null,
                  meta: project.years,
                }))}
              />
            </div>
          ) : null}
        </>
      ),
    });
  if (repos.length > 0 && github)
    acts.push({
      key: "catalogue",
      title: "The back catalogue",
      body: (
        <>
          <p className="oss-lede muted reveal">More of the code, out in the open.</p>
          <ul className="oss">
            {repos.map((repo) => (
              <li key={repo.fullName} className="reveal">
                <span className="oss-logo display" aria-hidden>
                  {repo.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="oss-body">
                  <p className="mono oss-repo">
                    <OutLink href={repo.url}>{repo.fullName}</OutLink>
                    {repo.stars > 0 ? (
                      <span className="muted"> ★ {compact(repo.stars)}</span>
                    ) : null}
                  </p>
                  <h3>{repo.description || repo.name}</h3>
                  {repo.language ? <p className="mono muted">{repo.language}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  if (content.milestones.length > 0 || view.certifications.length > 0)
    acts.push({
      key: "accolades",
      title: "Accolades",
      body: (
        <>
          {content.milestones.length > 0 ? (
            <ul className="awards">
              {content.milestones.map((item) => (
                <li key={item.id} className="award reveal">
                  <span className="award-mark">
                    <Star />
                  </span>
                  <h3 className="display">
                    {item.href ? <OutLink href={item.href}>{item.title}</OutLink> : item.title}
                  </h3>
                  {item.result || item.place || item.date ? (
                    <p className="mono">
                      {[item.result, item.place, item.date].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {item.detail ? <p className="muted">{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {view.certifications.length > 0 ? (
            <div className="certs">
              <p className="mono accent">{view.titles.certifications || "Certified"}</p>
              <ul>
                {view.certifications.map((cert) => (
                  <li key={cert.id} className="reveal">
                    <span className="cert-name">{cert.name}</span>
                    <span className="mono muted">
                      {[cert.issuer, cert.date].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ),
    });
  if (press.length > 0)
    acts.push({
      key: "press",
      title: "Press tour",
      body: (
        <>
          <Rows rows={press} />
        </>
      ),
    });
  if (github && (github.activity.events90d > 0 || languages.length > 0))
    acts.push({
      key: "activity",
      title: "Every commit counts",
      body: (
        <>
          {github.activity.events90d > 0 ? (
            <>
              <h3 className="display big">
                {github.activity.events90d.toLocaleString("en-US")}
                <span className="muted"> / contributions in 90 days</span>
              </h3>
              {weeks.length > 0 ? (
                <>
                  <div
                    className="heat reveal"
                    role="img"
                    aria-label={`Contributions per week over the last ${weeks.length} weeks`}
                    style={{ "--weeks": weeks.length } as CSSProperties}
                  >
                    {weeks.map((count, index) => (
                      <i
                        key={index}
                        className={
                          count > 0 ? `l${Math.max(1, Math.ceil((count / busiest) * 4))}` : ""
                        }
                      />
                    ))}
                  </div>
                  <p className="mono muted heat-note">One square a week, brightest at {busiest}</p>
                </>
              ) : null}
            </>
          ) : null}
          {languages.length > 0 ? (
            <ul className="platforms">
              {languages.map((language) => (
                <li key={language.name} className="reveal">
                  <span className="display">{language.percent}%</span>
                  <span className="mono">{language.name}</span>
                  <span className="mono muted">
                    {language.repos} {language.repos === 1 ? "repo" : "repos"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ),
    });
  if (content.education.length > 0 || view.skills.length > 0)
    acts.push({
      key: "training",
      title: "Training montage",
      body: (
        <>
          <div className="edu-skills">
            {content.education.length > 0 ? (
              <ul className="edu">
                {content.education.map((school) => (
                  <li key={school.id} className="reveal">
                    {school.dates ? <span className="mono muted">{school.dates}</span> : null}
                    <h3>
                      {school.website ? (
                        <OutLink href={school.website.href}>
                          {school.school || school.degree}
                        </OutLink>
                      ) : (
                        school.school || school.degree
                      )}
                    </h3>
                    {school.school && school.degree ? (
                      <p className="muted">{school.degree}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {view.skills.length > 0 ? (
              <div className="skills">
                {view.skills.map((group) => (
                  <div key={group.id} className="reveal">
                    <p className="mono accent">{group.label || "Skills"}</p>
                    <p className="skill-items">{group.items.join(" / ")}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ),
    });
  if (bonus.length > 0)
    acts.push({
      key: "bonus",
      title: "Bonus features",
      body: (
        <>
          <Rows rows={bonus} />
        </>
      ),
    });
  if (content.interests.length > 0)
    acts.push({
      key: "offscreen",
      title: "Behind the scenes",
      body: (
        <>
          <ul className="interests">
            {content.interests.map((item) => (
              <li key={item.id} className="reveal">
                <span className="display interest-name">{item.title}</span>
                {item.line || item.stat ? (
                  <span className="muted">
                    {[item.stat, item.line].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ),
    });
  if (quotes.length > 0)
    acts.push({
      key: "critics",
      title: "The critics",
      body: (
        <>
          <div className="quotes">
            {quotes.map((quote) => (
              <figure key={quote.id} className="quote reveal">
                <span className="quote-mark display accent" aria-hidden>
                  “
                </span>
                <blockquote>{quote.quote}</blockquote>
                <figcaption className="mono">
                  — {quote.href ? <OutLink href={quote.href}>{quote.name}</OutLink> : quote.name}
                  {quote.role ? <span className="muted">, {quote.role}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      ),
    });
  if (content.now && content.now.items.length > 0) {
    const now = content.now;
    acts.push({
      key: "soon",
      title: "Coming soon",
      body: (
        <>
          <ul className="soon">
            {now.items.map((item, index) => (
              <li key={index} className="reveal">
                {item.label ? <span className="mono accent">{item.label}</span> : null}
                <span className="what">{item.text}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  return (
    <div className="pf-starring" id="pf-starring-top">
      <TemplateStyle css={STARRING_CSS} />
      <div className="progress" aria-hidden />
      <Stage />
      <header className="hero">
        <div className="hero-top mono">
          <span className="accent">Now starring</span>
          {content.location ? <span>{content.location.label}</span> : null}
          {content.availability?.open ? (
            <span className="tag solid">{content.availability.short || "Available for work"}</span>
          ) : null}
          {resumeHref ? <a href={resumeHref}>Resume ↓</a> : null}
        </div>
        <div className="hero-main">
          <h1 className="display hero-name" style={{ "--chars": longest(name) } as CSSProperties}>
            <span className="line">{first}</span>
            {rest.length > 0 ? <span className="line accent">{rest.join(" ")}</span> : null}
          </h1>
        </div>
        <div className="hero-bottom">
          {headline ? <p className="hero-role">{headline}</p> : <span />}
          {content.pitch ? <p className="muted hero-tag">{content.pitch}</p> : <span />}
          {acts.length > 0 ? (
            <span className="mono scroll-cue">Scroll — the show starts ↓</span>
          ) : null}
        </div>
      </header>

      {acts.map((item, index) => (
        <section
          key={item.key}
          className={`act ${item.className ?? ""}`.trim()}
          id={`pf-starring-${item.key}`}
        >
          <h2 className="act-label mono">
            <span className="num">Act {ROMAN[index] ?? index + 1}</span>
            <span>{item.title}</span>
          </h2>
          {item.body}
        </section>
      ))}

      <footer className="credits">
        <p className="mono muted">That’s a wrap</p>
        <h2 className="display" style={{ "--chars": longest(name) } as CSSProperties}>
          Starring
          <br />
          <span className="accent">{name}</span>
        </h2>
        {socials.length > 0 || content.email || resumeHref ? (
          <ul className="mono">
            {socials.map((social) => (
              <li key={social.href}>
                <OutLink href={social.href}>{social.label} ↗</OutLink>
              </li>
            ))}
            {content.email ? (
              <li>
                <a href={`mailto:${content.email}`}>Email ↗</a>
              </li>
            ) : null}
            {resumeHref ? (
              <li>
                <a href={resumeHref}>Resume ↓</a>
              </li>
            ) : null}
          </ul>
        ) : null}
        {content.availability?.text ? (
          <p className="mono muted">{content.availability.text}</p>
        ) : null}
        {footer ? <div className="credit">{footer}</div> : null}
      </footer>
    </div>
  );
}
