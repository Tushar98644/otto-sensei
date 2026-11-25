import type { CSSProperties, ReactNode } from "react";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import type { ContentProject, ContentRole } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { featuredFirst, nameOf, OutLink, TemplateStyle } from "../parts";
import { RevealOnScroll } from "../reveal";
import type { PortfolioTemplateProps } from "../types";
import {
  banner,
  canBanner,
  CELL_W,
  globe,
  GLOBE_COLS,
  GLOBE_ROWS,
  GLOBE_SCREEN,
  screenLine,
} from "./ascii";
import type { ShellLinks } from "./islands";
import { Run, Shell } from "./on-demand";
import { Ps1 } from "./prompt";
import { TERMINAL_CSS } from "./styles";

// Ported from Cveinnt/LiveTerm (MIT, see ./LICENSE.txt).

const BANNER_MAX = 14;
const SHADE = "pf-terminal-shade";
const DENSE = "pf-terminal-dense";

function hostOf(first: string): string {
  const host = first
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return host || "portfolio";
}

function Banner({ text }: { text: string }) {
  const art = banner(text);
  return (
    <svg
      className="banner"
      viewBox={`0 0 ${(art.width * CELL_W).toFixed(1)} ${art.height}`}
      style={{ "--cols": art.width } as CSSProperties}
      preserveAspectRatio="xMinYMin meet"
      aria-hidden
    >
      <path d={art.shade} fill={`url(#${SHADE})`} />
      <path d={art.full} className="fill" />
    </svg>
  );
}

// Shared by every banner and globe, and outside the transcript so "clear" can't hide them.
function Patterns() {
  return (
    <svg className="defs" width="0" height="0" aria-hidden>
      <defs>
        <pattern id={SHADE} width="0.3" height="0.25" patternUnits="userSpaceOnUse">
          <rect width="0.15" height="0.125" className="shade-dot" />
        </pattern>
        <pattern id={DENSE} width="0.3" height="0.25" patternUnits="userSpaceOnUse">
          <rect width="0.23" height="0.19" className="dense-dot" />
        </pattern>
      </defs>
    </svg>
  );
}

function Globe({ name }: { name: string }) {
  const art = globe();
  const line = screenLine(name);
  return (
    <svg className="globe" viewBox={`0 0 ${GLOBE_COLS * CELL_W} ${GLOBE_ROWS}`} aria-hidden>
      <path d={art.dense} fill={`url(#${DENSE})`} />
      <path d={art.full} className="fill" />
      <text
        x={(GLOBE_SCREEN.from + GLOBE_SCREEN.cols / 2) * CELL_W}
        y={GLOBE_SCREEN.row + 0.8}
        fontSize={1}
        textAnchor="middle"
        className="screen"
      >
        {line}
      </text>
    </svg>
  );
}

function Entry({
  host,
  user,
  command,
  children,
}: {
  host: string;
  user: string;
  command: string;
  children: ReactNode;
}) {
  return (
    <div
      className="entry"
      data-reveal
      style={{ "--n": Math.max(1, command.length) } as CSSProperties}
    >
      <p className="line">
        <Ps1 host={host} user={user} />
        <span className="cmd">{command}</span>
      </p>
      <div className="out">{children}</div>
    </div>
  );
}

function Job({ job }: { job: ContentRole }) {
  return (
    <div className="item">
      <p>
        <span className="yellow">{job.title || job.company}</span>
        {job.title && job.company ? (
          <>
            <span className="gray"> @ </span>
            {job.website ? (
              <OutLink href={job.website.href} className="green link">
                {job.company}
              </OutLink>
            ) : (
              <span className="green">{job.company}</span>
            )}
          </>
        ) : null}
        {job.dates ? <span className="gray right">{job.dates}</span> : null}
      </p>
      {job.location || job.highlight ? (
        <p className="gray">
          {"  "}
          {[job.location, job.highlight].filter(Boolean).join("  ·  ")}
        </p>
      ) : null}
      {job.summary ? <p className="indent">{job.summary}</p> : null}
      {job.lines.map((line, i) => (
        <p key={i} className="bullet">
          {line}
        </p>
      ))}
    </div>
  );
}

