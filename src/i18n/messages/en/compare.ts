// The comparison pages around each product's facts (P5); the facts are in src/lib/seo-pages/compare.ts and its translations.
export default {
  // compareTitle(): the brand stays Otto Sensei in every language.
  title: "{brand} vs {name}",
  meta: {
    index: {
      title: "{brand} compared with {count} other resume tools",
      description:
        "Fair, sourced comparisons of {brand} with {count} resume tools, including Jobscan, Rezi, Zety, Teal and Canva: what each does well and what plans include.",
    },
    page: {
      title: "{name} alternative: {compare} compared",
      description:
        "{compare}: what each does well, what the free and paid plans include, and where they differ. Sourced from each product's own pages.",
    },
  },
  crumb: "Compare",
  index: {
    eyebrow: "Compare",
    title: "How {brand} compares",
    intro:
      "{short} doesn't stop at the resume: it carries on through the jobs, the applications and the interviews. Here is how it compares, tool by tool.",
    facts:
      "Facts about each product come from its own website, as of <link>{month}</link>, with a link to every source on each page.",
    listTitle: "{brand} vs the others",
    cta: "Try {brand} on your resume",
  },
  pipeline: {
    title: "More than a resume checker",
    intro:
      "{brand} is your whole job hunt in one account, from the first resume check to the interview.",
    steps: {
      check: {
        title: "Check your resume",
        text: "See what hiring software reads, fix weak lines with Otto, download a clean PDF.",
      },
      jobs: {
        title: "Find jobs that fit",
        text: "Open jobs from companies' own sites, read daily and ranked for your resume.",
      },
      tailor: {
        title: "Tailor every application",
        text: "A copy of your resume for each job, plus cover letters and outreach.",
      },
      track: {
        title: "Track it from your inbox",
        text: "Applications on one board that move by themselves from your job emails.",
      },
      prep: {
        title: "Prep for interviews",
        text: "Likely questions and stories from your own resume, for each interview.",
      },
      share: {
        title: "Share a portfolio",
        text: "A portfolio site made from your resume, at your own link.",
      },
    },
  },
  page: {
    eyebrow: "{name} alternative",
    intro:
      "{brand} is your whole job hunt in one account: a resume that hiring software reads, jobs ranked for it, applications that track themselves and prep for every interview.",
    tryTitle: "Try it on your resume",
    matchCheck: "Run the free match check",
    noSignIn: "Free, with no sign-in.",
    reasonsTitle: "Why pick {brand}",
    sideBySide: "{short} and {name}, side by side",
    tableCaption: "{brand} and {name}, side by side",
    fromSite: "Everything about {name} here comes from its own website, <link>{checked}</link>.",
    byCountry:
      "{name} shows each country its own prices; any here are the ones it showed in India.",
    pricesChange: "Prices and plans change, so check the <link>sources</link>.",
    checkedOn: "checked on {date}",
    asListed: "as listed in {month}",
    pickTitle: "See what {short} makes of your resume",
    pickText: "Checking it and matching it to a job are free, with no card.",
    sources: "Sources",
    pricing: "{brand} pricing",
    pricesNote: "Prices in US dollars. Taxes may apply.",
    trademark:
      "{name} is a trademark of its owner, named here only to identify its product. This page isn't made with, or endorsed by, {name}. Spotted something out of date? Email <link>{email}</link> and we'll check it.",
    moreTitle: "More comparisons",
  },
} as const;
