import type { CSSProperties, ReactNode } from "react";
import type {
  ContentProject,
  ContentRole,
  MilestoneKind,
  PortfolioContentView,
} from "@/lib/portfolio/content";
import type { PortfolioView } from "@/lib/portfolio/view";
import {
  featuredFirst,
  Marked,
  nameOf,
  OutLink,
  safeId,
  seeded,
  seedOf,
  TemplateStyle,
  unbroken,
} from "../parts";
import { RevealOnScroll } from "../reveal";
import type { PortfolioTemplateProps } from "../types";
import { LocalTime } from "./on-demand";
import { Caret, Fleuron, Hand, Star } from "./ornaments";
import { GAZETTE_CSS } from "./styles";

// Ported from JoaccoG/portfolio-v2, "The Daily Godoy" (MIT, see ./LICENSE.txt). Its portrait,
// photographs and written copy are the author's own and are not used.

const ID = {
  top: "pf-gazette-top",
  subject: "pf-gazette-subject",
  works: "pf-gazette-works",
  columns: "pf-gazette-columns",
  appointments: "pf-gazette-appointments",
  wire: "pf-gazette-wire",
} as const;

const PLATES = 4;
const TICKER_MAX = 10;
const TICKER_MIN = 8;
const TWO_COLUMNS = 520;
const ADS = 4;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MILESTONE_LEADS: Record<MilestoneKind, string> = {
  award: "Honours",
  hackathon: "Honours",
  launch: "Launched",
  talk: "Lectured",
  press: "In the press",
  other: "Notice",
};
const INKS = ["#0e141b", "#1d1610", "#13201a", "#2a1214"] as const;
const PATTERNS = ["ring", "hatch", "grid"] as const;

function roman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, mark] of table) {
    while (rest >= value) {
      out += mark;
      rest -= value;
    }
  }
  return out;
}

// A page always has a save time; the guard keeps a blank sample from printing 1970.
function editionDate(ms: number): string | null {
  const date = new Date(ms);
  if (date.getUTCFullYear() < 2000) return null;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function surnameOf(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

function tickerOf(
  view: PortfolioView,
  content: PortfolioContentView,
  aboutShown: boolean,
): string[] {
  const items = [
    ...content.experience
      .filter((job) => job.highlight && job.company)
      .map((job) => `${job.highlight} at ${job.company}`),
    ...content.projects.filter((p) => p.outcome).map((p) => `${p.name}: ${p.outcome}`),
    ...content.milestones.map((milestone) => milestone.title),
    ...(aboutShown ? content.stats.map((stat) => `${stat.value} ${stat.label}`) : []),
  ].filter(Boolean);
  const found =
    items.length > 0
      ? items.slice(0, TICKER_MAX)
      : content.disciplines.length > 0
        ? content.disciplines
        : [content.headline || view.headline || "The morning edition is on the streets"];
  const run = [...found];
  while (run.length < TICKER_MIN) run.push(...found);
  return run;
}

const ink = (seed: number) =>
  ({
    "--plate": INKS[seed % INKS.length],
    "--tilt": `${((seed >> 3) % 5) - 2}deg`,
  }) as CSSProperties;

function Band({
  letter,
  label,
  note,
  page,
}: {
  letter: string;
  label: string;
  note: string;
  page: string;
}) {
  return (
    <div className="band" aria-hidden>
      <span className="band-tab">Section {letter}</span>
      <span className="band-label">{label}</span>
      <span className="band-note">{note}</span>
      <span className="band-page">{page}</span>
    </div>
  );
}

function Head({ kicker, title, line }: { kicker: string; title: string; line?: string }) {
  return (
    <header className="sec-head" data-reveal>
      <p className="kicker">{kicker}</p>
      <h2 className="sec-title">
        {title}
        <span className="dot">.</span>
      </h2>
      {line ? <p className="sec-line">{line}</p> : null}
    </header>
  );
}

function Btn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <OutLink href={href} className="btn">
      <Hand />
      <span>{children}</span>
    </OutLink>
  );
}

