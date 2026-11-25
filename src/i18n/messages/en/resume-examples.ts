// The resume example pages around each example (P5); the examples are in src/lib/seo-pages/examples and its translations.
export default {
  meta: {
    index: {
      title: "{count} resume examples for {year}, by job",
      description:
        "{count} full resume examples, from software engineer and data analyst to sales, marketing and entry-level roles, each with stronger lines, skills and mistakes.",
    },
    // The fuller title when it fits a search result.
    long: "{headline} ({year}): skills and tips",
    short: "{headline} ({year})",
  },
  headline: "{role} resume example",
  crumb: "Resume examples",
  index: {
    eyebrow: "Resume examples",
    title: "Resume examples",
    titleEm: "for {count} jobs.",
    intro:
      "Complete resumes for jobs people search for most, in India and abroad, from software engineer to HR and freshers. Each one shows stronger lines, the skills to list and the mistakes to skip.",
    listTitle: "Examples",
    howTitle: "How these examples are made",
    how: {
      madeUp: {
        title: "Made-up people, real shapes",
        text: "Every name, company, college and number is invented. Copy the structure, the kind of lines and the order of sections, then put in your own facts.",
      },
      lineCheck: {
        title: "Every line passes Otto's line check",
        text: "Each line went through the same check the studio runs on yours, which flags duties, stock phrases, vague words and lines with no result.",
      },
      skills: {
        title: "Skills Otto reads in job posts",
        text: "The skills on each page are ones the <link>job match check</link> picks out of job posts, so you can test your own resume against a real post the same way.",
      },
      realText: {
        title: "Real text in a real format",
        text: "Each example is drawn in one of the app's {count} formats as text, not a picture, so what you see is what hiring software would read.",
      },
      start: {
        title: "Start from any of them",
        text: "“Start from this example” opens a copy in the studio as your own resume. On {free}, it uses your one resume; {pro} keeps up to {proResumes} and {max} up to {maxResumes}.",
      },
    },
    ctaTitle: "No example for your job?",
    ctaText:
      "Upload the resume you have to see what hiring software reads, or match it to a job post. Both are free, with no card.",
  },
  example: {
    eyebrow: "Resume example",
    start: "Start from this example",
    startNote: "Opens in the studio as your own resume. Free, no card.",
    resumeTitle: "The example resume",
    formatFree: "Shown in the {name} format, free to download as a PDF.",
    formatPro:
      "Shown in the {name} format, which comes with {pro}. On {free} it downloads in {fallback}.",
    linesTitle: "Turn duties into results",
    linesIntro:
      "Three weak lines, what Otto's line check says about each, and the line from this example that answers it.",
    before: "Before",
    after: "After",
    lineCheck: "line check",
    skillsTitle: "Skills hiring software looks for",
    skillsIntro:
      "Otto's <link>job match check</link> reads each of these in job posts. List the ones you have, and name each inside a line where you used it: a skill that appears only in your Skills list shows as listed, not shown.",
    titlesLabel: "Job titles to search",
    titles:
      "{titles}. Otto's job matching treats these as the same kind of job, so search for each.",
    tipsTitle: "What to show",
    mistakesTitle: "Mistakes to skip",
    otto: "Otto the otter, pointing at a resume",
    closingTitle: "Make this resume yours.",
    closingText:
      "It opens in the studio as your own resume. Swap in your facts, and Otto checks each line as you go.",
    blank: "Or <link>start from a blank page</link>. Free, no card.",
    moreTitle: "More resume examples",
  },
} as const;
