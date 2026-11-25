import type { CSSProperties, ReactNode } from "react";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { rich } from "@/i18n/rich";
import type {
  ContentProject,
  ContentRole,
  MilestoneKind,
  PortfolioContentView,
} from "@/lib/portfolio/content";
import type { PortfolioView } from "@/lib/portfolio/view";
import {
  designFormat,
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
import type { DesignWords, PortfolioTemplateProps } from "../types";
import { LocalTime } from "./on-demand";
import { Caret, Fleuron, Hand, Star } from "./ornaments";
import { GAZETTE_CSS } from "./styles";

// Ported from JoaccoG/portfolio-v2, "The Daily Godoy" (MIT, see ./LICENSE.txt). Its portrait,
// photographs and written copy are the author's own and are not used.

type Words = DesignWords["gazette"];

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
const EDITION_DATE = {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
} as const satisfies Intl.DateTimeFormatOptions;
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
function editionDate(ms: number, format: Format): string | null {
  if (new Date(ms).getUTCFullYear() < 2000) return null;
  return format.date(ms, EDITION_DATE);
}

function surnameOf(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

function tickerOf(
  view: PortfolioView,
  content: PortfolioContentView,
  aboutShown: boolean,
  t: Words,
): string[] {
  const items = [
    ...content.experience
      .filter((job) => job.highlight && job.company)
      .map((job) => fmt(t.tickerAt, { highlight: job.highlight, company: job.company })),
    ...content.projects.filter((p) => p.outcome).map((p) => `${p.name}: ${p.outcome}`),
    ...content.milestones.map((milestone) => milestone.title),
    ...(aboutShown ? content.stats.map((stat) => `${stat.value} ${stat.label}`) : []),
  ].filter(Boolean);
  const found =
    items.length > 0
      ? items.slice(0, TICKER_MAX)
      : content.disciplines.length > 0
        ? content.disciplines
        : [content.headline || view.headline || t.tickerFallback];
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
  t,
}: {
  letter: string;
  label: string;
  note: string;
  page: string;
  t: Words;
}) {
  return (
    <div className="band" aria-hidden>
      <span className="band-tab">{fmt(t.section, { letter })}</span>
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

function PlateArt({ project, index, t }: { project: ContentProject; index: number; t: Words }) {
  const random = seeded(seedOf(project.name));
  const pattern = PATTERNS[Math.floor(random() * PATTERNS.length)]!;
  const style = {
    ...ink(Math.floor(random() * 1000)),
    "--x": `${Math.round(45 + random() * 30)}%`,
    "--y": `${Math.round(35 + random() * 30)}%`,
  } as CSSProperties;
  return (
    <div className="plate-art" data-pattern={pattern} style={style} aria-hidden>
      <span className="plate-no">{fmt(t.plate.number, { number: index + 1 })}</span>
      <span className="plate-name">{project.name}</span>
      {project.line ? <span className="plate-line">{project.line}</span> : null}
      {project.active || project.featured ? (
        <span className="stamp">
          <b>{project.active ? t.plate.active : t.plate.featured}</b>
          <small>{t.plate.inspector}</small>
        </span>
      ) : null}
    </div>
  );
}

function Plate({ project, index, t }: { project: ContentProject; index: number; t: Words }) {
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
      <PlateArt project={project} index={index} t={t} />
      <div className="plate-text">
        <p className="kicker">
          {fmt(t.number, { number: index + 1 })}
          {meta ? ` — ${meta}` : ""}
        </p>
        <h3 className="plate-title">
          {project.name}
          <span className="dot">.</span>
        </h3>
        {story ? <p className="plate-dek">{story}</p> : null}
        {project.tech.length > 0 ? (
          <p className="composed">{fmt(t.plate.composed, { tech: project.tech.join(", ") })}</p>
        ) : null}
        {project.outcome ? <p className="outcome">{project.outcome}</p> : null}
        <div className="btns">
          {project.website ? <Btn href={project.website.href}>{t.plate.visit}</Btn> : null}
          {project.source ? <Btn href={project.source.href}>{t.plate.source}</Btn> : null}
        </div>
        {more.length > 0 ? (
          <details className="account">
            <summary className="btn">
              <Hand />
              <span>{t.plate.more}</span>
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

function Appointment({ job, t }: { job: ContentRole; t: Words }) {
  const line = job.summary || job.lines[0] || "";
  const rest = job.summary ? job.lines : job.lines.slice(1);
  const role = [job.title, job.company].filter(Boolean).join(", ");
  return (
    <li className="appt" data-reveal>
      <p className={job.current ? "appt-date now" : "appt-date"}>
        {job.current
          ? fmt(t.today, { start: unbroken(job.start || job.dates) })
          : unbroken(job.dates)}
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
  t,
}: {
  label: string;
  items: { name: string; years: number | null }[];
  t: Words;
}) {
  const [first, ...rest] = items;
  if (!first) return null;
  const years = Math.max(0, ...items.map((item) => item.years ?? 0));
  const shown = label || t.advert.skills;
  return (
    <div className="advert" data-reveal>
      <p className="advert-label">{t.advert.label}</p>
      <p className="advert-title">
        <em>{first.name}</em>
        {rest.length > 0 ? `, ${rest.map((item) => item.name).join(", ")}` : ""}
      </p>
      <p className="advert-line">
        {years > 1
          ? fmt(t.advert.years, { label: shown, count: years })
          : fmt(t.advert.daily, { label: shown })}
      </p>
    </div>
  );
}

export function GazetteTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.gazette;
  const format = designFormat(view);
  const name = nameOf(view, words.shared.untitled);
  const surname = surnameOf(name);
  const nameplate = `${t.nameplate.the} ${t.nameplate.daily} `;
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
  const edition = editionDate(printed, format);
  const year = edition ? new Date(printed).getUTCFullYear() : null;
  // Numbers, kind words and the now list belong to About and hide with it.
  const aboutShown = !view.hidden.includes("about");
  const ticker = tickerOf(view, content, aboutShown, t);
  const stats = aboutShown ? content.stats : [];
  const testimonials = aboutShown ? content.testimonials : [];
  const lately = aboutShown ? (content.now?.items ?? []) : [];
  const hasSubject = testimonials.length > 0;
  const hasColumns = content.writing.length > 0 || content.talks.length > 0;
  const hasAppointments = content.experience.length > 0 || skillGroups.length > 0;
  const leads: Record<MilestoneKind, string> = t.leads;
  const classifieds = [
    ...content.education.map((school) => ({
      id: `ed-${school.id}`,
      lead: t.leads.school,
      text: [school.degree, school.school, school.dates].filter(Boolean).join(", "),
      href: school.website?.href ?? null,
    })),
    ...view.certifications.map((cert) => ({
      id: `ce-${cert.id}`,
      lead: t.leads.certificate,
      text: [cert.name, cert.issuer, cert.date].filter(Boolean).join(", "),
      href: null,
    })),
    ...content.milestones.slice(0, 4).map((milestone) => ({
      id: `mi-${milestone.id}`,
      lead: leads[milestone.kind],
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
  const [callersBefore = "", callersAfter = ""] = t.wire.callers.split("{links}");

  const order = [
    hasSubject && { id: ID.subject, title: t.sections.subject },
    plates.length > 0 && { id: ID.works, title: t.sections.works },
    hasColumns && {
      id: ID.columns,
      title: content.writing.length > 0 ? t.sections.columns : t.sections.lectern,
    },
    hasAppointments && { id: ID.appointments, title: t.sections.appointments },
    hasWire && { id: ID.wire, title: t.sections.wire },
  ].filter((item) => item !== false);
  const letter = (id: string) =>
    String.fromCharCode(66 + order.findIndex((item) => item.id === id));
  const page = (id: string) => {
    const at = order.findIndex((item) => item.id === id);
    return at === order.length - 1 ? t.backPage : fmt(t.page, { number: at + 2 });
  };

  const almanac = [
    content.location?.label
      ? {
          label: t.almanac.filed,
          value: <span className="value">{content.location.label}</span>,
        }
      : null,
    content.location?.timezone
      ? {
          label: t.almanac.time,
          value: <LocalTime timeZone={content.location.timezone} locale={format.locale} />,
        }
      : null,
    content.availability
      ? {
          label: t.almanac.status,
          value: (
            <span className="value">{content.availability.short || content.availability.text}</span>
          ),
        }
      : null,
    content.disciplines.length > 0
      ? {
          label: t.almanac.trades,
          value: <span className="value">{content.disciplines.join(" · ")}</span>,
        }
      : null,
  ].filter((row) => row !== null);

  const notices = [
    content.availability?.open && content.availability.text
      ? { lead: t.notices.recruiters, body: `${content.availability.text}.` }
      : null,
    content.email
      ? {
          lead: t.notices.correspondents,
          body: fmt(t.notices.letters, { email: content.email }),
        }
      : null,
    resumeHref ? { lead: t.notices.hiring, body: t.notices.record } : null,
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
            <span className="rise r1">{t.issue}</span>
            <span className="rise r2 motto">{t.motto}</span>
            <span className="rise r3 price">2¢</span>
          </div>
          <div className="plate-row">
            <div className="ear weather">
              <span className="ear-label">{t.weather.label}</span>
              <span className="ear-text">
                {city ? fmt(t.weather.city, { city }) : t.weather.none}
              </span>
            </div>
            <h1
              className="nameplate"
              style={{ "--chars": nameplate.length + surname.length } as CSSProperties}
            >
              <span className="sr-only">{name} — </span>
              <Star className="fleuron-l" />
              <span className="np-word w1">{t.nameplate.the}</span>{" "}
              <span className="np-word w2">{t.nameplate.daily}</span>{" "}
              <span className="np-word w3">{surname}</span>
              <Star className="fleuron-r" />
            </h1>
            <div className="ear press" aria-hidden>
              <span className="ear-label">{t.press}</span>
              <svg viewBox="0 0 100 100" className="seal">
                <defs>
                  <path id="pf-gazette-seal-top" d="M 15,50 A 35,35 0 0 1 85,50" />
                  <path id="pf-gazette-seal-bot" d="M 9.5,50 A 40.5,40.5 0 0 0 90.5,50" />
                </defs>
                <circle className="seal-ring" cx="50" cy="50" r="47.5" />
                <circle className="seal-inner" cx="50" cy="50" r="26" />
                <text textAnchor="middle" className="seal-arc">
                  <textPath href="#pf-gazette-seal-top" startOffset="50%">
                    {`${nameplate}${surname}`.slice(0, 22)}
                  </textPath>
                </text>
                <text textAnchor="middle" className="seal-arc">
                  <textPath href="#pf-gazette-seal-bot" startOffset="50%">
                    {t.edition}
                  </textPath>
                </text>
                <text x="50" y="58" textAnchor="middle" className="seal-mono">
                  {content.initials}
                </text>
                {year ? (
                  <text x="50" y="67" textAnchor="middle" className="seal-est">
                    {fmt(t.est, { year })}
                  </text>
                ) : null}
              </svg>
            </div>
          </div>
          <div className="folio">
            <span>{edition ? fmt(t.editionOn, { date: edition }) : t.edition}</span>
            <span className="folio-place">{city ? fmt(t.place, { city }) : t.placeNone}</span>
            {resumeHref ? (
              <a className="folio-link" href={resumeHref}>
                <Hand />
                <span>{t.resume}</span>
              </a>
            ) : (
              <span className="folio-link">{name}</span>
            )}
          </div>
        </header>

        <section className="front" aria-label={t.front}>
          <div className="story">
            <p className="kicker rise r2">
              {fmt(t.late, { topic: content.disciplines[0] || t.trade })}
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
              {city ? fmt(t.byline, { name, city }) : fmt(t.bylineNone, { name })}
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
                  <p className="closer">{rich(t.closer, { b: (chunk) => <span>{chunk}</span> })}</p>
                ) : null}
              </div>
            ) : null}
            {stats.length > 0 ? (
              <dl className="figures" aria-label={t.figures}>
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
                {headline ? `, ${headline}` : ""} — <em>{t.engraved}</em>
              </figcaption>
            </figure>
            {order.length > 0 ? (
              <nav className="box" aria-label={t.contents}>
                <p className="box-title">{t.contents}</p>
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
                  <p className="box-title">{t.almanac.title}</p>
                  <dl className="almanac">
                    {almanac.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="box-foot">{t.almanac.foot}</p>
                </div>
              ) : null}
              {notices.length > 0 ? (
                <div className="box">
                  <p className="box-title">{t.notices.title}</p>
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
                  <p className="box-title">{t.lately}</p>
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
              <span>{t.turn}</span>
              <Caret />
            </a>
          ) : null}
        </section>

        {hasSubject ? (
          <section className="section" id={ID.subject} aria-label={t.subject.label}>
            <Band
              letter={letter(ID.subject)}
              label={t.subject.label}
              note={t.subject.note}
              page={page(ID.subject)}
              t={t}
            />
            <div className="inner">
              <Head kicker={t.subject.kicker} title={t.subject.title} line={t.subject.line} />
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
          <aside className="advert wide" aria-label={t.resume}>
            <p className="advert-label">{t.advert.label}</p>
            <p className="advert-title big">
              {t.papers.title}
              <span className="dot">!</span>
            </p>
            <p className="advert-line">{t.papers.line}</p>
            <div className="btns center">
              <a className="btn" href={resumeHref}>
                <Hand />
                <span>{t.papers.read}</span>
              </a>
            </div>
            <p className="advert-foot">{t.papers.foot}</p>
          </aside>
        ) : null}

        {plates.length > 0 ? (
          <section className="section" id={ID.works} aria-label={t.works.label}>
            <Band
              letter={letter(ID.works)}
              label={t.works.label}
              note={t.works.note}
              page={page(ID.works)}
              t={t}
            />
            <div className="inner">
              <Head kicker={t.works.kicker} title={t.works.title} line={t.works.line} />
              <div className="plates">
                {plates.map((project, index) => (
                  <Plate key={project.id} project={project} index={index} t={t} />
                ))}
              </div>
              {others.length > 0 ? (
                <div className="also" data-reveal>
                  <p className="rule-title">
                    <span>{t.works.also}</span>
                  </p>
                  <ul>
                    {others.map((project, i) => (
                      <li key={project.id}>
                        <span className="also-no">{fmt(t.number, { number: PLATES + i + 1 })}</span>
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
          <section className="section" id={ID.columns} aria-label={t.columns.label}>
            <Band
              letter={letter(ID.columns)}
              label={t.columns.label}
              note={t.columns.note}
              page={page(ID.columns)}
              t={t}
            />
            <div className="inner split">
              <div className="col-intro" data-reveal>
                <h2 className="sec-title left">
                  {content.writing.length > 0 ? t.columns.writing : t.columns.lectern}
                  <span className="dot">.</span>
                </h2>
                <p className="col-dek">
                  {content.writing.length > 0
                    ? fmt(t.columns.writingDek, { count: content.writing.length })
                    : fmt(t.columns.talksDek, { count: content.talks.length })}
                </p>
              </div>
              <div className="col-lists">
                {content.writing.length > 0 ? (
                  <div className="col-list" data-reveal>
                    <p className="list-title">{t.columns.set}</p>
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
                                post.minutes ? fmt(t.columns.minutes, { count: post.minutes }) : "",
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
                    <p className="list-title">{t.columns.talks}</p>
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
          <section className="section" id={ID.appointments} aria-label={t.appointments.label}>
            <Band
              letter={letter(ID.appointments)}
              label={t.appointments.label}
              note={t.appointments.note}
              page={page(ID.appointments)}
              t={t}
            />
            <div className="inner split wide-left">
              <div>
                <header className="sec-head left" data-reveal>
                  <p className="kicker">{t.appointments.kicker}</p>
                  <h2 className="sec-title left">
                    {content.experience.length > 0
                      ? view.titles.experience || t.appointments.title
                      : view.titles.skills || t.advert.skills}
                    <span className="dot">.</span>
                  </h2>
                  <p className="sec-line">{t.appointments.line}</p>
                </header>
                {content.experience.length > 0 ? (
                  <ul className="appts">
                    {content.experience.map((job) => (
                      <Appointment key={job.id} job={job} t={t} />
                    ))}
                  </ul>
                ) : null}
              </div>
              {skillGroups.length > 0 ? (
                <div className="adverts">
                  {skillGroups.map((group) => (
                    <Advert key={group.id} label={group.label} items={group.items} t={t} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasWire ? (
          <section className="section" id={ID.wire} aria-label={t.wire.label}>
            <Band
              letter={letter(ID.wire)}
              label={t.wire.label}
              note={t.wire.note}
              page={page(ID.wire)}
              t={t}
            />
            <div className="inner">
              {wire ? (
                <>
                  <Head kicker={t.wire.kicker} title={t.wire.title} line={t.wire.line} />
                  <div className="postcard" data-reveal>
                    <p className="pc-title">{t.wire.card}</p>
                    <p className="pc-sub">{t.wire.cardLine}</p>
                    <div className="pc-grid">
                      <div className="pc-message">
                        <p className="pc-label">{t.wire.message}</p>
                        <p className="pc-lines">
                          {fmt(t.wire.dear, { name: content.first || name })}
                        </p>
                      </div>
                      <div className="pc-address">
                        <span className="pc-stamp" aria-hidden>
                          <Fleuron />
                          <b>2¢</b>
                          <small>{t.wire.stamp}</small>
                        </span>
                        <p className="pc-label">{t.wire.to}</p>
                        <p className="pc-to">
                          {name}
                          {headline ? `, ${headline}` : ""}
                        </p>
                        {city ? <p className="pc-to">{city}</p> : null}
                        <p className="pc-label">{t.wire.byWire}</p>
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
                      <span>{t.wire.window}</span>
                      <OutLink href={wire} className="btn">
                        <span>{t.wire.post}</span>
                        <Hand />
                      </OutLink>
                    </div>
                  </div>
                </>
              ) : null}
              {classifieds.length > 0 || socials.length > 0 ? (
                <div className="classifieds" data-reveal>
                  <p className="rule-title">
                    <span>{t.wire.classifieds}</span>
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
                        <b>{t.wire.notice}</b> {callersBefore}
                        {socials.map((social, i) => (
                          <span key={social.href}>
                            {i > 0 ? (i === socials.length - 1 ? ` ${t.wire.and} ` : ", ") : ""}
                            <OutLink href={social.href}>{social.label}</OutLink>
                          </span>
                        ))}
                        {callersAfter}
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
          <p className="colophon">{t.colophon}</p>
          <p className="colophon">
            © {year ? `${year} ` : ""}
            {fmt(t.proprietor, { name })} <Fleuron />
          </p>
          {footer ? <div className="credit">{footer}</div> : null}
        </footer>
      </div>
    </div>
  );
}
