// The resume formats: the dashboard's gallery and the studio's notes about them. Format names stay as they are.
export default {
  lead: {
    looks: "One resume, {count} looks.",
    free: "{looks} {names} are free. The other {proCount} come with {pro}, and you can try them on your resume first.",
    paid: "{looks} Switch whenever you like: your words stay the same.",
    and: "{first} and {last}",
  },
  gallery: {
    appliesTo: "Picking a format applies it to <b>{name}</b> and opens the download step.",
    noResume: "No resume yet. Pick a format, then add your resume or try it with a sample.",
    applyTo: "Apply to",
    appliesHint: "Picking a format applies it to this resume and opens the download step.",
    download: "Download",
    use: "Use this format",
    inUse: "In use",
    preview: "Preview",
    close: "Close",
    alt: "Page 1 of a sample resume in the {name} format",
  },
  chosen: {
    comesOut: "Your resume will come out in {name}.",
    setTo: "Your resume will be set to {name}.",
    change: "You can change it on the download step.",
    proOnly: "{name} is a {pro} format, so on {free} your download comes out in {fallback}.",
    sample: "Try it with a sample",
  },
  // TEMPLATE_INFO in src/lib/pdf/templates.ts.
  templates: {
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
} as const;
