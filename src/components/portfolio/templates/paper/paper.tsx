import { ArrowUpRight, FileText, Library, Mail, PenLine, PencilRuler, Shapes } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { ContentShelfItem } from "@/lib/portfolio/content";
import { Marked, nameOf, OutLink, TemplateStyle, unbroken } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { FooterClock } from "./islands";
import { PAPER_CSS } from "./styles";

// Ported from CaliCastle/cali.so (code MIT, see ./LICENSE.txt); none of Cali's content or branding.

const delay = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

const BINDINGS: [string, string][] = [
  ["oklch(0.66 0.19 42)", "oklch(0.22 0.03 40)"],
  ["oklch(0.3 0.02 260)", "oklch(0.9 0.01 90)"],
  ["oklch(0.93 0.01 95)", "oklch(0.35 0.01 90)"],
  ["oklch(0.82 0.15 95)", "oklch(0.25 0.03 90)"],
  ["oklch(0.25 0.01 60)", "oklch(0.85 0.01 90)"],
  ["oklch(0.62 0.01 80)", "oklch(0.97 0.005 90)"],
  ["oklch(0.45 0.08 250)", "oklch(0.95 0.01 250)"],
  ["oklch(0.36 0.06 20)", "oklch(0.92 0.01 60)"],
];

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function binding(item: { title: string; by: string }): CSSProperties {
  const [book, ink] = BINDINGS[hashOf(item.title + item.by) % BINDINGS.length]!;
  return { "--book": book, "--book-ink": ink } as CSSProperties;
}

const BRAILLE: Record<string, string> = {
  a: "⠁",
  b: "⠃",
  c: "⠉",
  d: "⠙",
  e: "⠑",
  f: "⠋",
  g: "⠛",
  h: "⠓",
  i: "⠊",
  j: "⠚",
  k: "⠅",
  l: "⠇",
  m: "⠍",
  n: "⠝",
  o: "⠕",
  p: "⠏",
  q: "⠟",
  r: "⠗",
  s: "⠎",
  t: "⠞",
  u: "⠥",
  v: "⠧",
  w: "⠺",
  x: "⠭",
  y: "⠽",
  z: "⠵",
};
const braille = (text: string) =>
  [...text.toLowerCase()].map((ch) => (ch === " " ? "⠀" : (BRAILLE[ch] ?? ""))).join("");

function printOf(title: string): CSSProperties {
  const hash = hashOf(title);
  return {
    "--angle": `${(hash % 12) * 30}deg`,
    "--spot": `${20 + (hash % 7) * 10}% ${25 + ((hash >> 3) % 6) * 10}%`,
  } as CSSProperties;
}

const coordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;

function ExternalMark() {
  return <ArrowUpRight className="ext-mark" aria-hidden />;
}

function Tag({ index, children, at }: { index: number; children: ReactNode; at: number }) {
  return (
    <h2 className="tag enter" style={delay(at)}>
      <span className="tag-index" aria-hidden>
        {String(index).padStart(2, "0")}
      </span>
      <span className="tag-hatch" aria-hidden />
      <span className="tag-label">{children}</span>
    </h2>
  );
}

function Icon({ monogram }: { monogram: string }) {
  return (
    <span className="icon" aria-hidden>
      {monogram}
    </span>
  );
}

function Shelf({ items }: { items: readonly ContentShelfItem[] }) {
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <div className="shelf">
      <div className="books">
        <OutLink href={first.href} className="book" label={first.title}>
          <span style={binding(first)} className="cover" aria-hidden>
            <b>{first.title}</b>
            {first.by}
          </span>
        </OutLink>
        {rest.map((item) => {
          const size = {
            "--w": `${26 + Math.min(18, Math.round(item.title.length / 3))}px`,
            "--h": `${184 + (hashOf(item.title) % 26)}px`,
          } as CSSProperties;
          return (
            <OutLink key={item.id} href={item.href} className="book" label={item.title}>
              <span className="spine" style={{ ...binding(item), ...size }}>
                <span className="spine-title">{item.title}</span>
                {item.by ? <span className="spine-by">{item.by}</span> : null}
              </span>
            </OutLink>
          );
        })}
      </div>
      <span className="plank" aria-hidden />
      <OutLink href={first.href} className="annotation">
        <span>{first.title}</span>
        {first.href ? <ExternalMark /> : null}
      </OutLink>
    </div>
  );
}

