import type { CSSProperties, ReactNode } from "react";
import { fmt } from "@/i18n/format";
import {
  allSkills,
  contactHref,
  designFormat,
  featuredFirst,
  nameOf,
  OutLink,
  safeId,
  TemplateStyle,
} from "../parts";
import type { DesignWords, PortfolioTemplateProps } from "../types";
import { PopIn } from "./on-demand";
import { Mascot, MascotDefs, type MascotKind } from "./mascots";
import { BUBBLE_CSS } from "./styles";

// Ported from Nuu-maan/portfolio-template (MIT, see ./LICENSE.txt): its loud, cute Y2K sections and mascots.

type Words = DesignWords["bubble"];
type Tone = "cream" | "ink" | "yellow" | "pink" | "blue" | "lavender";
const CYCLE: Tone[] = ["cream", "yellow", "pink", "blue", "lavender"];
const TINTS: Tone[] = ["pink", "blue", "lavender", "cream"];
const CAST: { kind: MascotKind; colors?: Record<string, string> }[] = [
  { kind: "mascot", colors: { body: "#7fd3f7", belly: "#fff", cheek: "#ff8fbf" } },
  { kind: "daisy", colors: { petal: "#fff", center: "#ffd24c", body: "#ff8fbf" } },
  { kind: "globe", colors: { body: "#ffd24c", land: "#ff6f9c" } },
  { kind: "hand" },
  { kind: "mascot", colors: { body: "#cdb6ff", belly: "#f1eaff", cheek: "#ff8fbf" } },
  { kind: "globe", colors: { body: "#7fd3f7", land: "#7ec96a" } },
];

const slug = (text: string) => safeId("x", text).slice(2);
const upper = (text: string) => text.toUpperCase();
// A brand name, written as the button shows it in every language.
const GITHUB_BUTTON = "⌘ GITHUB";
const appFile = (name: string) => `${slug(name)}.app`;

function Pill({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`pill ${className}`.trim()} data-c={tone}>
      {children}
    </span>
  );
}

function Win({
  title,
  tint = "cream",
  className = "",
  children,
}: {
  title: string;
  tint?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`win ${className}`.trim()} data-c={tint}>
      <div className="win-bar" aria-hidden>
        <i />
        <i />
        <i />
        <span className="win-title">{title}</span>
      </div>
      <div className="win-body">{children}</div>
    </div>
  );
}

