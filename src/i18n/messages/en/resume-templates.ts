// The resume templates page (P5). Format names stay as they are (Classic, Compact) in every language.
export default {
  meta: {
    title: "ATS resume templates: {count} formats, {free} free",
    description:
      "{count} resume templates, each one column of real text, tested by reading the PDF back. {freeFormats} are free to download as PDFs; {proCount} more come with {pro}.",
  },
  crumb: "Resume templates",
  eyebrow: "Resume templates",
  title: "{count} resume formats,",
  titleEm: "each one column of real text.",
  intro:
    "Each one copies a widely used resume layout, and each PDF is tested by reading it back. {freeFormats} are free to download as PDFs; the other {proCount} come with {pro}, and you can try them on your resume first.",
  // OTTO.formats.tip in src/components/mascot/lines-en.ts.
  tip: "Not sure? Classic suits any job. Compact fits a long career on one page.",
  formatsTitle: "Formats",
  listName: "Resume formats",
  preview: "See the full {name} page",
  use: "Use this format",
  close: "Close",
  imageAlt: "Page 1 of a sample resume in the {name} format",
  // TEMPLATE_INFO in src/lib/pdf/templates.ts.
  formats: {
    classic: {
      description:
        "The layout university career offices recommend: plain type, centered headings with no lines, and the employer above your title on each job.",
      bestFor: "Any job, anywhere. The safe pick when you're not sure.",
    },
    modern: {
      description:
        "A large two-tone name, headings that start in color with a line to the edge, and job titles in small capitals.",
      bestFor: "Tech, startups and design-minded teams.",
    },
    compact: {
      description:
        "The one-page format business schools send to banks: Times-style type, capital headings under thin lines, square bullets and years only.",
      bestFor: "Finance, consulting and long careers that must fit one page.",
    },
    executive: {
      description:
        "Palatino-style serif, your name in color beside your headline, colored headings over light lines, and roomy spacing.",
      bestFor: "Senior roles, finance, law and consulting.",
    },
    developer: {
      description:
        "The template engineers share: book-style serif, small-capital headings over full lines, bold titles over italic company lines. Skills and projects first.",
      bestFor: "Software engineers and other technical roles.",
    },
    minimal: {
      description:
        "Black only: Charter-style serif, a large plain name, bold headings over thin lines, and each job on a single line.",
      bestFor: "Engineers and anyone who wants a calm, simple page.",
    },
  },
  commonTitle: "What every format has in common",
  common: {
    oneColumn: {
      title: "One column of real text",
      text: "Text reads top to bottom in the right order, with each heading on its own line. Every format is tested by reading its PDF back, on Letter and A4 paper.",
    },
    unscrambled: {
      title: "Nothing that scrambles the words",
      text: "No icons, no justified lines, and no wide letter spacing that reads back as “S U M M A R Y”.",
    },
    sameWords: {
      title: "Same words, any look",
      text: "Switch formats whenever you like. Your resume stays the same; only the page around it changes.",
    },
    pdfFree: {
      title: "PDF free, Word on {pro}",
      text: "Download {freeFormats} as PDFs free, as often as you like. The other {proCount} formats and Word (.docx) downloads come with {pro}.",
    },
  },
  faq: {
    free: {
      question: "Are these resume templates free?",
      answer:
        "{freeFormats} are free, with no paywall at the download step and no account needed. The other {proCount} formats come with {pro}. On {free}, a resume set to a {pro} format downloads in {fallback}.",
    },
    ats: {
      question: "Will hiring software read them?",
      answer:
        "Each one is a single column of real text in reading order, and each PDF is tested by reading it back. Every employer sets up its hiring system differently, so nobody can promise how a given system will treat your resume. The <link>ATS guides</link> show what the common ones are known to do.",
    },
    pick: {
      question: "Which one should I pick?",
      answer:
        "{classic} suits any job, anywhere: the safe pick when you're not sure. {compact} fits a long career on one page, and {developer} puts skills and projects first. Switch anytime: your words stay the same.",
    },
    own: {
      question: "Can I use my own resume?",
      answer:
        "Yes. Upload a PDF or Word file in the studio, or start from scratch. “Use this format” applies the format to the resume you have open. With none open, the studio asks for your resume with the format already chosen. You can try a {pro} format on {free}; it downloads in {fallback} until you have {pro}.",
    },
  },
} as const;
