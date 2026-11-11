import type { CSSProperties } from "react";
import type { ContentProject } from "@/lib/portfolio/content";
import { Marked, nameOf, OutLink, seeded, seedOf, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { FOLIO_CSS } from "./styles";

// Folio: a rebuild of Samuel Kraft's site (github.com/samuelkraft/samuelkraft-next,
// samuelkraft.com, MIT; ./LICENSE.txt) for anyone's data. One quiet 640px column of medium
// Inter: a tiny initials avatar, a few lines of intro, links, then big rounded project tiles that
// light up on hover (each an app icon drawn from the project's name, as his tiles show for apps
// without a screenshot), the places worked (the repo's Workplaces list) and a list of posts.
// Everything rises in 90ms apart, and hovering a list dims its other rows.

const BLUR_LAYERS = [
  { blur: 0.5, solid: 80, fade: 100 },
  { blur: 1, solid: 60, fade: 80 },
  { blur: 1.5, solid: 40, fade: 60 },
  { blur: 2, solid: 20, fade: 40 },
  { blur: 3, solid: 0, fade: 20 },
];

const step = (index: number) => ({ "--index": index }) as CSSProperties;

// The original's tile for an app: its icon in the middle of the dark tile. Here the icon is the
// project's monogram on a two-tone gradient, lit by a glow in the same colours, all from the name.
function Graphic({ project }: { project: ContentProject }) {
  const random = seeded(seedOf(project.name));
  const hue = Math.floor(random() * 360);
  const style = {
    "--hue": hue,
    "--hue-2": (hue + 25 + Math.floor(random() * 40)) % 360,
    "--glow-x": `${Math.round(30 + random() * 40)}%`,
  } as CSSProperties;
  return (
    <div className="tile" style={style}>
      <div className="app-icon" aria-hidden>
        {project.monogram}
      </div>
    </div>
  );
}

/** The pitch opens the intro unless the about text already starts with it. */
function introLines(pitch: string, about: readonly string[]): boolean {
  const first = about[0]?.trim() ?? "";
  return pitch !== "" && !first.startsWith(pitch.trim());
}

export function FolioTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const lead = content.pitch || view.headline;
  const showLead = introLines(lead, content.about);
  const place = content.location?.label || view.location;
  let index = 2;
  const next = () => step(index++);

  const intro = (
    <div className="intro">
      <div className="avatar in" aria-hidden>
        {content.initials}
      </div>
      <h1 className="in" style={step(1)}>
        {name}
      </h1>
      {showLead ? (
        <p className="secondary in" style={next()}>
          {lead}
        </p>
      ) : null}
      {content.aboutParts.map((parts, i) => (
        <p key={i} className="secondary in" style={next()}>
          <Marked parts={parts} mark="span" className="mark" />
        </p>
      ))}
      {place ? (
        <p className="secondary in" style={next()}>
          Based in {place}.
        </p>
      ) : null}
      {content.socials.length > 0 ? (
        <ul className="connect animated-list in" style={next()}>
          {content.socials.map((social) => (
            <li key={social.href}>
              <OutLink href={social.href} className="ext">
                {social.kind === "x" ? "𝕏" : social.label}
              </OutLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const projectsStart = index;
  const workStart = projectsStart + content.projects.length + 1;
  const postsStart = workStart + content.experience.length + 1;

  return (
    <div className="pf-folio">
      <TemplateStyle css={FOLIO_CSS} />
      <header className="header" aria-hidden>
        <div className="blur">
          {BLUR_LAYERS.map((layer) => {
            const mask = `linear-gradient(to bottom, black 0%, black ${layer.solid}%, transparent ${layer.fade}%)`;
            return (
              <div
                key={layer.blur}
                style={{
                  backdropFilter: `blur(${layer.blur}px)`,
                  WebkitBackdropFilter: `blur(${layer.blur}px)`,
                  maskImage: mask,
                  WebkitMaskImage: mask,
                }}
              />
            );
          })}
        </div>
      </header>
      <div className="main">
        <div className="stack">
          {intro}

          {content.projects.length > 0 ? (
            <section className="block">
              <h2 className="in" style={step(projectsStart)}>
                Projects
              </h2>
              <ul className="projects">
                {content.projects.map((project, i) => {
                  const href = project.website?.href ?? project.source?.href ?? null;
                  const text = project.description || project.line;
                  return (
                    <li key={project.id} className="in" style={step(projectsStart + i + 1)}>
                      <div className="card">
                        {href ? (
                          <OutLink href={href} className="cover" label={project.name}>
                            <span className="sr-only">{project.name}</span>
                          </OutLink>
                        ) : null}
                        <div className="graphic">
                          <Graphic project={project} />
                        </div>
                        <div className="text">
                          <h3>{project.name}</h3>
                          {text ? <p className="secondary">{text}</p> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {content.experience.length > 0 ? (
            <section className="block">
              <h2 className="in" style={step(workStart)}>
                Work
              </h2>
              <ul className="places animated-list">
                {content.experience.map((job, i) => {
                  const inner = (
                    <>
                      <div className="place-main">
                        <div className="logo" aria-hidden>
                          {job.monogram}
                        </div>
                        <div className="place-text">
                          <p className={job.website ? "external-arrow" : undefined}>
                            {job.company || job.title}
                          </p>
                          {job.company && job.title ? (
                            <p className="secondary">{job.title}</p>
                          ) : null}
                        </div>
                      </div>
                      {job.dates ? (
                        <time>
                          {job.start && job.end ? `${job.start} – ${job.end}` : job.dates}
                        </time>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={job.id} className="in" style={step(workStart + i + 1)}>
                      {job.website ? (
                        <OutLink href={job.website.href} className="place">
                          {inner}
                        </OutLink>
                      ) : (
                        <div className="place">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {content.writing.length > 0 ? (
            <section className="block" style={{ gap: 7, alignItems: "flex-start" }}>
              <h2 className="in" style={step(postsStart)}>
                Posts
              </h2>
              <ol className="posts animated-list">
                {content.writing.map((post, i) => (
                  <li key={post.id}>
                    <div className="in" style={step(postsStart + i + 1)}>
                      <OutLink href={post.href} className="post">
                        <span className="post-title">{post.title}</span>
                        {post.date ? <time>{post.date}</time> : null}
                      </OutLink>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <footer className="foot">{footer ? <div className="credit">{footer}</div> : null}</footer>
      </div>
    </div>
  );
}
