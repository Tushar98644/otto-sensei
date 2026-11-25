import {
  BadgeCheck,
  FileText,
  FolderGit2,
  GraduationCap,
  Mic,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { fmt } from "@/i18n/format";
import type { ContentProject, ContentRole } from "@/lib/portfolio/content";
import { lowerFor } from "../../i18n";
import {
  allSkills,
  designFormat,
  designLocale,
  Marked,
  nameOf,
  OutLink,
  safeId,
  TemplateStyle,
} from "../parts";
import type { DesignWords, PortfolioTemplateProps } from "../types";
import type { WinId } from "./islands";
import {
  AppMenu,
  Clock,
  DeskProvider,
  Dock,
  FocusedTitle,
  Launch,
  MenuLinks,
  Picker,
  Typed,
  Win,
} from "./on-demand";
import { RETRO_CSS } from "./styles";

// Ported from mirkoschubert/retro-os (MIT, see ./LICENSE.txt): a fictional retro workstation, no brand art.

type Words = DesignWords["retro"];

const DOCK = ["projects", "work", "archive", "sysinfo", "console"] as const;
// Code on the desk's console and paths, read the same in every language.
const WORKSPACE = "~/workspace";
const PROMPT = "~/$";

function isoDate(at: number): string {
  return at > Date.UTC(2000, 0, 1) ? new Date(at).toISOString().slice(0, 10) : "";
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

function ProjectRow({ project }: { project: ContentProject }) {
  return (
    <>
      <span className="sq" data-kind={project.source ? "a" : "b"} aria-hidden />
      <span className="name">{project.name}</span>
      {project.years ? <span className="meta">{project.years.split(/\s/)[0]}</span> : null}
    </>
  );
}

function ProjectPane({ project, t }: { project: ContentProject; t: Words }) {
  const links = [
    project.website ? { href: project.website.href, label: project.website.text } : null,
    project.source ? { href: project.source.href, label: project.source.repo ?? t.source } : null,
  ].filter((link) => link !== null);
  const kicker = [project.category, project.years].filter(Boolean).join(" · ");
  const lede = project.description || project.line;
  const facts: { term: string; body: ReactNode; className?: string }[] = [];
  if (project.roles.length > 0) facts.push({ term: t.facts.role, body: project.roles.join(", ") });
  if (project.tech.length > 0)
    facts.push({ term: t.facts.stack, body: project.tech.join(" · "), className: "mono" });
  if (project.outcome) facts.push({ term: t.facts.result, body: project.outcome });
  else if (project.stars) facts.push({ term: t.facts.stars, body: `★ ${compact(project.stars)}` });
  if (links.length > 0)
    facts.push({
      term: t.facts.links,
      className: "links",
      body: links.map((link) => (
        <OutLink key={link.href} href={link.href}>
          ↗ {link.label}
        </OutLink>
      )),
    });
  return (
    <div className="detail">
      {kicker || project.source ? (
        <p className="detail-kicker">
          {kicker}
          {project.source ? <span className="os">{t.openSource}</span> : null}
        </p>
      ) : null}
      <h3 className="h-display">{project.name}</h3>
      {lede ? <p className="lede">{lede}</p> : null}
      <div className="ph" aria-hidden>
        <span className="mark">{project.monogram}</span>
        <span className="ph-cap">{fmt(t.cover, { name: safeId("p", project.name).slice(2) })}</span>
        {project.years ? <span className="ph-tag">{project.years}</span> : null}
      </div>
      {facts.length > 0 ? (
        <dl className="facts">
          {facts.map((fact) => (
            <Fragment key={fact.term}>
              <dt>{fact.term}</dt>
              <dd className={fact.className}>{fact.body}</dd>
            </Fragment>
          ))}
        </dl>
      ) : null}
      {project.details.length > 0 || (project.lines.length > 0 && project.lines[0] !== lede) ? (
        <div className="notes">
          {project.details.length > 0 ? (
            project.details.map((text, index) => <p key={index}>{text}</p>)
          ) : (
            <ul>
              {project.lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProjectCard({ project }: { project: ContentProject }) {
  return (
    <>
      <span className="ph" aria-hidden>
        <span className="mark">{project.monogram}</span>
        {project.years ? <span className="ph-tag">{project.years.split(/\s/)[0]}</span> : null}
      </span>
      <span className="card-body">
        <span className="card-name">{project.name}</span>
        {project.category ? <span className="card-sub">{project.category}</span> : null}
      </span>
    </>
  );
}

function JobRow({ job, now }: { job: ContentRole; now: string }) {
  return (
    <>
      <span className="pub-meta">
        {job.dates ? <span>{job.dates}</span> : null}
        {job.current ? <span className="pub-badge">{now}</span> : null}
      </span>
      <span className="pub-name">{job.company || job.title}</span>
      {job.company && job.title ? <span className="pub-desc">{job.title}</span> : null}
    </>
  );
}

function JobPane({ job, t }: { job: ContentRole; t: Words }) {
  return (
    <div className="detail">
      <h3 className="h-display">{job.company || job.title}</h3>
      {(job.company && job.title) || job.type || job.dates || job.location ? (
        <div className="chips">
          {job.company && job.title ? <span className="chip">{job.title}</span> : null}
          {job.type ? <span className="chip ghost">{job.type}</span> : null}
          {job.dates ? <span className="chip ghost">{job.dates}</span> : null}
          {job.location ? <span className="chip ghost">{job.location}</span> : null}
        </div>
      ) : null}
      {job.highlight ? <p className="highlight">{job.highlight}</p> : null}
      {job.summary ? <p className="lede">{job.summary}</p> : null}
      {job.lines.length > 0 ? (
        <div className="notes">
          <ul>
            {job.lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {job.tags.length > 0 || job.website ? (
        <dl className="facts" style={{ marginTop: 18 }}>
          {job.tags.length > 0 ? (
            <>
              <dt>{t.facts.stack}</dt>
              <dd className="mono">{job.tags.join(" · ")}</dd>
            </>
          ) : null}
          {job.website ? (
            <>
              <dt>{t.facts.site}</dt>
              <dd className="links">
                <OutLink href={job.website.href}>↗ {job.website.text}</OutLink>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

type File = {
  id: string;
  name: string;
  sub?: string;
  href: string | null;
  kind: string;
  where: string;
  date: string;
};
type Folder = { id: string; label: string; icon: LucideIcon; files: File[] };

function Files({ folder, columns }: { folder: Folder; columns: Words["columns"] }) {
  const Icon = folder.icon;
  return (
    <div className="group">
      <h3 className="section-label">{folder.label}</h3>
      <table className="files">
        <colgroup>
          <col />
          <col className="col-kind" />
          <col className="col-where" />
          <col className="col-date" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{columns.name}</th>
            <th scope="col" className="kind">
              {columns.kind}
            </th>
            <th scope="col" className="where">
              {columns.where}
            </th>
            <th scope="col" className="date">
              {columns.date}
            </th>
          </tr>
        </thead>
        <tbody>
          {folder.files.map((file) => (
            <tr key={file.id}>
              <td className="file">
                <span className="file-in">
                  <Icon aria-hidden />
                  <span>
                    {file.href ? <OutLink href={file.href}>{file.name}</OutLink> : file.name}
                    {file.sub ? <span className="sub">{file.sub}</span> : null}
                  </span>
                </span>
              </td>
              <td className="kind">{file.kind}</td>
              <td className="where">{file.where}</td>
              <td className="date">{file.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RetroTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.retro;
  const format = designFormat(view);
  const TITLES = t.titles;
  const MENU: Partial<Record<WinId, string>> = t.menu;
  const name = nameOf(view, words.shared.untitled);
  const first = content.first || name.split(" ")[0] || name;
  const app = `${first.length <= 10 ? first : content.initials || "Retro"}OS`;
  const date = isoDate(view.updatedAt);
  const headline = view.headline || content.headline;
  const roles = content.disciplines.length > 0 ? content.disciplines : headline ? [headline] : [];
  const aboutShown = !view.hidden.includes("about");
  const pitch = content.pitch || (aboutShown ? content.intro : "");
  const socials = content.socials.filter((social) => social.kind !== "email");
  const skills = allSkills(view);
  const stats = aboutShown ? content.stats.slice(0, 4) : [];
  const quotes = aboutShown ? content.testimonials : [];
  const projects = [
    ...content.projects.filter((project) => project.featured),
    ...content.projects.filter((project) => !project.featured),
  ];
  const timezone = content.location?.timezone ?? null;
  const repos = content.github
    ? [...content.github.repos].sort((a, b) => b.stars - a.stars).slice(0, 6)
    : [];

  const folders: Folder[] = [];
  if (content.writing.length > 0)
    folders.push({
      id: "writing",
      label: t.folders.writing,
      icon: FileText,
      files: content.writing.map((post) => ({
        id: post.id,
        name: post.title,
        href: post.href,
        kind: post.minutes ? fmt(t.kinds.minutes, { minutes: post.minutes }) : t.kinds.post,
        where: post.publisher,
        date: post.date,
      })),
    });
  if (content.talks.length > 0)
    folders.push({
      id: "talks",
      label: t.folders.talks,
      icon: Mic,
      files: content.talks.map((talk) => ({
        id: talk.id,
        name: talk.title,
        href: talk.href ?? talk.recording ?? talk.slides,
        kind: talk.recording ? t.kinds.recording : talk.slides ? t.kinds.slides : t.kinds.talk,
        where: [talk.event, talk.place].filter(Boolean).join(", "),
        date: talk.date,
      })),
    });
  if (content.milestones.length > 0)
    folders.push({
      id: "milestones",
      label: t.folders.milestones,
      icon: Trophy,
      files: content.milestones.map((item) => ({
        id: item.id,
        name: item.title,
        sub: item.detail && item.detail !== item.result ? item.detail : undefined,
        href: item.href,
        kind: t.kinds.milestones[item.kind],
        where: [item.result, item.place].filter(Boolean).join(", "),
        date: item.date,
      })),
    });
  if (content.education.length > 0)
    folders.push({
      id: "education",
      label: `~/${(view.titles.education || t.folders.education).toLowerCase()}`,
      icon: GraduationCap,
      files: content.education.map((school) => ({
        id: school.id,
        name: school.school || school.degree,
        sub: [school.school ? school.degree : "", ...school.lines].filter(Boolean).join(" · "),
        href: school.website?.href ?? null,
        kind: t.kinds.school,
        where: "",
        date: school.dates,
      })),
    });
  if (view.certifications.length > 0)
    folders.push({
      id: "certifications",
      label: `~/${(view.titles.certifications || t.folders.certifications).toLowerCase()}`,
      icon: BadgeCheck,
      files: view.certifications.map((cert) => ({
        id: cert.id,
        name: cert.name,
        href: null,
        kind: t.kinds.cert,
        where: cert.issuer,
        date: cert.date,
      })),
    });
  for (const extra of view.extras) {
    if (extra.items.length === 0) continue;
    folders.push({
      id: extra.id,
      label: `~/${extra.title.toLowerCase()}`,
      icon: FileText,
      files: extra.items.map((item) => ({
        id: item.id,
        name: item.title || item.subtitle,
        sub: item.detail || item.lines[0] || undefined,
        href: null,
        kind: t.kinds.file,
        where: item.title ? item.subtitle : "",
        date: item.date,
      })),
    });
  }
  if (repos.length > 0)
    folders.push({
      id: "github",
      label: "~/github",
      icon: FolderGit2,
      files: repos.map((repo) => ({
        id: repo.fullName,
        name: repo.name,
        sub: repo.description || undefined,
        href: repo.url,
        kind: repo.language || t.kinds.repo,
        where: repo.stars > 0 ? `★ ${compact(repo.stars)}` : "",
        date: repo.pushedAt.slice(0, 10),
      })),
    });
  const fileCount = folders.reduce((sum, folder) => sum + folder.files.length, 0);

  const ids: WinId[] = [
    "welcome",
    "sysinfo",
    ...(content.experience.length > 0 ? (["work"] as const) : []),
    ...(projects.length > 0 ? (["projects"] as const) : []),
    ...(folders.length > 0 ? (["archive"] as const) : []),
    "console",
  ];
  const keyOf = (id: WinId) => String(ids.indexOf(id) + 1);
  const programs = ids.filter((id) => id !== "welcome");
  const titles = Object.fromEntries(ids.map((id) => [id, TITLES[id]]));

  const filters = [
    { id: "all", label: t.filters.all },
    ...(projects.some((project) => project.featured) &&
    projects.some((project) => !project.featured)
      ? [{ id: "featured", label: t.filters.featured }]
      : []),
    ...(projects.some((project) => project.source) && projects.some((project) => !project.source)
      ? [{ id: "open", label: t.filters.open }]
      : []),
  ];
  const workLabel = view.titles.experience || t.work;
  const projectsLabel = view.titles.projects || t.projects;

  const boot = [
    projects.length > 0 ? format.plural(t.boot.projects, projects.length) : null,
    content.experience.length > 0 ? format.plural(t.boot.work, content.experience.length) : null,
    fileCount > 0 ? format.plural(t.boot.archive, fileCount) : null,
    skills.length > 0 ? format.plural(t.boot.skills, skills.length) : null,
    t.boot.ready,
  ].filter((line) => line !== null);

  const now = content.now;
  const lines: { kind: "sys" | "in" | "out" | "gap"; body: ReactNode }[] = [
    { kind: "sys", body: fmt(t.console.build, { app, build: date.replaceAll("-", ".") || "1.0" }) },
    { kind: "sys", body: t.console.restored },
    { kind: "gap", body: null },
    { kind: "in", body: "~/$ whoami" },
    {
      kind: "out",
      body: [name, headline, content.location?.label].filter(Boolean).join(" — "),
    },
  ];
  if (socials.length > 0) {
    lines.push({ kind: "in", body: "~/$ ls ~/links" });
    lines.push({
      kind: "out",
      body: (
        <span className="links">
          {socials.map((social) => (
            <OutLink key={social.href} href={social.href}>
              {social.handle || social.label}
            </OutLink>
          ))}
        </span>
      ),
    });
  }
  if (content.email) {
    lines.push({ kind: "in", body: "~/$ mail" });
    lines.push({
      kind: "out",
      body: <a href={`mailto:${content.email}`}>{content.email}</a>,
    });
  }
  if (resumeHref) {
    lines.push({ kind: "in", body: "~/$ open resume.pdf" });
    lines.push({ kind: "out", body: <a href={resumeHref}>{t.resume}</a> });
  }
  if (now && now.items.length > 0) {
    lines.push({ kind: "in", body: "~/$ cat now.txt" });
    for (const item of now.items)
      lines.push({ kind: "out", body: item.label ? `${item.label}: ${item.text}` : item.text });
  }
  if (content.availability?.text) {
    lines.push({ kind: "in", body: "~/$ status" });
    lines.push({ kind: "out", body: content.availability.text });
  }

  return (
    <div className="pf-retro" data-era="workbench" id="pf-retro-top">
      <TemplateStyle css={RETRO_CSS} />
      <DeskProvider ids={ids} words={t.desk}>
        <header className="menubar">
          <span className="menubar-logo" aria-hidden>
            <span className="logo-mark" />
          </span>
          <AppMenu name={app} />
          <MenuLinks items={programs.map((id) => ({ id, label: MENU[id] ?? TITLES[id] }))} />
          <span className="menu-spacer" />
          <div className="menu-status">
            <FocusedTitle titles={titles} />
            {content.availability?.open ? (
              <span className="pill avail-pill">
                <i className="dot" aria-hidden />
                {content.availability.short}
              </span>
            ) : null}
            {resumeHref ? (
              <a className="pill" href={resumeHref}>
                {t.resume}
              </a>
            ) : null}
            {timezone ? <Clock timezone={timezone} locale={designLocale(view)} /> : null}
          </div>
        </header>

        <div className="desktop">
          <div className="band">
            <div className="col">
              <Win id="welcome" title={TITLES.welcome} plain>
                <div className="welcome">
                  <p className="kicker">
                    {WORKSPACE}
                    {date ? ` · ${date}` : ""}
                  </p>
                  <h1 className="h-display">{name}</h1>
                  {roles.length > 0 ? (
                    <p className="role">{roles.slice(0, 3).join(" · ")}</p>
                  ) : null}
                  {pitch ? (
                    <div className="copy">
                      <p>{pitch}</p>
                    </div>
                  ) : null}
                  <div className="launcher">
                    {programs.map((id) => (
                      <Launch key={id} id={id} label={TITLES[id]} keyHint={keyOf(id)} />
                    ))}
                  </div>
                  {content.availability?.text || content.email ? (
                    <p className="avail">
                      {content.availability?.text
                        ? fmt(t.status, { status: content.availability.text })
                        : null}
                      {content.availability?.text && content.email ? " · " : null}
                      {content.email ? (
                        <a href={`mailto:${content.email}`}>{content.email}</a>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </Win>

              {content.experience.length > 0 ? (
                <Win id="work" title={TITLES.work} className="work">
                  <Picker
                    label={workLabel}
                    searchLabel={fmt(t.search, { label: lowerFor(format, workLabel) })}
                    prefix="pf-retro-work"
                    rowClass="pub-row"
                    items={content.experience.map((job) => ({
                      id: job.id,
                      text: `${job.company} ${job.title}`.toLowerCase(),
                      tags: [],
                    }))}
                    rows={content.experience.map((job) => (
                      <JobRow key={job.id} job={job} now={t.now} />
                    ))}
                    panes={content.experience.map((job) => (
                      <JobPane key={job.id} job={job} t={t} />
                    ))}
                  />
                </Win>
              ) : null}
            </div>
            <div className="col">
              <Win id="sysinfo" title={TITLES.sysinfo}>
                <div className="sysinfo">
                  <div className="si-head">
                    <div className="portrait" aria-hidden>
                      <span className="initials">{content.initials || name.slice(0, 1)}</span>
                      <span className="ph-cap">{t.sysinfo.portrait}</span>
                    </div>
                    <div className="identity">
                      <p className="si-name">{name}</p>
                      {roles.length > 0 ? <p className="si-role">{roles.join(" · ")}</p> : null}
                      {content.aboutParts.length > 0 ? (
                        <div className="si-bio">
                          {content.aboutParts.map((parts, index) => (
                            <p key={index}>
                              <Marked parts={parts} />
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {content.availability ||
                      content.location ||
                      content.email ||
                      socials.length > 0 ? (
                        <dl className="meta-grid">
                          {content.availability ? (
                            <>
                              <dt>{t.sysinfo.available}</dt>
                              <dd>{content.availability.text || content.availability.short}</dd>
                            </>
                          ) : null}
                          {content.location ? (
                            <>
                              <dt>{t.sysinfo.location}</dt>
                              <dd>{content.location.label}</dd>
                            </>
                          ) : null}
                          {content.email ? (
                            <>
                              <dt>{t.sysinfo.contact}</dt>
                              <dd>
                                <a href={`mailto:${content.email}`}>{content.email}</a>
                              </dd>
                            </>
                          ) : null}
                          {socials.length > 0 ? (
                            <>
                              <dt>{t.sysinfo.links}</dt>
                              <dd className="links">
                                {socials.map((social) => (
                                  <OutLink key={social.href} href={social.href}>
                                    {social.label}
                                  </OutLink>
                                ))}
                              </dd>
                            </>
                          ) : null}
                        </dl>
                      ) : null}
                    </div>
                  </div>
                  {now || skills.length > 0 ? <div className="divider" /> : null}
                  {now ? (
                    <div className="si-section">
                      <p className="si-label">{t.sysinfo.now}</p>
                      <ul className="body now">
                        {now.items.map((item, index) => (
                          <li key={index}>
                            {item.label ? <b>{item.label}: </b> : null}
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {view.skills.length > 0 ? (
                    <div className="si-section">
                      {view.skills.map((group) => (
                        <div key={group.id} className="stack-row">
                          <p className="si-label">{group.label || t.sysinfo.stack}</p>
                          <ul className="tags">
                            {group.items.map((item) => (
                              <li key={item} className="tag">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {stats.length > 0 ? (
                    <>
                      <div className="divider" />
                      <div className="stats" data-n={stats.length}>
                        {stats.map((stat) => (
                          <div key={`${stat.value}-${stat.label}`} className="stat">
                            <b>{stat.value}</b>
                            <span>{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {quotes.length > 0 ? (
                    <>
                      <div className="divider" />
                      <p className="si-label">{t.sysinfo.kindWords}</p>
                      <div className="quotes">
                        {quotes.map((quote) => (
                          <blockquote key={quote.id} className="quote">
                            <p>{quote.quote}</p>
                            <footer>
                              {quote.href ? (
                                <OutLink href={quote.href}>{quote.name}</OutLink>
                              ) : (
                                quote.name
                              )}
                              {quote.role ? `, ${quote.role}` : null}
                            </footer>
                          </blockquote>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <div className="divider" />
                  <p className="si-foot">
                    {app} 1.0 ·{" "}
                    {skills.length > 0 ? `${format.plural(t.foot.skills, skills.length)} · ` : ""}
                    {date ? fmt(t.foot.build, { build: date.replaceAll("-", ".") }) : t.foot.first}
                  </p>
                </div>
              </Win>
            </div>
          </div>
          {projects.length > 0 ? (
            <Win id="projects" title={TITLES.projects}>
              <Picker
                label={projectsLabel}
                searchLabel={fmt(t.search, { label: lowerFor(format, projectsLabel) })}
                prefix="pf-retro-projects"
                rowClass="list-row"
                search={projects.length > 4}
                filters={filters}
                items={projects.map((project) => ({
                  id: project.id,
                  text: [project.name, project.category, project.line, ...project.tech]
                    .join(" ")
                    .toLowerCase(),
                  tags: [
                    ...(project.featured ? ["featured"] : []),
                    ...(project.source ? ["open"] : []),
                  ],
                }))}
                rows={projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
                panes={projects.map((project) => (
                  <ProjectPane key={project.id} project={project} t={t} />
                ))}
                cards={
                  projects.length > 2
                    ? projects.map((project) => <ProjectCard key={project.id} project={project} />)
                    : undefined
                }
              />
            </Win>
          ) : null}

          {folders.length > 0 ? (
            <Win id="archive" title={TITLES.archive}>
              <div className="toolbar">
                <span>/</span>
                <span style={{ color: "var(--text-1)" }}>{`~ /${t.archiveFolder}`}</span>
                <span className="tb-grow" />
                <span>{format.plural(t.items, fileCount)}</span>
              </div>
              <div className="archive">
                {folders.map((folder) => (
                  <Files key={folder.id} folder={folder} columns={t.columns} />
                ))}
              </div>
            </Win>
          ) : null}

          <Win id="console" title={TITLES.console}>
            <Typed>
              {lines.map((line, index) =>
                line.kind === "gap" ? (
                  <div key={index} className="gap" />
                ) : (
                  <p key={index} className={line.kind} style={{ "--i": index } as CSSProperties}>
                    {line.body}
                  </p>
                ),
              )}
              <p className="in" style={{ "--i": lines.length } as CSSProperties}>
                {PROMPT}
                <span className="cursor" aria-hidden />
              </p>
            </Typed>
          </Win>
        </div>

        {footer ? <div className="credit">{footer}</div> : null}

        <Dock
          items={DOCK.filter((id) => ids.includes(id)).map((id) => ({ id, label: TITLES[id] }))}
        />
      </DeskProvider>

      <div className="boot" aria-hidden>
        <div className="boot-in">
          <div className="boot-mark" />
          <div>
            <p className="boot-title">{app}</p>
            <p className="boot-version">{headline || words.shared.untitled}</p>
          </div>
          <div className="boot-log">
            {boot.map((line, index) => (
              <div key={line} style={{ "--i": index } as CSSProperties}>
                <span className="ok">●</span> {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
