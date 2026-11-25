// Header, footer, navigation, the language picker and the 404 page (P2).
export default {
  nav: {
    label: "Main",
    howItWorks: "How it works",
    jobs: "Jobs",
    pricing: "Pricing",
    signIn: "Sign in",
    dashboard: "Dashboard",
    menu: "Menu",
  },
  checkMyResume: "Check my resume",
  footer: {
    label: "Footer",
    tagline: "Made for job seekers everywhere.",
    groups: {
      product: "Product",
      guides: "Guides",
      legal: "Legal",
    },
    links: {
      resumeBuilder: "Resume builder",
      jobMatch: "Job match check",
      coverLetters: "Cover letters",
      applicationTracker: "Application tracker",
      interviewPrep: "Interview prep",
      portfolioWebsite: "Portfolio website",
      pricing: "Pricing",
      resumeExamples: "Resume examples",
      resumeTemplates: "Resume templates",
      atsGuides: "ATS guides",
      comparisons: "Comparisons",
      privacy: "Privacy",
      terms: "Terms",
      refunds: "Refunds",
      acceptableUse: "Acceptable use",
    },
    payments: "Payments by {merchant}",
    language: "Language",
  },
  // Shown on an English page to a browser set to this language, in this language.
  languageHint: {
    text: "This page is also in English.",
    link: "Read it in English",
    dismiss: "Dismiss",
  },
  notFound: {
    title: "Page not found",
    otto: "Otto the otter, looking worried",
    text: "I looked everywhere, but this page isn't here. The link may be old or mistyped.",
    home: "Go to the home page",
  },
} as const;