function Project({ project, stack }: { project: ContentProject; stack: string }) {
  const meta = [project.category, project.years].filter(Boolean).join("  ·  ");
  const text = project.description || project.line || project.lines[0] || "";
  return (
    <div className="item">
      <p>
        <span className="yellow">{project.name}</span>
        {meta ? <span className="gray">{`  [${meta}]`}</span> : null}
        {project.stars ? <span className="gray right">★ {project.stars}</span> : null}
      </p>
      {text ? <p className="indent">{text}</p> : null}
      {project.outcome ? <p className="indent green">{project.outcome}</p> : null}
      {project.tech.length > 0 ? (
        <p className="indent">
          <span className="gray">{stack} </span>
          {project.tech.join(", ")}
        </p>
      ) : null}
      {project.website || project.source ? (
        <p className="indent">
          {project.website ? (
            <>
              <span className="gray">-&gt; </span>
              <OutLink href={project.website.href} className="link">
                {project.website.text}
              </OutLink>
            </>
          ) : null}
          {project.website && project.source ? "   " : null}
          {project.source ? (
            <>
              <span className="gray">-&gt; </span>
              <OutLink href={project.source.href} className="link">
                {project.source.text}
              </OutLink>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function TerminalTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.terminal;
  const name = nameOf(view, words.shared.untitled);
  const first = content.first || name;
  const host = hostOf(first);
  const headline = content.headline || view.headline;
  const art = [name, first].find((text) => text.length <= BANNER_MAX && canBanner(text));
  const socials = content.socials.filter((social) => social.kind !== "email");
  const projects = featuredFirst(content.projects);
  const label = (text: string) =>
    text.padEnd(Math.max(...content.skills.map((g) => g.label.length), 6) + 2);

  // A command inside a sentence: the visitor clicks it, or types it as written.
  const run = (template: string, command: string, link?: (chunk: string) => ReactNode) =>
    rich(
      template,
      {
        link: (chunk, index) =>
          index === 0 ? <Run command={command} /> : link ? link(chunk) : chunk,
      },
      { command },
    );

  const outputs: Record<string, ReactNode> = {};
  outputs.banner = (
    <>
      {art ? <Banner text={art} /> : <p className="big-name">{name}</p>}
      {"\n"}
      {run(t.banner.help, "help")}
      {"\n"}
      {run(t.banner.summary, "sumfetch")}
      {resumeHref ? (
        <>
          {"\n"}
          {run(t.banner.resume, "resume", (chunk) => (
            <a className="link" href={resumeHref}>
              {chunk}
            </a>
          ))}
        </>
      ) : null}
    </>
  );

  const status = content.availability
    ? content.availability.short || content.availability.text
    : "";
  // The now list belongs to About and hides with it.
  const now = view.hidden.includes("about") ? [] : (content.now?.items ?? []);
  outputs.sumfetch = (
    <div className="fetch">
      <Globe name={first} />
      <div className="fetch-info">
        <p>
          {rich(
            t.fetch.title,
            { b: (chunk) => <span className="yellow">{chunk}</span> },
            { command: "sumfetch" },
          )}
        </p>
        <p className="gray">-----------</p>
        <p className="head">{t.fetch.about}</p>
        <p>{name}</p>
        {headline ? <p className="green">{headline}</p> : null}
        {content.location?.label || view.location ? (
          <p>{content.location?.label || view.location}</p>
        ) : null}
        {resumeHref ? (
          <p>
            <a className="link" href={resumeHref}>
              {t.fetch.resume}
            </a>
          </p>
        ) : null}
        {content.email || socials.length > 0 ? (
          <>
            <p className="gray">-----------</p>
            <p className="head">{t.fetch.contact}</p>
            {content.email ? (
              <p>
                <a className="link" href={`mailto:${content.email}`}>
                  {content.email}
                </a>
              </p>
            ) : null}
            {socials.map((social) => (
              <p key={social.href} className="with-icon">
                <SocialIcon kind={social.kind} className="icon" />
                <OutLink href={social.href} className="link">
                  {social.handle || social.label}
                </OutLink>
              </p>
            ))}
          </>
        ) : null}
        {status || now.length > 0 ? (
          <>
            <p className="gray">-----------</p>
            <p className="head">{status ? t.fetch.status : t.fetch.now}</p>
            {status ? <p className="green">{status}</p> : null}
            {now.slice(0, 3).map((item) => (
              <p key={item.label}>
                <span className="gray">{item.label.toLowerCase()}: </span>
                {item.text}
              </p>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );

  outputs.about = (
    <>
      {fmt(t.about.hello, { name })}
      {headline ? ` ${headline}.` : ""}
      {content.about.map((paragraph, i) => (
        <span key={i}>
          {"\n\n"}
          {paragraph}
        </span>
      ))}
      {"\n\n"}
      {t.about.more}
      {"\n"}
      {run(t.about.summary, "sumfetch")}
      {content.experience.length > 0 ? (
        <>
          {"\n"}
          {run(t.about.work, "work")}
        </>
      ) : null}
      {projects.length > 0 ? (
        <>
          {"\n"}
          {run(t.about.projects, "projects")}
        </>
      ) : null}
    </>
  );

  if (content.experience.length > 0)
    outputs.work = content.experience.map((job) => <Job key={job.id} job={job} />);
  if (projects.length > 0)
    outputs.projects = projects.map((project) => (
      <Project key={project.id} project={project} stack={t.stack} />
    ));
  if (content.skills.length > 0)
    outputs.skills = content.skills.map((group) => (
      <p key={group.id}>
        <span className="yellow">{label(group.label || t.skills)}</span>
        {group.items.map((item) => item.name).join(", ")}
      </p>
    ));
  if (content.education.length > 0 || view.certifications.length > 0)
    outputs.education = (
      <>
        {content.education.map((school) => (
          <div className="item" key={school.id}>
            <p>
              <span className="yellow">{school.school || school.degree}</span>
              {school.dates ? <span className="gray right">{school.dates}</span> : null}
            </p>
            {school.school && school.degree ? (
              <p className="indent green">{school.degree}</p>
            ) : null}
            {school.lines.map((line, i) => (
              <p key={i} className="bullet">
                {line}
              </p>
            ))}
          </div>
        ))}
        {view.certifications.map((cert) => (
          <p key={cert.id}>
            <span className="yellow">{cert.name}</span>
            <span className="gray">
              {[cert.issuer, cert.date].filter(Boolean).map((t) => `  ${t}`)}
            </span>
          </p>
        ))}
      </>
    );
  if (content.writing.length > 0)
    outputs.writing = content.writing.map((post) => (
      <p key={post.id}>
        <span className="gray">{post.date ? `${post.date}  ` : ""}</span>
        <OutLink href={post.href} className="link">
          {post.title}
        </OutLink>
        {post.minutes ? (
          <span className="gray">{`  (${fmt(t.minutes, { minutes: post.minutes })})`}</span>
        ) : null}
      </p>
    ));
  if (content.talks.length > 0)
    outputs.talks = content.talks.map((talk) => (
      <p key={talk.id}>
        <span className="gray">{talk.date ? `${talk.date}  ` : ""}</span>
        <OutLink href={talk.href ?? talk.recording ?? talk.slides} className="link">
          {talk.title}
        </OutLink>
        {talk.event ? <span className="gray">{`  @ ${talk.event}`}</span> : null}
      </p>
    ));
  if (view.extras.length > 0)
    outputs.more = view.extras.map((section) => (
      <div className="item" key={section.id}>
        <p className="head">{section.title}</p>
        {section.items.map((item) => (
          <p key={item.id} className="bullet">
            {[item.title, item.subtitle, item.date].filter(Boolean).join("  ·  ")}
            {item.detail ? ` — ${item.detail}` : ""}
          </p>
        ))}
      </div>
    ));
  if (content.email || socials.length > 0)
    outputs.contact = (
      <>
        {content.email ? (
          <p>
            <span className="yellow">{t.email.padEnd(10)}</span>
            <a className="link" href={`mailto:${content.email}`}>
              {content.email}
            </a>
          </p>
        ) : null}
        {socials.map((social) => (
          <p key={social.href}>
            <span className="yellow">{social.label.toLowerCase().slice(0, 9).padEnd(10)}</span>
            <OutLink href={social.href} className="link">
              {social.handle || social.href}
            </OutLink>
          </p>
        ))}
      </>
    );

  const links: ShellLinks = {};
  if (resumeHref) links.resume = { href: resumeHref, label: t.resume };
  if (content.email)
    links.email = { href: `mailto:${content.email}`, label: `mailto:${content.email}` };
  for (const social of socials) {
    const key = social.kind === "website" ? "website" : social.kind;
    if (!(key in links) && !(key in outputs))
      links[key] = { href: social.href, label: social.label };
  }

  const shown = [
    "sumfetch",
    "about",
    "work",
    "projects",
    "skills",
    "education",
    "writing",
    "talks",
    "more",
    "contact",
  ].filter((key) => key in outputs);

  return (
    <div className="pf-terminal" id="pf-terminal-top">
      <TemplateStyle css={TERMINAL_CSS} />
      <RevealOnScroll />
      <div className="frame">
        <Patterns />
        <h1 className="sr-only">
          {name}
          {headline ? ` — ${headline}` : ""}
        </h1>
        <div className="transcript">
          <div className="entry first">
            <p className="line">
              <Ps1 host={host} user={t.user} />
            </p>
            <div className="out">{outputs.banner}</div>
          </div>
          {shown.map((key) => (
            <Entry key={key} host={host} user={t.user} command={key}>
              {outputs[key]}
            </Entry>
          ))}
        </div>
        <Shell
          host={host}
          outputs={outputs}
          links={links}
          words={{
            ...t.shell,
            user: t.user,
            hint: fmt(t.banner.summary.replace(/<\/?link>/g, ""), { command: "sumfetch" }),
          }}
        />
        {footer ? (
          <p className="foot">
            <span className="gray"># </span>
            <span className="foot-credit">{footer}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
