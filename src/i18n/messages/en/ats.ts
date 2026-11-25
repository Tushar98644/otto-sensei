// The ATS guide pages around each system's sourced notes (P5); the notes are in src/lib/ats/systems.ts and its translations.
export default {
  topics: {
    titles: {
      file: "How it reads your file",
      search: "How recruiters search it",
      screening: "Questions that can screen you out",
      ai: "AI matching and ranking",
      review: "How people review applicants",
    },
    phrases: {
      file: "how it reads your file",
      search: "how recruiters search it",
      screening: "screening questions",
      ai: "AI matching",
      review: "how people review applicants",
    },
    short: {
      file: "file reading",
      search: "recruiter search",
      screening: "screening questions",
      ai: "AI matching",
      review: "human review",
    },
  },
  meta: {
    index: {
      title: "ATS guides: how hiring software reads resumes",
      description:
        "How {count} applicant tracking systems, from Greenhouse and Workday to Taleo, read resumes, screen applicants and rank them with AI. Each note links its source.",
    },
    reads: "{name} ATS: how it reads your resume",
    does: "{name} ATS: what it does with your application",
  },
  headline: {
    reads: "How {name} reads your resume",
    does: "What {name} does with your application",
  },
  // A guide's description: the first intro and ending, in this order, that fit a search result.
  description: {
    intros: {
      long: "What the {name} ATS does with your application: {topics}.",
      plain: "What {name} does with your application: {topics}.",
      short: "What the {name} ATS does with your application: {short}.",
      brief: "{name} ATS guide: {short}.",
    },
    endings: {
      sourcedGeneral: "{sourced}, plus general advice for any ATS.",
      sourcedAny: "{sourced}, plus advice for any ATS.",
      briefGeneral: "{brief}, plus general advice for any ATS.",
      briefAny: "{brief}, plus advice for any ATS.",
      sourced: "{sourced}.",
      brief: "{brief}.",
    },
    sourced: {
      one: "One sourced note, with a practical tip and its source",
      other: "{count} sourced notes, each with a practical tip and its source",
    },
    brief: {
      one: "One sourced note with a practical tip",
      other: "{count} sourced notes with practical tips",
    },
  },
  sources: {
    // Two sources with the same name are told apart by what they cover, then by number.
    on: "{label} on {topics}",
    nth: "{label} ({count})",
    covers: "on {topics}",
  },
  crumb: "ATS guides",
  index: {
    eyebrow: "ATS guides",
    title: "How hiring software",
    titleEm: "reads your resume",
    intro:
      "An applicant tracking system (ATS) is the software employers use to collect and sort job applications. Here is what Otto has found on {count} of them, with a link to the page behind every note.",
    systems: "Hiring systems",
    notes: "{count} sourced notes",
    generalTitle: "Advice that holds for most of them",
    generalIntro:
      "These tips come up again and again across the systems above. Each guide has the details, and the sources, for one system.",
  },
  guide: {
    eyebrow: "ATS guide",
    count: {
      one: "1 sourced note, linked to the page it comes from.",
      other: "{count} sourced notes, each linked to the page it comes from.",
    },
    setUp: "Employers set {name} up in different ways, so not every note applies to every job.",
    spotTitle: "How to tell a job uses {name}",
    noFileNotes:
      "Otto's notes don't cover how {name} reads files yet, so there's nothing sourced to share here. The <link>general advice</link> below is a safe start.",
    whatToDo: "What to do:",
    optIn: "Only if the employer turns it on",
    source: "Source:",
    generalTitle: "General advice for any hiring system",
    generalIntro:
      "Not specific to {name}. These tips come up again and again in the notes Otto has on {count} hiring systems.",
    sourcesTitle: "Sources",
    aside: "Next steps and more guides",
    sideTitle: "Applying through {name}?",
    sideText: "See which of the job's skills your resume shows. Free, no sign-in.",
    moreTitle: "More ATS guides",
    templatesLink: "Resume templates in one column of real text",
    compareLink: "How Otto compares with other tools",
  },
  jobLink: {
    label: "Job link",
    submit: "Check my resume against this job",
    empty: "Paste a job link and I'll tell you if the job uses {name}.",
    unknown:
      "I can't tell the hiring system from this link. The general advice below still applies.",
    same: "This job uses {name}, so the notes on this page apply to it.",
    other: "This job uses {other}, not {name}. Its own guide has the notes for it.",
    readGuide: "Read the {name} guide",
  },
} as const;