function PlateArt({ project, index }: { project: ContentProject; index: number }) {
  const random = seeded(seedOf(project.name));
  const pattern = PATTERNS[Math.floor(random() * PATTERNS.length)]!;
  const style = {
    ...ink(Math.floor(random() * 1000)),
    "--x": `${Math.round(45 + random() * 30)}%`,
    "--y": `${Math.round(35 + random() * 30)}%`,
  } as CSSProperties;
  return (
    <div className="plate-art" data-pattern={pattern} style={style} aria-hidden>
      <span className="plate-no">Plate No. {index + 1}</span>
      <span className="plate-name">{project.name}</span>
      {project.line ? <span className="plate-line">{project.line}</span> : null}
      {project.active || project.featured ? (
        <span className="stamp">
          <b>{project.active ? "In daily service" : "Of special note"}</b>
          <small>Works inspector</small>
        </span>
      ) : null}
    </div>
  );
}

function Plate({ project, index }: { project: ContentProject; index: number }) {
  const meta = [project.category, project.years].filter(Boolean).join(" · ");
  const story = project.description || project.line || project.lines[0] || "";
  const more = [
    ...project.details,
    ...(project.description ? project.lines : project.lines.slice(1)),
  ];
  return (
    <article
      className={index % 2 ? "plate flip" : "plate"}
      id={safeId("pf-gazette-p", project.id)}
      data-reveal
    >
      <PlateArt project={project} index={index} />
      <div className="plate-text">
        <p className="kicker">
          No. {index + 1}
          {meta ? ` — ${meta}` : ""}
        </p>
        <h3 className="plate-title">
          {project.name}
          <span className="dot">.</span>
        </h3>
        {story ? <p className="plate-dek">{story}</p> : null}
        {project.tech.length > 0 ? (
          <p className="composed">Composed with {project.tech.join(", ")}</p>
        ) : null}
        {project.outcome ? <p className="outcome">{project.outcome}</p> : null}
        <div className="btns">
          {project.website ? <Btn href={project.website.href}>Visit the works</Btn> : null}
          {project.source ? <Btn href={project.source.href}>The blueprints</Btn> : null}
        </div>
        {more.length > 0 ? (
          <details className="account">
            <summary className="btn">
              <Hand />
              <span>Full account</span>
            </summary>
            <div className="account-body">
              {more.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function Appointment({ job }: { job: ContentRole }) {
  const line = job.summary || job.lines[0] || "";
  const rest = job.summary ? job.lines : job.lines.slice(1);
  const role = [job.title, job.company].filter(Boolean).join(", ");
  return (
    <li className="appt" data-reveal>
      <p className={job.current ? "appt-date now" : "appt-date"}>
        {job.current ? `${unbroken(job.start || job.dates)} — today` : unbroken(job.dates)}
      </p>
      <div className="appt-body">
        <h3 className="appt-role">
          {job.website ? <OutLink href={job.website.href}>{role}</OutLink> : role}
        </h3>
        {job.highlight || job.location ? (
          <p className="appt-meta">{[job.highlight, job.location].filter(Boolean).join(" · ")}</p>
        ) : null}
        {line ? <p className="appt-line">{line}</p> : null}
        {rest.length > 0 ? (
          <ul className="appt-notes">
            {rest.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function Advert({
  label,
  items,
}: {
  label: string;
  items: { name: string; years: number | null }[];
}) {
  const [first, ...rest] = items;
  if (!first) return null;
  const years = Math.max(0, ...items.map((item) => item.years ?? 0));
  return (
    <div className="advert" data-reveal>
      <p className="advert-label">— Advertisement —</p>
      <p className="advert-title">
        <em>{first.name}</em>
        {rest.length > 0 ? `, ${rest.map((item) => item.name).join(", ")}` : ""}
      </p>
      <p className="advert-line">
        {label || "Skills"}
        {years > 1 ? ` — ${years} years in service.` : ". Supplied daily."}
      </p>
    </div>
  );
}

export function GazetteTemplate({ view, content, footer, resumeHref }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const surname = surnameOf(name);
  const headline = content.headline || view.headline;
  const about = content.about;
  const dek = content.pitch && content.pitch !== about[0] ? content.pitch : content.intro;
  const city = content.location?.city || view.location;
  const socials = content.socials.filter((social) => social.kind !== "email");
  const wire = content.email ? `mailto:${content.email}` : (socials[0]?.href ?? null);
  const projects = featuredFirst(content.projects);
  const plates = projects.slice(0, PLATES);
  const others = projects.slice(PLATES);
  const skillGroups = content.skills.filter((group) => group.items.length > 0).slice(0, ADS);
  const printed = content.updatedAt || view.updatedAt;
  const edition = editionDate(printed);
  const year = edition ? new Date(printed).getUTCFullYear() : null;
  // Numbers, kind words and the now list belong to About and hide with it.
  const aboutShown = !view.hidden.includes("about");
  const ticker = tickerOf(view, content, aboutShown);
  const stats = aboutShown ? content.stats : [];
  const testimonials = aboutShown ? content.testimonials : [];
  const lately = aboutShown ? (content.now?.items ?? []) : [];
  const hasSubject = testimonials.length > 0;
  const hasColumns = content.writing.length > 0 || content.talks.length > 0;
  const hasAppointments = content.experience.length > 0 || skillGroups.length > 0;
  const classifieds = [
    ...content.education.map((school) => ({
      id: `ed-${school.id}`,
      lead: "Schooled",
      text: [school.degree, school.school, school.dates].filter(Boolean).join(", "),
      href: school.website?.href ?? null,
    })),
    ...view.certifications.map((cert) => ({
      id: `ce-${cert.id}`,
      lead: "Certified",
      text: [cert.name, cert.issuer, cert.date].filter(Boolean).join(", "),
      href: null,
    })),
    ...content.milestones.slice(0, 4).map((milestone) => ({
      id: `mi-${milestone.id}`,
      lead: MILESTONE_LEADS[milestone.kind],
      text: [milestone.title, milestone.result, milestone.date].filter(Boolean).join(", "),
      href: milestone.href,
    })),
    ...view.extras.flatMap((section) =>
      section.items.map((item) => ({
        id: `ex-${item.id}`,
        lead: section.title,
        text: [item.title, item.subtitle, item.date, item.detail || item.lines[0]]
          .filter(Boolean)
          .join(", "),
        href: null,
      })),
    ),
  ];
  const hasWire = wire !== null || socials.length > 0 || classifieds.length > 0;

  const order = [
    hasSubject && { id: ID.subject, label: "The subject", title: "Testimony of the Trade" },
    plates.length > 0 && {
      id: ID.works,
      label: "The works",
      title: "Machinery Lately Constructed",
    },
    hasColumns && {
      id: ID.columns,
      label: "The columns",
      title: content.writing.length > 0 ? "The Columns" : "From the Lectern",
    },
    hasAppointments && {
      id: ID.appointments,
      label: "Appointments",
      title: "Appointments & Advertisements",
    },
    hasWire && { id: ID.wire, label: "Correspondence", title: "Telegrams to the Editor" },
  ].filter((item) => item !== false);
  const letter = (id: string) =>
    String.fromCharCode(66 + order.findIndex((item) => item.id === id));
  const page = (id: string) => {
    const at = order.findIndex((item) => item.id === id);
    return at === order.length - 1 ? "Back page" : `Page ${at + 2}`;
  };

  const almanac = [
    content.location?.label
      ? { label: "Filed from", value: <span className="value">{content.location.label}</span> }
      : null,
    content.location?.timezone
      ? { label: "Local time", value: <LocalTime timeZone={content.location.timezone} /> }
      : null,
    content.availability
      ? {
          label: "Status",
          value: (
            <span className="value">{content.availability.short || content.availability.text}</span>
          ),
        }
      : null,
    content.disciplines.length > 0
      ? { label: "Trades", value: <span className="value">{content.disciplines.join(" · ")}</span> }
      : null,
  ].filter((row) => row !== null);

  const notices = [
    content.availability?.open && content.availability.text
      ? { lead: "To recruiters —", body: `${content.availability.text}.` }
      : null,
    content.email
      ? { lead: "To correspondents —", body: `Letters reach the desk at ${content.email}.` }
      : null,
    resumeHref
      ? { lead: "To the hiring desk —", body: "The complete record is filed with this edition." }
      : null,
  ].filter((row) => row !== null);

  return (
    <div className="pf-gazette" id={ID.top}>
      <TemplateStyle css={GAZETTE_CSS} />
      <RevealOnScroll />
      <div className="sheet">
        <div className="ticker" aria-hidden>
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <span className="ticker-run" key={copy}>
                {ticker.map((item, i) => (
                  <span className="ticker-item" key={i}>
                    {item}
                    <Star />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <header className="mast">
          <div className="top">
            <span className="rise r1">No. 001</span>
            <span className="rise r2 motto">All the Work That Is Fit to Ship.</span>
            <span className="rise r3 price">2¢</span>
          </div>
          <div className="plate-row">
            <div className="ear weather">
              <span className="ear-label">The Weather.</span>
              <span className="ear-text">
                {city ? `Fair over ${city}.` : "Fair and settled."} Deploys expected before noon.
              </span>
            </div>
            <h1 className="nameplate" style={{ "--chars": 10 + surname.length } as CSSProperties}>
              <span className="sr-only">{name} — </span>
              <Star className="fleuron-l" />
              <span className="np-word w1">The</span> <span className="np-word w2">Daily</span>{" "}
              <span className="np-word w3">{surname}</span>
              <Star className="fleuron-r" />
            </h1>
            <div className="ear press" aria-hidden>
              <span className="ear-label">The Press.</span>
              <svg viewBox="0 0 100 100" className="seal">
                <defs>
                  <path id="pf-gazette-seal-top" d="M 15,50 A 35,35 0 0 1 85,50" />
                  <path id="pf-gazette-seal-bot" d="M 9.5,50 A 40.5,40.5 0 0 0 90.5,50" />
                </defs>
                <circle className="seal-ring" cx="50" cy="50" r="47.5" />
                <circle className="seal-inner" cx="50" cy="50" r="26" />
                <text textAnchor="middle" className="seal-arc">
                  <textPath href="#pf-gazette-seal-top" startOffset="50%">
                    {`The Daily ${surname}`.slice(0, 22)}
                  </textPath>
                </text>
                <text textAnchor="middle" className="seal-arc">
                  <textPath href="#pf-gazette-seal-bot" startOffset="50%">
                    Morning Edition
                  </textPath>
                </text>
                <text x="50" y="58" textAnchor="middle" className="seal-mono">
                  {content.initials}
                </text>
                {year ? (
                  <text x="50" y="67" textAnchor="middle" className="seal-est">
                    Est. {year}
                  </text>
                ) : null}
              </svg>
            </div>
          </div>
          <div className="folio">
            <span>Morning Edition{edition ? ` — ${edition}` : ""}</span>
            <span className="folio-place">
              {city ? `${city} & the wider web` : "The wider web"}
            </span>
            {resumeHref ? (
              <a className="folio-link" href={resumeHref}>
                <Hand />
                <span>Resume</span>
              </a>
            ) : (
              <span className="folio-link">{name}</span>
            )}
          </div>
        </header>

        <section className="front" aria-label="Front page">
          <div className="story">
            <p className="kicker rise r2">
              Late intelligence — {content.disciplines[0] || "the trade"}
            </p>
            <h2
              className="headline rise r3"
              data-long={(headline || name).length > 28 ? "" : undefined}
            >
              {headline || name}
              <span className="dot">.</span>
            </h2>
            {dek ? <p className="dek">{dek}</p> : null}
            <p className="byline">
              By {name} — {city ? `wired from ${city}` : "wired from the scene"}
            </p>
            {about.length > 0 ? (
              <div
                className="body"
                data-cols={about.join(" ").length > TWO_COLUMNS ? "2" : undefined}
              >
                {content.aboutParts.map((parts, index) => (
                  <p key={index} className={index === 0 ? "lead-para" : undefined}>
                    <Marked parts={parts} mark="em" />
                  </p>
                ))}
                {order.length > 0 ? (
                  <p className="closer">
                    The full particulars appear in the columns below. — <span>Ed.</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            {stats.length > 0 ? (
              <dl className="figures" aria-label="By the figures">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <aside className="rail">
            <figure className="portrait">
              <div className="engraving" style={ink(seedOf(name))} aria-hidden>
                <span>{content.initials || name.slice(0, 1)}</span>
              </div>
              <figcaption>
                {name}
                {headline ? `, ${headline}` : ""} — <em>engraved for this edition</em>
              </figcaption>
            </figure>
            {order.length > 0 ? (
              <nav className="box" aria-label="In this edition">
                <p className="box-title">In this edition</p>
                <ul className="index">
                  {order.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`}>
                        <span>{item.title}</span>
                        <Hand />
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </aside>
          {almanac.length > 0 || notices.length > 0 || lately.length > 0 ? (
            <div className="strip">
              {almanac.length > 0 ? (
                <div className="box">
                  <p className="box-title">The Almanac</p>
                  <dl className="almanac">
                    {almanac.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="box-foot">The stars accept no tickets.</p>
                </div>
              ) : null}
              {notices.length > 0 ? (
                <div className="box">
                  <p className="box-title">Notices to correspondents</p>
                  <ul className="notices">
                    {notices.map((notice) => (
                      <li key={notice.lead}>
                        <b>{notice.lead}</b> {notice.body}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lately.length > 0 ? (
                <div className="box">
                  <p className="box-title">Lately at the bench</p>
                  <dl className="almanac">
                    {lately.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd className="plain">{item.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </div>
          ) : null}
          {order[0] ? (
            <a className="cue" href={`#${order[0].id}`}>
              <span>Turn the page</span>
              <Caret />
            </a>
          ) : null}
        </section>

        {hasSubject ? (
          <section className="section" id={ID.subject} aria-label="The subject">
            <Band
              letter={letter(ID.subject)}
              label="The subject"
              note="Related to this desk, at some length"
              page={page(ID.subject)}
            />
            <div className="inner">
              <Head
                kicker="The profile piece"
                title="What the trade says"
                line="Testimony taken in the subject's absence"
              />
              {testimonials.length > 0 ? (
                <div className="testimony">
                  {testimonials.map((quote, i) => (
                    <figure key={quote.id} className="quote" data-reveal>
                      <span className="quote-no">{roman(i + 1)}</span>
                      <blockquote>“{quote.quote}”</blockquote>
                      <figcaption>
                        <OutLink href={quote.href}>{quote.name}</OutLink>
                        {quote.role ? <em>, {quote.role}</em> : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {resumeHref ? (
          <aside className="advert wide" aria-label="Resume">
            <p className="advert-label">— Advertisement —</p>
            <p className="advert-title big">
              Obtain the subject’s papers<span className="dot">!</span>
            </p>
            <p className="advert-line">
              The record in full, dispatched to your reading-room by electronic post.
            </p>
            <div className="btns center">
              <a className="btn" href={resumeHref}>
                <Hand />
                <span>Read the Resume</span>
              </a>
            </div>
            <p className="advert-foot">The complete record, folded for the pocket.</p>
          </aside>
        ) : null}

        {plates.length > 0 ? (
          <section className="section" id={ID.works} aria-label="The works">
            <Band
              letter={letter(ID.works)}
              label="The works"
              note="Assembled on the premises"
              page={page(ID.works)}
            />
            <div className="inner">
              <Head
                kicker="From the workshop floor"
                title="Machinery lately constructed"
                line="One account, continued overleaf"
              />
              <div className="plates">
                {plates.map((project, index) => (
                  <Plate key={project.id} project={project} index={index} />
                ))}
              </div>
              {others.length > 0 ? (
                <div className="also" data-reveal>
                  <p className="rule-title">
                    <span>Also from the workshop</span>
                  </p>
                  <ul>
                    {others.map((project, i) => (
                      <li key={project.id}>
                        <span className="also-no">No. {PLATES + i + 1}</span>
                        <div>
                          <h3>
                            <OutLink href={project.website?.href ?? project.source?.href ?? null}>
                              {project.name}
                            </OutLink>
                          </h3>
                          {project.line || project.description ? (
                            <p>{project.line || project.description}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasColumns ? (
          <section className="section" id={ID.columns} aria-label="The columns">
            <Band
              letter={letter(ID.columns)}
              label="The columns"
              note="Occasional, set as they occur"
              page={page(ID.columns)}
            />
            <div className="inner split">
              <div className="col-intro" data-reveal>
                <h2 className="sec-title left">
                  {content.writing.length > 0 ? "The columns" : "From the lectern"}
                  <span className="dot">.</span>
                </h2>
                <p className="col-dek">
                  {content.writing.length > 0
                    ? `A standing column on the trade and whatever else the week produced. ${content.writing.length} to date; no schedule promised.`
                    : `Addresses delivered to societies and meetings. ${content.talks.length} on the record.`}
                </p>
              </div>
              <div className="col-lists">
                {content.writing.length > 0 ? (
                  <div className="col-list" data-reveal>
                    <p className="list-title">Lately set in type</p>
                    <ol>
                      {content.writing.map((post, i) => (
                        <li key={post.id}>
                          <span className="numeral">{roman(content.writing.length - i)}</span>
                          <div>
                            <h3>
                              <OutLink href={post.href}>{post.title}</OutLink>
                            </h3>
                            <p className="meta">
                              {[
                                post.date,
                                post.minutes ? `${post.minutes} min` : "",
                                post.publisher,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {content.talks.length > 0 ? (
                  <div className="col-list" data-reveal>
                    <p className="list-title">Addresses delivered</p>
                    <ol>
                      {content.talks.map((talk, i) => (
                        <li key={talk.id}>
                          <span className="numeral">{roman(i + 1)}</span>
                          <div>
                            <h3>
                              <OutLink href={talk.href ?? talk.recording ?? talk.slides}>
                                {talk.title}
                              </OutLink>
                            </h3>
                            <p className="meta">
                              {[talk.event, talk.place, talk.date].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {hasAppointments ? (
          <section className="section" id={ID.appointments} aria-label="Appointments">
            <Band
              letter={letter(ID.appointments)}
              label="Appointments"
              note="Entered in reverse order of occurrence"
              page={page(ID.appointments)}
            />
            <div className="inner split wide-left">
              <div>
                <header className="sec-head left" data-reveal>
                  <p className="kicker">The service column</p>
                  <h2 className="sec-title left">
                    {content.experience.length > 0
                      ? view.titles.experience || "Appointments"
                      : view.titles.skills || "Skills"}
                    <span className="dot">.</span>
                  </h2>
                  <p className="sec-line">Professional postings — enquiries entertained.</p>
                </header>
                {content.experience.length > 0 ? (
                  <ul className="appts">
                    {content.experience.map((job) => (
                      <Appointment key={job.id} job={job} />
                    ))}
                  </ul>
                ) : null}
              </div>
              {skillGroups.length > 0 ? (
                <div className="adverts">
                  {skillGroups.map((group) => (
                    <Advert key={group.id} label={group.label} items={group.items} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasWire ? (
          <section className="section" id={ID.wire} aria-label="Correspondence">
            <Band
              letter={letter(ID.wire)}
              label="Correspondence"
              note="Inland rate, two cents"
              page={page(ID.wire)}
            />
            <div className="inner">
              {wire ? (
                <>
                  <Head
                    kicker="The wire desk"
                    title="Telegrams to the editor"
                    line="All wires answered within two days"
                  />
                  <div className="postcard" data-reveal>
                    <p className="pc-title">Post card</p>
                    <p className="pc-sub">
                      The address only to be written on this side — inland rate, 2¢
                    </p>
                    <div className="pc-grid">
                      <div className="pc-message">
                        <p className="pc-label">The message — economy of words appreciated</p>
                        <p className="pc-lines">
                          Dear {content.first || name}, I have seen the machinery and wish to
                          discuss it.
                        </p>
                      </div>
                      <div className="pc-address">
                        <span className="pc-stamp" aria-hidden>
                          <Fleuron />
                          <b>2¢</b>
                          <small>Electronic post</small>
                        </span>
                        <p className="pc-label">To —</p>
                        <p className="pc-to">
                          {name}
                          {headline ? `, ${headline}` : ""}
                        </p>
                        {city ? <p className="pc-to">{city}</p> : null}
                        <p className="pc-label">Or by wire —</p>
                        <ul className="pc-wires">
                          {content.email ? (
                            <li>
                              <a href={`mailto:${content.email}`}>{content.email}</a>
                            </li>
                          ) : null}
                          {socials.map((social) => (
                            <li key={social.href}>
                              <OutLink href={social.href}>{social.handle || social.label}</OutLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="pc-foot">
                      <span>Response window — 48 hours</span>
                      <OutLink href={wire} className="btn">
                        <span>Post it</span>
                        <Hand />
                      </OutLink>
                    </div>
                  </div>
                </>
              ) : null}
              {classifieds.length > 0 || socials.length > 0 ? (
                <div className="classifieds" data-reveal>
                  <p className="rule-title">
                    <span>Classified advertisements</span>
                  </p>
                  <ul>
                    {classifieds.map((item) => (
                      <li key={item.id}>
                        <b>{item.lead} —</b>{" "}
                        {item.href ? <OutLink href={item.href}>{item.text}</OutLink> : item.text}
                      </li>
                    ))}
                    {socials.length > 0 ? (
                      <li>
                        <b>Notice —</b> The proprietor receives callers at{" "}
                        {socials.map((social, i) => (
                          <span key={social.href}>
                            {i > 0 ? (i === socials.length - 1 ? " and " : ", ") : ""}
                            <OutLink href={social.href}>{social.label}</OutLink>
                          </span>
                        ))}
                        .
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="finale">
          <p
            className="finale-name"
            aria-hidden
            style={{ "--len": surname.length } as CSSProperties}
          >
            <span>{surname}</span>
          </p>
          <p className="colophon">
            Thus concludes the morning edition · set in Fraktur &amp; Old Standard · printed on
            recycled electrons
          </p>
          <p className="colophon">
            © {year ? `${year} ` : ""}
            {name}, proprietor <Fleuron />
          </p>
          {footer ? <div className="credit">{footer}</div> : null}
        </footer>
      </div>
    </div>
  );
}
