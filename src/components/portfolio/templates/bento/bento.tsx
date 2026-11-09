import type { ReactNode } from "react";
import type { ContentProject, ContentSocial } from "@/lib/portfolio/content";
import { compactNumber } from "@/lib/portfolio/metrics";
import { SocialIcon } from "../icons";
import { DesignCredit, featuredFirst, nameOf, OutLink, Picture, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { AccentSwatches, TimeZoneTile } from "./islands";
import { PixelArrow, PixelGitHub, PixelLinkedIn } from "./pixel-icons";
import { BENTO_CSS } from "./styles";

// Bento: a rebuild of Gianmarco Cavallo's astro-bento-portfolio (github.com/Ladvace/
// astro-bento-portfolio, MIT; ./LICENSE.txt) for anyone's data. One screen of framed tiles on a
// fading grid: intro with photo and social buttons, stack and tools, contact details, live local
// time against the reader's, GitHub, "now", projects, experience, accent swatches and the credit.

const INTRO_PARAGRAPHS = 3;
const INTRO_BUTTONS = 3;
const PROJECT_TILES = 4;
const JOBS = 4;

// UTC, so the server's page and the browser's preview print the same day.
const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function Tile({
  className = "",
  href,
  label,
  corner = false,
  background,
  children,
}: {
  className?: string;
  href?: string | null;
  label?: string;
  corner?: boolean;
  background?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`card ${href ? "link" : ""}${className}`}>
      {background ? <div className="bg">{background}</div> : null}
      {href ? (
        <OutLink href={href} className="card-link" label={label}>
          <PixelArrow className={`card-arrow${corner ? "corner" : ""}`} />
          {children}
        </OutLink>
      ) : (
        children
      )}
    </div>
  );
}

function SocialButton({ social }: { social: ContentSocial }) {
  const icon =
    social.kind === "github" ? (
      <PixelGitHub />
    ) : social.kind === "linkedin" ? (
      <PixelLinkedIn />
    ) : (
      <SocialIcon kind={social.kind} />
    );
  return (
    <span className="btn-shell">
      <OutLink href={social.href} className="btn" label={social.label}>
        {icon}
      </OutLink>
    </span>
  );
}

function ProjectTile({ project }: { project: ContentProject }) {
  const href = project.website?.href ?? project.source?.href ?? null;
  const image = project.images[0];
  return (
    <Tile
      className="t-project"
      href={href}
      label={project.name}
      background={
        image ? (
          <>
            <Picture image={image} className="shot" alt="" />
            <div className="shade" />
          </>
        ) : (
          <div className="pattern" />
        )
      }
    >
      <div>
        <h2 className="project-title">{project.name}</h2>
        {project.line ? <p className="project-line">{project.line}</p> : null}
      </div>
    </Tile>
  );
}

function PixelHeart() {
  return (
    <svg className="heart" viewBox="0 0 7 6" shapeRendering="crispEdges" aria-label="love">
      <rect x="1" y="0" width="2" height="1" fill="#ef4444" />
      <rect x="4" y="0" width="2" height="1" fill="#ef4444" />
      <rect x="0" y="1" width="7" height="1" fill="#ef4444" />
      <rect x="0" y="2" width="7" height="1" fill="#ef4444" />
      <rect x="1" y="3" width="5" height="1" fill="#ef4444" />
      <rect x="2" y="4" width="3" height="1" fill="#ef4444" />
      <rect x="3" y="5" width="1" height="1" fill="#ef4444" />
    </svg>
  );
}