function Actor({
  kind,
  colors,
  at,
  width,
  md = false,
  late,
  delay = 0,
}: {
  kind: MascotKind;
  colors?: Record<string, string>;
  at: { left?: string; right?: string };
  width: string;
  md?: boolean;
  late?: number;
  delay?: number;
}) {
  const style = {
    ...at,
    width,
    "--late": late !== undefined ? `${late}s` : undefined,
  } as CSSProperties;
  return (
    <div
      className={["actor", md && "md", late !== undefined && "enter"].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="bob" style={{ animationDelay: `${-delay}s` }}>
        <Mascot kind={kind} colors={colors} className="sticker" />
      </div>
    </div>
  );
}

function Sky({
  kind,
  at,
  width,
  speed = 30,
  md = false,
  className = "",
  colors,
}: {
  kind: MascotKind;
  at: CSSProperties;
  width: string;
  speed?: number;
  md?: boolean;
  className?: string;
  colors?: Record<string, string>;
}) {
  return (
    <div
      className={["sky", "drift", md && "md"].filter(Boolean).join(" ")}
      style={{ ...at, width, "--speed": speed } as CSSProperties}
      aria-hidden
    >
      <Mascot kind={kind} colors={colors} className={className} />
    </div>
  );
}

function Corners({
  left,
  chapter,
  right,
}: {
  left: string;
  chapter: string;
  right?: { tone: Tone; text: string } | null;
}) {
  return (
    <>
      <div className="corner l">
        <Pill tone="cream">{left}</Pill>
        <Pill tone="ink" className="hide-s">
          {chapter}
        </Pill>
      </div>
      {right ? (
        <div className="corner r">
          <Pill tone={right.tone}>{right.text}</Pill>
        </div>
      ) : null}
    </>
  );
}

function Marquee({ items, tone }: { items: string[]; tone: Tone }) {
  if (items.length === 0) return null;
  const base = Array.from({ length: Math.ceil(6 / items.length) }, () => items).flat();
  const half = [...base, ...base];
  return (
    <div className="marquee" data-c={tone} aria-hidden>
      <div className="marquee-track">
        {half.map((item, index) => (
          <span key={index}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function SayBubble({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="bubble-say">
      {top}
      <br />
      <em>{bottom}</em>
    </span>
  );
}

function weightOf(index: number, weights: Words["weights"]): string {
  return index < 2
    ? weights.primary
    : index === 2
      ? weights.medium
      : index === 3
        ? weights.light
        : weights.regular;
}

export function BubbleTemplate({
  view,
  content,
  words: designWords,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = designWords.bubble;
  const format = designFormat(view);
  const name = nameOf(view, designWords.shared.untitled);
  const words = name.split(/\s+/).filter(Boolean);
  const lines = words.length > 1 ? [words[0]!, words.slice(1).join(" ")] : [name];
  const chars = Math.max(4, ...lines.map((line) => line.length));
  const first = content.first || words[0] || name;
  const initials = content.initials || upper(name.slice(0, 1));
  const headline = view.headline || content.headline;
  const aboutShown = !view.hidden.includes("about");
  const year =
    view.updatedAt > Date.UTC(2000, 0, 1) ? new Date(view.updatedAt).getUTCFullYear() : null;
  const series = year ? `${initials}-${year}` : initials;
  const skills = allSkills(view);
  const projects = featuredFirst(content.projects);
  const jobs = content.experience;
  const socials = content.socials.filter((social) => social.kind !== "email");
  const hello = contactHref(content);
  const github = socials.find((social) => social.kind === "github") ?? null;
  const stats = aboutShown ? content.stats : [];
  const role = upper(headline.split(/\s+/).at(-1) ?? "");

  const heroBadge =
    "★ " +
    ([
      skills.length > 0
        ? format.plural(t.skillStack, skills.length)
        : projects.length > 0
          ? format.plural(t.builds, projects.length)
          : "",
      role ? `1 ${role}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || t.portfolio);
  const weights = content.disciplines.slice(0, 4).map((discipline) => {
    const [head = "", ...tail] = discipline.split(/\s+/);
    return { head: upper(head), tail: upper(tail.join(" ")) };
  });
  const secondary = resumeHref
    ? { href: resumeHref, label: t.resume }
    : github
      ? { href: github.href, label: GITHUB_BUTTON }
      : socials[0]
        ? { href: socials[0].href, label: `⌘ ${upper(socials[0].label)}` }
        : null;

  const known = content.skills
    .flatMap((group) => group.items)
    .filter((item) => item.years !== null);
  const specimen =
    known.length >= 3
      ? [...known].sort((a, b) => (b.years ?? 0) - (a.years ?? 0)).slice(0, 6)
      : (content.skills[0]?.items.slice(0, 6) ?? []);
  const specimenLabel = known.length >= 3 ? t.mostUsed : content.skills[0]?.label || t.skills;
  const tiles =
    stats.length > 0
      ? stats.slice(0, 2)
      : [
          projects.length > 0
            ? { value: String(projects.length), label: format.plural(t.shipped, projects.length) }
            : null,
          jobs.length > 0
            ? { value: String(jobs.length), label: format.plural(t.roles, jobs.length) }
            : null,
        ].filter((tile) => tile !== null);
  const wins = jobs.filter((job) => job.highlight);
  const current = jobs.find((job) => job.current && job.company);
  const kinds = [
    ...new Set(
      projects.map((project) => upper(project.category.split(/\s+·\s+/)[0] ?? "")).filter(Boolean),
    ),
  ].slice(0, 3);

  type Book = {
    id: string;
    file: string;
    rows: { id: string; what: string; href: string | null; meta: string }[];
  };
  const books: Book[] = [];
  if (content.education.length > 0)
    books.push({
      id: "school",
      file: t.files.school,
      rows: content.education.map((school) => ({
        id: school.id,
        what: school.school || school.degree,
        href: school.website?.href ?? null,
        meta: [school.school ? school.degree : "", school.dates].filter(Boolean).join(" · "),
      })),
    });
  if (content.milestones.length > 0 || view.certifications.length > 0)
    books.push({
      id: "wins",
      file: t.files.wins,
      rows: [
        ...content.milestones.map((item) => ({
          id: item.id,
          what: item.title,
          href: item.href,
          meta: [item.result, item.place, item.date].filter(Boolean).join(" · "),
        })),
        ...view.certifications.map((cert) => ({
          id: cert.id,
          what: cert.name,
          href: null,
          meta: [cert.issuer, cert.date].filter(Boolean).join(" · "),
        })),
      ],
    });
  if (content.writing.length > 0)
    books.push({
      id: "writing",
      file: t.files.writing,
      rows: content.writing.map((post) => ({
        id: post.id,
        what: post.title,
        href: post.href,
        meta: [post.date, post.minutes ? fmt(t.minutes, { minutes: post.minutes }) : ""]
          .filter(Boolean)
          .join(" · "),
      })),
    });
  if (content.talks.length > 0)
    books.push({
      id: "talks",
      file: t.files.talks,
      rows: content.talks.map((talk) => ({
        id: talk.id,
        what: talk.title,
        href: talk.href ?? talk.recording ?? talk.slides,
        meta: [talk.event, talk.date].filter(Boolean).join(" · "),
      })),
    });
  for (const extra of view.extras) {
    if (extra.items.length === 0) continue;
    books.push({
      id: extra.id,
      file: `~/${slug(extra.title)}.txt`,
      rows: extra.items.map((item) => ({
        id: item.id,
        what: item.title || item.subtitle,
        href: null,
        meta: [item.title ? item.subtitle : "", item.date, item.detail].filter(Boolean).join(" · "),
      })),
    });
  }

  const reach = [
    ...(content.email
      ? [{ key: t.email, value: content.email, href: `mailto:${content.email}` }]
      : []),
    ...socials.slice(0, 5).map((social) => ({
      key: upper(social.label),
      value: social.handle || social.label,
      href: social.href,
    })),
  ];

  const chapters = [
    "hero",
    ...(skills.length > 0 ? ["stack"] : []),
    ...(jobs.length > 0 ? ["jobs"] : []),
    ...(projects.length > 0 ? ["work"] : []),
    ...(books.length > 0 ? ["books"] : []),
    "contact",
  ];
  const no = (id: string) => String(chapters.indexOf(id) + 1).padStart(2, "0");
  const number = (id: string) => fmt(t.number, { no: no(id).padStart(3, "0") });
  const chapter = (id: string, title: string) => fmt(t.chapter, { no: no(id), name: title });

  return (
    <div className="pf-bubble" id="pf-bubble-top">
      <TemplateStyle css={BUBBLE_CSS} />
      <MascotDefs />
      <PopIn />

      <header className="sec" data-tone="sky">
        <Sky
          kind="cloud"
          at={{ top: "1.5rem", left: "10%" }}
          width="clamp(4rem, 9cqi, 8rem)"
          speed={-30}
        />
        <Sky
          kind="cloud"
          at={{ top: "2.5rem", right: "10%" }}
          width="clamp(5rem, 11cqi, 10rem)"
          speed={20}
        />
        <Sky kind="cloud" at={{ top: "36%", left: "0.5rem" }} width="7rem" speed={25} md />
        <Sky kind="cloud" at={{ top: "42%", right: "0.5rem" }} width="7rem" speed={-20} md />
        <Sky
          kind="star"
          at={{ top: "18%", left: "6%" }}
          width="3rem"
          speed={-40}
          className="sticker wobble"
          md
        />
        <Sky
          kind="sparkle"
          at={{ top: "26%", right: "8%" }}
          width="2.25rem"
          speed={30}
          className="sparkle"
        />
        <div className="corner l">
          <span className="mono-pill">◐ {initials}</span>
          <Pill tone="cream" className="hide-s">
            {series} — {number("hero")}
          </Pill>
        </div>
        {weights.length > 0 ? (
          <div className="corner r weights">
            {weights.map((weight, index) => (
              <span key={index} className="weight" data-c={CYCLE[index % CYCLE.length]}>
                {weight.head}
                {weight.tail ? <span className="sub">{weight.tail}</span> : null}
              </span>
            ))}
          </div>
        ) : null}
        <div className="inner hero-in">
          <div className="stage">
            <Pill tone="ink">{heroBadge}</Pill>
            <h1
              className="display hero-name t-stripe"
              style={{ "--chars": chars } as CSSProperties}
            >
              {lines.map((line, index) => (
                <span key={index}>{line}</span>
              ))}
            </h1>
            {content.pitch || headline ? <p className="bio">{content.pitch || headline}</p> : null}
          </div>
          {hello || secondary ? (
            <div className="ctas">
              {hello ? (
                <OutLink href={hello} className="btn btn-yellow">
                  {content.availability?.open ? t.hireMe : t.sayHi}
                </OutLink>
              ) : null}
              {secondary ? (
                <OutLink href={secondary.href} className="btn btn-cream">
                  {secondary.label}
                </OutLink>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="floor">
          <Actor
            kind="daisy"
            colors={{ petal: "#fff", center: "#ffd24c", body: "#7fd3f7" }}
            at={{ left: "3%" }}
            width="clamp(5rem, 10cqi, 10rem)"
            late={0.6}
          />
          <Actor
            kind="globe"
            colors={{ body: "#7fd3f7", land: "#7ec96a" }}
            at={{ left: "24%" }}
            width="clamp(6rem, 11cqi, 11rem)"
            late={0.7}
            delay={1.5}
          />
          <div className="say" style={{ left: "43%", bottom: "92%" }}>
            <span style={{ display: "inline-block", rotate: "-3deg" }}>
              <SayBubble
                top={(content.disciplines[0] || headline || t.say.my).toLowerCase()}
                bottom={t.say.portfolio}
              />
            </span>
          </div>
          <Actor
            kind="globe"
            colors={{ body: "#ffd24c", land: "#ff6f9c" }}
            at={{ left: "52%" }}
            width="clamp(6rem, 11cqi, 11rem)"
            md
            late={0.75}
            delay={3}
          />
          <Actor
            kind="mascot"
            colors={{ body: "#cdb6ff", belly: "#f1eaff", cheek: "#ff8fbf" }}
            at={{ right: "22%" }}
            width="8rem"
            md
            late={0.5}
            delay={0.8}
          />
          <Actor
            kind="hand"
            at={{ right: "3%" }}
            width="clamp(5rem, 9cqi, 9rem)"
            late={0.8}
            delay={2}
          />
        </div>
        <span className="cue bob" aria-hidden>
          {t.scroll}
        </span>
      </header>

      {skills.length > 0 ? (
        <section className="sec" data-tone="sky" aria-labelledby="pf-bubble-stack">
          <Sky
            kind="cloud"
            at={{ top: "1rem", left: "6%" }}
            width="clamp(4rem, 8cqi, 7rem)"
            speed={-25}
          />
          <Sky
            kind="cloud"
            at={{ top: "0.5rem", right: "8%" }}
            width="clamp(5rem, 10cqi, 9rem)"
            speed={20}
          />
          <Sky
            kind="star"
            at={{ top: "18%", left: "44%" }}
            width="3rem"
            speed={-50}
            className="sticker wobble"
            md
          />
          <Sky
            kind="sparkle"
            at={{ top: "24%", right: "20%" }}
            width="2rem"
            speed={40}
            className="sparkle"
            md
          />
          <Corners
            left={number("stack")}
            chapter={chapter("stack", t.chapters.stack)}
            right={{ tone: "yellow", text: format.plural(t.skillsCount, skills.length) }}
          />
          <div className="inner">
            <div className="two">
              <div className="first">
                <Pill tone="ink" className="reveal">
                  ▷ {chapter("stack", t.chapters.toolbelt)}
                </Pill>
                <h2
                  className="display title-xl t-stripe-sm reveal"
                  id="pf-bubble-stack"
                  style={{ marginTop: "1rem" }}
                >
                  {t.stackTitle.top}
                  <br />
                  <span className="pink">{t.stackTitle.bottom}</span>
                </h2>
                <p className="lede reveal">{t.stackLede}</p>
                <div className="chip-rows">
                  {view.skills.map((group, groupIndex) => (
                    <div key={group.id} className="chip-row reveal">
                      <span className="chip-label">{group.label || t.skills}</span>
                      {group.items.map((item, index) => (
                        <span
                          key={item}
                          className="chip"
                          data-c={CYCLE[(index + groupIndex) % CYCLE.length]}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: "1.25rem", alignContent: "start" }}>
                <Win title={fmt(t.files.stack, { user: slug(first) })} className="reveal">
                  <div className="specimen">
                    <span className="word group">{specimenLabel}</span>
                    <span className="weight-name">{t.group}</span>
                    {specimen.map((item, index) => (
                      <span key={item.name} style={{ display: "contents" }}>
                        <span className="word">{item.name}</span>
                        <span className="weight-name">
                          {known.length >= 3 && item.years !== null
                            ? format.plural(t.years, item.years)
                            : weightOf(index, t.weights)}
                        </span>
                      </span>
                    ))}
                    {known.length >= 3 ? <span className="note">{t.yearsNote}</span> : null}
                  </div>
                </Win>
                {tiles.length > 0 ? (
                  <div className="tiles">
                    {tiles.map((tile, index) => (
                      <div
                        key={tile.label}
                        className="tile reveal"
                        data-c={index === 0 ? "pink" : "yellow"}
                      >
                        <b>{tile.value}</b>
                        <span>{tile.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <Marquee items={skills.map(upper)} tone="ink" />
          <div className="floor">
            <Actor
              kind="daisy"
              colors={{ petal: "#fff", center: "#ffd24c", body: "#7fd3f7" }}
              at={{ left: "4%" }}
              width="clamp(5rem, 9cqi, 8rem)"
            />
            <Actor
              kind="globe"
              colors={{ body: "#7fd3f7", land: "#7ec96a" }}
              at={{ right: "4%" }}
              width="clamp(5rem, 10cqi, 9rem)"
              delay={1.6}
            />
            <Actor
              kind="mascot"
              colors={{ body: "#5bb8eb", belly: "#dff1ff", cheek: "#ff8fbf" }}
              at={{ left: "58%" }}
              width="7rem"
              md
              delay={2.4}
            />
          </div>
        </section>
      ) : null}

      {jobs.length > 0 ? (
        <section className="sec" data-tone="lavender" aria-labelledby="pf-bubble-jobs">
          <Sky
            kind="cloud"
            at={{ top: "1rem", left: "6%" }}
            width="clamp(4rem, 8cqi, 7rem)"
            speed={-25}
          />
          <Sky
            kind="cloud"
            at={{ top: "2rem", right: "6%" }}
            width="clamp(5rem, 9cqi, 8rem)"
            speed={20}
          />
          <Sky
            kind="sparkle"
            at={{ top: "16%", left: "8%" }}
            width="2.5rem"
            speed={-60}
            className="sparkle"
            md
          />
          <Sky
            kind="star"
            at={{ top: "20%", right: "10%" }}
            width="3rem"
            speed={50}
            className="sticker wobble"
            colors={{ fill: "#fff" }}
            md
          />
          <Sky
            kind="flower"
            at={{ top: "6%", left: "48%" }}
            width="2.5rem"
            speed={0}
            className="spin"
            md
            colors={{ petal: "#ffd24c", center: "#ff6f9c" }}
          />
          <Corners
            left={number("jobs")}
            chapter={chapter("jobs", upper(view.titles.experience || t.chapters.jobs))}
            right={{ tone: "pink", text: format.plural(t.jobs, jobs.length) }}
          />
          <div className="inner">
            <div className="center">
              <Pill tone="ink" className="reveal">
                {fmt(t.chapterNo, { no: no("jobs") })}
              </Pill>
              <h2
                className="display reveal"
                id="pf-bubble-jobs"
                style={{
                  fontSize: "clamp(2.5rem, 11cqi, 7rem)",
                  lineHeight: 0.85,
                  marginTop: "0.75rem",
                  paddingBottom: "0.3em",
                }}
              >
                <span className="t-stripe-sm" style={{ color: "var(--cream)" }}>
                  {t.worked.top}
                </span>
                <span
                  className="t-sticker"
                  style={{ color: "var(--pink-deep)", margin: "0 0.15em" }}
                >
                  {t.worked.middle}
                </span>
                <br />
                <span className="t-stripe-sm" style={{ color: "var(--yellow-sun)" }}>
                  {t.worked.bottom}
                </span>
              </h2>
              <div className="hands reveal" aria-hidden>
                <div className="bob">
                  <Mascot kind="point" className="sticker" />
                </div>
                <div className="bob" style={{ animationDelay: "-1.5s" }}>
                  <Mascot
                    kind="mascot"
                    colors={{ body: "#cdb6ff", belly: "#f1eaff", cheek: "#ff8fbf" }}
                    className="sticker"
                  />
                </div>
              </div>
            </div>
            <div className={wins.length === 0 ? "cols one" : "cols"}>
              <div className="col">
                <p className="col-head">{t.theJobs}</p>
                {jobs.map((job, index) => (
                  <article
                    key={job.id}
                    className="card reveal"
                    data-c={CYCLE[index % CYCLE.length]}
                  >
                    <h3>
                      {job.website ? (
                        <OutLink href={job.website.href}>{job.company || job.title}</OutLink>
                      ) : (
                        job.company || job.title
                      )}
                    </h3>
                    <span className="sub">
                      {[job.company ? job.title : "", job.dates].filter(Boolean).join(" · ")}
                    </span>
                    {job.summary || job.lines[0] ? <p>{job.summary || job.lines[0]}</p> : null}
                  </article>
                ))}
                {current ? (
                  <div className="reveal">
                    <SayBubble top={t.currentlyAt} bottom={current.company} />
                  </div>
                ) : null}
              </div>
              {wins.length > 0 ? (
                <div className="col">
                  <p className="col-head">{t.theWins}</p>
                  {wins.map((job, index) => (
                    <div
                      key={job.id}
                      className="card reveal"
                      data-c={CYCLE[(index + 2) % CYCLE.length]}
                    >
                      <p className="big">{job.highlight}</p>
                      <span className="sub">
                        {upper([job.company, job.type].filter(Boolean).join(" · "))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="floor">
            <Actor
              kind="daisy"
              colors={{ petal: "#ff8fbf", center: "#ffd24c", body: "#cdb6ff" }}
              at={{ left: "4%" }}
              width="clamp(5rem, 9cqi, 8rem)"
            />
            <Actor
              kind="daisy"
              colors={{ petal: "#fff", center: "#ff6f9c", body: "#7fd3f7" }}
              at={{ right: "4%" }}
              width="clamp(5rem, 9cqi, 8rem)"
              delay={2}
            />
          </div>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section className="sec" data-tone="yellow" aria-labelledby="pf-bubble-work">
          <Sky
            kind="cloud"
            at={{ top: "1.5rem", left: "6%" }}
            width="clamp(4rem, 8cqi, 7rem)"
            speed={-30}
          />
          <Sky
            kind="cloud"
            at={{ top: "0.5rem", right: "10%" }}
            width="clamp(5rem, 9cqi, 8rem)"
            speed={20}
          />
          <Sky
            kind="star"
            at={{ top: "18%", right: "8%" }}
            width="3.25rem"
            speed={-50}
            className="sticker wobble"
            colors={{ fill: "#ff6f9c" }}
            md
          />
          <Corners
            left={number("work")}
            chapter={chapter("work", t.chapters.work)}
            right={{ tone: "pink", text: format.plural(t.buildsCount, projects.length) }}
          />
          <div className="inner">
            <Win title={fmt(t.files.featured, { user: slug(first) })} className="reveal">
              <div className="work-head halftone">
                <h2
                  className="display title-xl t-stripe-sm"
                  id="pf-bubble-work"
                  style={{ position: "relative" }}
                >
                  {upper(
                    view.titles.projects && view.titles.projects !== "Projects"
                      ? view.titles.projects
                      : t.featured,
                  )}
                  <br />
                  <span className="deep">{t.work}</span>
                </h2>
                {kinds.length > 0 ? (
                  <div className="work-badges">
                    {kinds.map((kind, index) => (
                      <Pill key={kind} tone={(["ink", "pink", "yellow"] as const)[index % 3]!}>
                        {kind}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </div>
            </Win>
            <div className="builds">
              {projects.map((project, index) => {
                const cast = CAST[index % CAST.length]!;
                return (
                  <Win
                    key={project.id}
                    title={appFile(project.name)}
                    tint={TINTS[index % TINTS.length]}
                    className="build reveal"
                  >
                    <div
                      className="halftone"
                      style={{ position: "absolute", inset: 0 }}
                      aria-hidden
                    />
                    <div className="who bob" style={{ animationDelay: `-${index * 0.7}s` }}>
                      <Mascot kind={cast.kind} colors={cast.colors} className="sticker" />
                    </div>
                    <h3>{project.name}</h3>
                    {project.category ? <span className="kind">{project.category}</span> : null}
                    {project.line || project.description ? (
                      <p>{project.line || project.description}</p>
                    ) : null}
                    {project.website || project.source ? (
                      <span className="go">
                        {project.website ? (
                          <OutLink href={project.website.href}>{t.live}</OutLink>
                        ) : null}
                        {project.source ? (
                          <OutLink href={project.source.href}>{t.code}</OutLink>
                        ) : null}
                      </span>
                    ) : null}
                  </Win>
                );
              })}
            </div>
            {github ? (
              <p className="ctas reveal" style={{ marginTop: "1.5rem" }}>
                <OutLink href={github.href} className="btn btn-ink">
                  {t.allOnGitHub}
                </OutLink>
              </p>
            ) : null}
          </div>
          <div style={{ marginTop: "auto", position: "relative" }}>
            <Marquee items={projects.map((project) => project.name)} tone="pink" />
            <span className="flower spin" style={{ left: "0.5rem" }} aria-hidden>
              <Mascot kind="flower" colors={{ petal: "#fff", center: "#ff6f9c" }} />
            </span>
            <span className="flower spin" style={{ right: "0.5rem" }} aria-hidden>
              <Mascot kind="flower" colors={{ petal: "#cdb6ff", center: "#fff" }} />
            </span>
          </div>
        </section>
      ) : null}

      {books.length > 0 ? (
        <section className="sec" data-tone="cream" aria-labelledby="pf-bubble-books">
          <Sky
            kind="cloud"
            at={{ top: "1.25rem", left: "8%" }}
            width="clamp(4rem, 8cqi, 7rem)"
            speed={-20}
          />
          <Sky
            kind="star"
            at={{ top: "14%", right: "12%" }}
            width="2.75rem"
            speed={30}
            className="sticker wobble"
            colors={{ fill: "#cdb6ff" }}
            md
          />
          <Corners
            left={number("books")}
            chapter={chapter("books", t.chapters.notebook)}
            right={{
              tone: "blue",
              text: format.plural(
                t.entries,
                books.reduce((sum, book) => sum + book.rows.length, 0),
              ),
            }}
          />
          <div className="inner">
            <div className="center">
              <h2
                className="display title-xl t-stripe-sm reveal"
                id="pf-bubble-books"
                style={{ fontSize: "clamp(2.75rem, 10cqi, 7.5rem)" }}
              >
                {t.credit.top}
                <br />
                <span className="pink">{t.credit.bottom}</span>
              </h2>
            </div>
            <div className={books.length === 1 ? "books one" : "books"}>
              {books.map((book, index) => (
                <Win
                  key={book.id}
                  title={book.file}
                  tint={(["cream", "blue", "lavender", "pink"] as const)[index % 4]}
                  className="reveal"
                >
                  <ul className="book-list" style={{ background: "var(--cream)" }}>
                    {book.rows.map((row) => (
                      <li key={row.id}>
                        {row.href ? (
                          <OutLink href={row.href} className="what">
                            {row.what} ↗
                          </OutLink>
                        ) : (
                          <span className="what">{row.what}</span>
                        )}
                        {row.meta ? <span className="meta">{row.meta}</span> : null}
                      </li>
                    ))}
                  </ul>
                </Win>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="sec contact" data-tone="grape">
        <Sky
          kind="cloud"
          at={{ top: "1rem", left: "8%" }}
          width="clamp(4rem, 9cqi, 8rem)"
          speed={-25}
        />
        <Sky
          kind="cloud"
          at={{ top: "0.5rem", right: "10%" }}
          width="clamp(5rem, 10cqi, 9rem)"
          speed={20}
        />
        <Sky
          kind="star"
          at={{ top: "16%", left: "10%" }}
          width="3.25rem"
          speed={-70}
          className="sticker wobble"
          md
        />
        <Sky
          kind="flower"
          at={{ top: "18%", right: "8%" }}
          width="3.25rem"
          speed={60}
          className="sticker spin"
          colors={{ petal: "#ff8fbf", center: "#fff" }}
          md
        />
        <Corners
          left={number("contact")}
          chapter={chapter("contact", t.chapters.contact)}
          right={{ tone: "yellow", text: content.availability?.open ? t.open : t.hello }}
        />
        <div className="inner center">
          <Pill tone="cream" className="reveal">
            {fmt(t.letsTalk, { no: no("contact") })}
          </Pill>
          <h2 className="display title-xl t-stripe reveal" style={{ marginTop: "1rem" }}>
            {t.sayHello.top}
            <br />
            {t.sayHello.bottom}
          </h2>
          <div className="reveal" style={{ rotate: "-3deg" }}>
            <SayBubble
              top={content.location?.city ? t.basedIn : t.happy}
              bottom={content.location?.city || t.toChat}
            />
          </div>
          <p className="blurb reveal">
            {content.availability?.text ? `${content.availability.text}. ` : `${t.together} `}
            {t.inbox}
          </p>
          {reach.length > 0 ? (
            <div
              className="reach reveal"
              style={{ "--n": Math.min(reach.length, 3) } as CSSProperties}
            >
              {reach.map((item) => (
                <OutLink key={item.href} href={item.href}>
                  <span className="k">{item.key}</span>
                  <span className="v">{item.value}</span>
                </OutLink>
              ))}
            </div>
          ) : null}
          <div className="ctas reveal" style={{ marginTop: "1.25rem" }}>
            {hello ? (
              <OutLink href={hello} className="btn btn-yellow">
                {content.email ? t.sendEmail : t.sayHi}
              </OutLink>
            ) : null}
            {resumeHref ? (
              <a href={resumeHref} className="btn btn-cream">
                {t.resume}
              </a>
            ) : null}
            <a href="#pf-bubble-top" className="btn btn-cream">
              {t.backToTop}
            </a>
          </div>
          <p className="signoff">
            {year ? `© ${year} ` : ""}
            {name}
            {headline ? ` · ${headline}` : ""}
          </p>
          {footer ? <div className="credit">{footer}</div> : null}
        </div>
        <div className="floor">
          <Actor
            kind="daisy"
            colors={{ petal: "#fff", center: "#ffd24c", body: "#7fd3f7" }}
            at={{ left: "3%" }}
            width="clamp(5rem, 9cqi, 8rem)"
          />
          <Actor
            kind="mascot"
            colors={{ body: "#ffd24c", belly: "#fff5cf", cheek: "#ff6f9c" }}
            at={{ left: "24%" }}
            width="8rem"
            md
            delay={1.5}
          />
          <Actor kind="hand" at={{ left: "42%" }} width="clamp(6rem, 10cqi, 10rem)" delay={2} />
          <Actor
            kind="globe"
            colors={{ body: "#7fd3f7", land: "#7ec96a" }}
            at={{ left: "60%" }}
            width="9rem"
            md
            delay={3}
          />
          <Actor
            kind="mascot"
            colors={{ body: "#ff8fbf", belly: "#ffe1ee", cheek: "#e23f7a" }}
            at={{ right: "3%" }}
            width="clamp(5rem, 9cqi, 8rem)"
            delay={1}
          />
        </div>
        <Marquee
          items={[
            name,
            headline,
            content.location?.city ?? "",
            content.availability?.open ? content.availability.short : "",
          ]
            .filter(Boolean)
            .map(upper)}
          tone="ink"
        />
      </footer>
    </div>
  );
}
