// Words the comparisons, ATS guides, resume examples and templates share (P5); each section has its own namespace too.
export default {
  newTab: "(opens in a new tab)",
  checkCta: {
    title: "See how your resume reads",
    text: "Compare your resume with a job post, or see the text hiring software pulls from your file. Both are free, with no card.",
  },
  // RELATED in src/lib/seo-pages/pages.ts that the product namespace's related links don't cover.
  related: {
    builder: {
      title: "Resume builder",
      text: "How Otto builds and checks a resume, what's free, and what {pro} adds.",
    },
    pricing: {
      title: "Pricing",
      text: "What's free, and what {pro} and {max} add.",
    },
  },
} as const;