export function BentoTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const socials = content.socials.filter((social) => social.kind !== "email");
  const buttons = [
    ...socials.filter((social) => social.kind === "github" || social.kind === "linkedin"),
    ...socials.filter((social) => social.kind !== "github" && social.kind !== "linkedin"),
  ].slice(0, INTRO_BUTTONS);
  const groups = content.skills.filter((group) => group.items.length > 0);
  const location = content.location;
  const country = location?.label.split(",").at(-1)?.trim() ?? "";
  const place = location?.city || location?.label || "";
  const projects = featuredFirst(content.projects).slice(0, PROJECT_TILES);
  const jobs = content.experience.slice(0, JOBS);
  const github = content.github;
  const now = content.now;
  const year = new Date().getUTCFullYear();
  const weeks = github?.activity.weeks ?? [];
  const peak = Math.max(1, ...weeks);

  return (
    <div className="pf-bento">
      <TemplateStyle css={BENTO_CSS} />
      <div className="lines" aria-hidden />
      <div className="grid">
        <Tile className="t-intro pad-lg">
          <div className="intro-row">
            <div className="intro-text">
              <div>
                <h1 className="welcome">welcome</h1>
                <p className="intro-p">
                  <span>
                    Hi, I&rsquo;m <b>{name}</b>
                    {view.headline
                      ? `, ${view.headline.charAt(0).toLowerCase()}${view.headline.slice(1)}.`
                      : "."}
                    {content.pitch ? ` ${content.pitch}` : ""}
                  </span>
                  {content.about.slice(0, INTRO_PARAGRAPHS).map((paragraph, index) => (
                    <span key={index}>{paragraph}</span>
                  ))}
                </p>
              </div>
              {buttons.length > 0 ? (
                <div className="socials">
                  {buttons.map((social) => (
                    <SocialButton key={social.href} social={social} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="avatar">
              {content.photo ? (
                <Picture image={content.photo} eager />
              ) : (
                <div className="initials" aria-hidden>
                  {content.initials}
                </div>
              )}
            </div>
          </div>
        </Tile>

        {groups.length > 0 ? (
          <Tile className="t-stack pad-lg">
            <h2 className="title">Stack &amp; tools</h2>
            <div className="stack">
              {groups.map((group) => (
                <div key={group.id} className="stack-group">
                  <span className="stack-label">{group.label || "Skills"}</span>
                  <div className="chips">
                    {group.items.map((item) => (
                      <span key={item.name} className="chip">
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Tile>
        ) : null}

        {content.email || location || socials.length > 0 ? (
          <Tile className="t-contact contact pad-lg">
            <h2 className="title">Let&rsquo;s start working together!</h2>
            {content.email || location ? (
              <address>
                <h3 className="label">Contact Details</h3>
                {content.email ? (
                  <p className="email">
                    <a href={`mailto:${content.email}`}>{content.email}</a>
                  </p>
                ) : null}
                {location ? <p>{country || location.label}</p> : null}
              </address>
            ) : null}
            {socials.length > 0 ? (
              <div className="find">
                <h3 className="label">Find me on</h3>
                <ul>
                  {socials.map((social) => (
                    <li key={social.href}>
                      <OutLink href={social.href}>{social.label}</OutLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Tile>
        ) : null}

        {location?.timezone ? (
          <Tile className="t-tz p4">
            <TimeZoneTile timeZone={location.timezone} place={place} country={country} />
          </Tile>
        ) : null}

        {github ? (
          <Tile
            className="t-github"
            href={github.href}
            label="GitHub profile"
            background={
              weeks.length > 0 ? (
                <div className="heat">
                  {weeks.map((count, index) => (
                    <span key={index} style={{ height: `${Math.max(8, (count / peak) * 100)}%` }} />
                  ))}
                </div>
              ) : null
            }
          >
            <h2 className="title">GitHub</h2>
            <p className="gh-meta">
              {[
                github.totalStars > 0 ? `${compactNumber(github.totalStars)} stars` : "",
                `${github.publicRepos} repos`,
                `@${github.username}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Tile>
        ) : null}

        {now && now.items[0] ? (
          <Tile className="t-now tight center">
            <div className="now-head">
              <div className="now-title">
                <h2>Now</h2>
                <a
                  className="now-what"
                  href="https://nownownow.com/about"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  what&rsquo;s this?
                </a>
              </div>
              <div className="now-date">
                {now.updatedAt ? (
                  <time dateTime={new Date(now.updatedAt).toISOString().slice(0, 10)}>
                    {DAY.format(now.updatedAt)}
                  </time>
                ) : null}
                <span className="pulse" aria-hidden />
              </div>
            </div>
            <p className="now-text">
              <b>{now.items[0].label}</b> {now.items[0].text}
            </p>
          </Tile>
        ) : null}

        {projects.map((project) => (
          <ProjectTile key={project.id} project={project} />
        ))}

        {jobs.length > 0 ? (
          <Tile className="t-exp pad-lg">
            <h2 className="title">Experience</h2>
            <ul className="jobs">
              {jobs.map((job) => (
                <li key={job.id} className="job">
                  <span className="job-title">
                    {job.title || job.company}
                    {job.title && job.company ? (
                      <span className="job-at"> at {job.company}</span>
                    ) : null}
                  </span>
                  <span className="job-dates">
                    {job.start && job.end ? `${job.start} – ${job.end}` : job.dates}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>
        ) : null}

        <Tile className="t-accent p4">
          <AccentSwatches />
        </Tile>

        <Tile className="t-foot">
          <div className="foot">
            <p>
              &copy; {year} · Crafted with <PixelHeart /> by {name}
            </p>
            <DesignCredit id="bento" />
            {footer ? <div className="credit">{footer}</div> : null}
          </div>
        </Tile>
      </div>
    </div>
  );
}