function Records({ items }: { items: readonly ContentShelfItem[] }) {
  const lead = Math.floor((items.length - 1) / 2);
  const leadItem = items[lead];
  if (!leadItem) return null;
  return (
    <div className="shelf">
      <div className="records">
        {items.map((item, index) => (
          <OutLink
            key={item.id}
            href={item.href}
            className={index === lead ? "sleeve lead" : "sleeve"}
            label={item.title}
          >
            <span style={{ display: "contents" }}>
              {item.title}
              {item.by ? <small>{item.by}</small> : null}
            </span>
          </OutLink>
        ))}
      </div>
      <span className="plank" aria-hidden />
      <OutLink href={leadItem.href} className="annotation">
        <span>{leadItem.title}</span>
        {leadItem.href ? <ExternalMark /> : null}
      </OutLink>
    </div>
  );
}

export function PaperTemplate({ view, content, footer, resumeHref }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const socials = content.socials.filter((social) => social.kind !== "email");
  const lead = content.pitch || view.headline;
  const showLead = lead !== "" && !(content.about[0] ?? "").trim().startsWith(lead.trim());
  const records = content.shelf.filter((item) => item.kind === "album");
  const books = content.shelf.filter((item) => item.kind !== "album");
  const allBooks = books.every((item) => item.kind === "book");
  const location = content.location;
  const place = location?.city || location?.label || view.location;

  const cards: { id: string; label: string; sub: string; vignette: ReactNode }[] = [];
  if (content.writing.length > 0) {
    cards.push({
      id: "writing",
      label: "Writing",
      sub: `${content.writing.length} ${content.writing.length === 1 ? "post" : "posts"}`,
      vignette: (
        <span className="vignette sheets" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      ),
    });
  }
  if (content.projects.length > 0) {
    cards.push({
      id: "projects",
      label: "Projects",
      sub: `${content.projects.length} ${content.projects.length === 1 ? "project" : "projects"}`,
      vignette: (
        <span className="vignette" aria-hidden>
          <span className="tool">
            <svg className="guides-svg" viewBox="0 0 52 52" preserveAspectRatio="xMidYMid meet">
              <path d="M26 0V52M0 26H52M0 0L52 52M52 0L0 52" />
              <circle cx="26" cy="26" r="21" />
            </svg>
            <PencilRuler className="mark-svg" aria-hidden />
          </span>
        </span>
      ),
    });
  }
  if (content.shelf.length > 0) {
    const spines = content.shelf.slice(0, 3);
    cards.push({
      id: "shelf",
      label: allBooks && records.length === 0 ? "Books" : "Shelf",
      sub: `${content.shelf.length} ${content.shelf.length === 1 ? "favourite" : "favourites"}`,
      vignette: (
        <span className="vignette spines" aria-hidden>
          {spines.map((item, i) => (
            <span key={item.id} style={{ ...binding(item), "--i": i } as CSSProperties} />
          ))}
        </span>
      ),
    });
  }

  let count = 0;
  const next = () => ++count;
  const sections: ReactNode[] = [];

  if (content.experience.length > 0 || content.education.length > 0) {
    const rows = [
      ...content.experience.map((job) => ({
        id: job.id,
        title: job.company || job.title,
        sub: job.company ? job.title : "",
        href: job.website?.href ?? null,
        dates: job.start ? `${unbroken(job.start)}—${unbroken(job.end || "now")}` : job.dates,
      })),
      ...content.education.map((school) => ({
        id: school.id,
        title: school.school || school.degree,
        sub: school.school ? school.degree : "",
        href: school.website?.href ?? null,
        dates: school.start
          ? `${unbroken(school.start)}—${unbroken(school.end || "now")}`
          : school.dates,
      })),
    ];
    sections.push(
      <section key="experience" className="section" id="pf-paper-experience">
        <Tag index={next()} at={120}>
          {content.experience.length > 0 ? "Experience" : "Education"}
        </Tag>
        <ul className="list">
          {rows.map((row, i) => (
            <li key={row.id} className="enter-swing hairline-top" style={delay(150 + i * 40)}>
              <div className="row">
                <div className="row-text">
                  {row.href ? (
                    <OutLink href={row.href} className="row-title">
                      {row.title}
                      <ExternalMark />
                    </OutLink>
                  ) : (
                    <span className="row-title">{row.title}</span>
                  )}
                  {row.sub ? <span className="row-sub">{row.sub}</span> : null}
                </div>
                {row.dates ? <span className="row-date">{row.dates}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>,
    );
  }

  if (content.writing.length > 0) {
    const center = (Math.min(content.writing.length, 8) - 1) / 2;
    sections.push(
      <section key="writing" className="section" id="pf-paper-writing">
        <Tag index={next()} at={200}>
          Writing
        </Tag>
        <ul className="list focus-list">
          {content.writing.map((post, index) => (
            <li
              key={post.id}
              className="enter-swing hairline-top"
              style={delay(240 + Math.abs(Math.min(index, 7) - center) * 50)}
            >
              <OutLink href={post.href} className="post">
                <span className="pile" aria-hidden>
                  <span className="sheet" />
                  <span className="sheet" />
                  <span className="thumb" style={printOf(post.title)} />
                </span>
                <h3 className="post-title">{post.title}</h3>
                <span className="leader" aria-hidden />
                {post.date ? <time>{post.date}</time> : null}
              </OutLink>
            </li>
          ))}
        </ul>
      </section>,
    );
  }

  if (content.projects.length > 0) {
    sections.push(
      <section key="projects" className="section" id="pf-paper-projects">
        <Tag index={next()} at={260}>
          Projects
        </Tag>
        <ul className="list focus-list">
          {content.projects.map((project, i) => {
            const href = project.website?.href ?? project.source?.href ?? null;
            return (
              <li key={project.id} className="enter-swing hairline-top" style={delay(280 + i * 40)}>
                <div className="row">
                  <div className="row-main">
                    <Icon monogram={project.monogram} />
                    <div className="row-text">
                      {href ? (
                        <OutLink href={href} className="row-title">
                          {project.name}
                          <ExternalMark />
                        </OutLink>
                      ) : (
                        <span className="row-title">{project.name}</span>
                      )}
                      {project.line || project.description ? (
                        <span className="row-sub">{project.line || project.description}</span>
                      ) : null}
                    </div>
                  </div>
                  {project.years ? <span className="row-date">{project.years}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>,
    );
  }

  if (content.interests.length > 0) {
    sections.push(
      <section key="interests" className="section" id="pf-paper-interests">
        <Tag index={next()} at={320}>
          Outside work
        </Tag>
        <ul className="list focus-list">
          {content.interests.map((interest, i) => (
            <li key={interest.id} className="enter-swing hairline-top" style={delay(340 + i * 40)}>
              <div className="row">
                <div className="row-text">
                  <span className="row-title">{interest.title}</span>
                  {interest.line ? <span className="row-sub">{interest.line}</span> : null}
                </div>
                {interest.stat ? <span className="row-stat">{interest.stat}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>,
    );
  }

  if (records.length > 0) {
    sections.push(
      <section key="records" className="section" id="pf-paper-shelf">
        <Tag index={next()} at={340}>
          On rotation
        </Tag>
        <div className="enter" style={delay(360)}>
          <Records items={records} />
        </div>
      </section>,
    );
  }

  if (books.length > 0) {
    sections.push(
      <section
        key="books"
        className="section"
        id={records.length > 0 ? undefined : "pf-paper-shelf"}
      >
        <Tag index={next()} at={380}>
          {allBooks ? "Books I love" : "Favourites"}
        </Tag>
        <div className="enter" style={delay(420)}>
          <Shelf items={books} />
        </div>
      </section>,
    );
  }

  const index: { href: string; label: string }[] = [
    { href: "#pf-paper-top", label: "Home" },
    ...(content.experience.length > 0
      ? [{ href: "#pf-paper-experience", label: "Experience" }]
      : []),
    ...cards.map((card) => ({ href: `#pf-paper-${card.id}`, label: card.label })),
  ];

  return (
    <div className="pf-paper" id="pf-paper-top">
      <TemplateStyle css={PAPER_CSS} />
      <div className="grain" aria-hidden />
      <div className="guides" aria-hidden>
        <div className="guide l" />
        <div className="guide r" />
      </div>
      <div className="fade top" aria-hidden />
      <div className="fade bottom" aria-hidden />

      <div className="column">
        <div className="masthead">
          <div className="intro enter">
            <div className="name">
              <h1>{name}</h1>
            </div>
            <div className="intro-text">
              {showLead ? <p>{lead}</p> : null}
              {content.aboutParts.map((parts, i) => (
                <p key={i}>
                  <Marked parts={parts} mark="span" className="mark" />
                </p>
              ))}
              {socials.length > 0 || content.email ? (
                <p>
                  You can find me on{" "}
                  {[
                    ...socials.map((social) => (
                      <OutLink key={social.href} href={social.href}>
                        {social.label}
                        <ExternalMark />
                      </OutLink>
                    )),
                    ...(content.email
                      ? [
                          <a key="email" href={`mailto:${content.email}`}>
                            {content.email}
                          </a>,
                        ]
                      : []),
                  ].flatMap((link, i, all) => [
                    i === 0 ? null : i === all.length - 1 ? " and " : ", ",
                    link,
                  ])}
                  .
                </p>
              ) : null}
            </div>
          </div>
          <div className="portrait" aria-hidden>
            <span className="halftone">
              <span className="halftone-ink">{content.initials}</span>
            </span>
          </div>
        </div>

        {cards.length > 0 ? (
          <nav
            className="nav-cards"
            style={{ "--cards": cards.length } as CSSProperties}
            aria-label="Sections"
          >
            {cards.map((card, i) => (
              <a
                key={card.id}
                href={`#pf-paper-${card.id}`}
                className="nav-card enter-swing"
                style={delay(160 + i * 40)}
              >
                {card.vignette}
                <span className="nc-label">{card.label}</span>
                <span className="nc-sub">{card.sub}</span>
              </a>
            ))}
          </nav>
        ) : null}

        {sections}
      </div>

      <footer className="footer">
        <div className="footer-grid hairline-top">
          {socials.length > 0 || content.email || resumeHref ? (
            <div>
              <h2 className="footer-label">Contact</h2>
              <ul className="tree">
                {resumeHref ? (
                  <li>
                    <a href={resumeHref}>Resume</a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.href}>
                    <OutLink href={social.href}>
                      {social.label}
                      <ExternalMark />
                    </OutLink>
                  </li>
                ))}
                {content.email ? (
                  <li>
                    <a href={`mailto:${content.email}`}>Email</a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div>
            <h2 className="footer-label">Index</h2>
            <ul className="tree">
              {index.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="colophon">
            <div>
              <p>
                © {view.updatedAt ? `${new Date(view.updatedAt).getUTCFullYear()} ` : ""}
                {name}
              </p>
              <p className="braille" aria-hidden>
                {braille(name)}
              </p>
            </div>
            {location?.timezone || location?.coords ? (
              <div className="stamps">
                {location.timezone ? (
                  <FooterClock timeZone={location.timezone} place={place} />
                ) : null}
                {location.coords ? (
                  <div className="stamp" aria-hidden>
                    <svg className="globe" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="9" />
                      <ellipse cx="10" cy="10" rx="4" ry="9" />
                      <path d="M1 10h18M1.9 6h16.2M1.9 14h16.2" />
                    </svg>
                    <span className="readout">
                      <span>{coordinate(location.coords.lat, "N", "S")}</span>
                      <span>{coordinate(location.coords.lng, "E", "W")}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {footer ? (
          <div className="ends">
            <div className="credit">{footer}</div>
          </div>
        ) : null}
      </footer>

      <nav className="dock" aria-label="Dock">
        <a href="#pf-paper-top" className="dock-item" aria-label="Home">
          <span className="dock-avatar">{content.initials}</span>
        </a>
        {cards.length > 0 || content.email || resumeHref ? (
          <span className="dock-rule" aria-hidden />
        ) : null}
        {cards.map((card) => (
          <a
            key={card.id}
            href={`#pf-paper-${card.id}`}
            className="dock-item"
            aria-label={card.label}
          >
            {card.id === "writing" ? (
              <PenLine aria-hidden />
            ) : card.id === "shelf" ? (
              <Library aria-hidden />
            ) : (
              <Shapes aria-hidden />
            )}
          </a>
        ))}
        {resumeHref ? (
          <a href={resumeHref} className="dock-item" aria-label="Resume">
            <FileText aria-hidden />
          </a>
        ) : null}
        {content.email ? (
          <a href={`mailto:${content.email}`} className="dock-item" aria-label="Email">
            <Mail aria-hidden />
          </a>
        ) : null}
      </nav>
    </div>
  );
}
