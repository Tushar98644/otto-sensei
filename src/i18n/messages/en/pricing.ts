// The pricing page, plan cards and the price words other pages share (P2). Plan names stay as they are.
export default {
  meta: {
    title: "Pricing and plans: {free}, {pro} and {max}",
    description:
      "One resume is free to check, fix and download as a PDF. {pro} is {proPrice} a month for tailoring, cover letters and all formats; {max} is {maxPrice}. {close}",
    trialClose: "Try {pro} {days} days for {trialPrice}.",
  },
  // src/lib/billing/prices.ts and src/lib/usage-copy.ts in this language.
  prices: {
    cancelAnytime: "Cancel anytime.",
    intervalNames: { month: "Monthly", year: "Yearly" },
    perInterval: { month: "a month", year: "a year" },
    eachInterval: { month: "month", year: "year" },
    priceLabel: { month: "{price}/month", year: "{price}/year" },
    trialOffer: "{plan} for {days} days",
    trialHeadline: "Try {offer}",
    trialSentence:
      "{price} for {days} days, then {planPrice} {perInterval}. Cancel anytime before the trial ends.",
    endsTrial: "Ends your {trialPlan} trial today and starts {plan} at {priceLabel}.",
    monthly: "{price} a month. Cancel anytime.",
    yearly: "{price} once a year, about {perMonth} a month. {savings}% less than paying monthly.",
    yearlyFlat: "{price} once a year.",
    perPeriod: { month: "a month", trial: "during the trial" },
  },
  // FEATURE_LABELS in src/config/plans.ts.
  features: {
    fix: "line fixes",
    tailor: "tailored versions",
    letter: "cover letters, outreach messages, answers and interview prep",
    import: "AI reads of an uploaded resume",
    draft: "Build with Otto drafts",
    github: "GitHub project drafts",
  },
  // Top-up credit, from src/config/topup.ts.
  credit: {
    line: "Run out? Add credit from {min}: {buys}.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "tailored versions",
      letter: "letters",
      fix: "line fixes",
      import: "AI resume reads",
      draft: "Build with Otto drafts",
      github: "GitHub project drafts",
    },
    each: {
      tailor: "{price} per tailored version",
      letter: "{price} per letter",
      fix: "{price} per line fix",
      import: "{price} per AI resume read",
      draft: "{price} per Build with Otto draft",
      github: "{price} per GitHub project draft",
    },
    cents: "{cents}¢",
  },
  page: {
    title: "Free for the basics.",
    titleEm: "More when the hunt gets busy.",
    intro:
      "Checking, fixing and downloading are free. Pro adds Otto's AI help, every job match and the tracker.",
    otto: "Plans change how much I help each month, never what I will or won't do.",
    footnote:
      "Prices in US dollars. Taxes may apply. Paid plans renew each {periods} until you cancel.",
    billingQuestions: "Billing questions",
    closingStudio: "Or check your resume free",
  },
  plans: {
    howOften: "How often to pay",
    period: {
      month: { short: "/month", spoken: "per month" },
      year: { short: "/year", spoken: "per year" },
    },
    free: "free",
    discount: "{percent}% off",
    yearlySavings: "Save {percent}% vs monthly",
    fairLimits: "Fair limits on every AI feature, all listed in the <link>terms</link>.",
    referencePrice: "Reference price ",
    manage: "Manage your plan",
    freeCta: "Check my resume, free",
    popular: "Popular",
    trialEmail: "We'll email you the day before it renews.",
    yearlyNote: "About {perMonth} a month, instead of {yearly} a year paid monthly.",
    monthlyOnly: "Sold monthly only, for now.",
    wontStart: "{plan} won't start, so you won't pay anything more.",
    thenPrice: "Then {priceLabel}, unless you cancel.",
    setToEnd: "Set to end, so you won't be charged again.",
    yourPlan: "Your plan",
    currentPlan: "Current plan",
    currentTrial: "Current plan · trial until {day}",
    includedIn: "Included in {plan}.",
    startNow: "Start {plan} now",
    upgradeTo: "Upgrade to {plan}",
    get: "Get {plan}",
    notOnPeriod: "Not available on your billing period yet.",
  },
  copy: {
    free: {
      summary: "Check, fix and download one resume.",
      note: "No card needed",
      outcomes: {
        upload: "Upload a resume and see what hiring software reads",
        fix: "Fix every line by hand, or with Otto",
        download: "Download a clean PDF in {formats}",
        matches: "Your {count} closest job matches",
        track: "Track {applications}, with a follow-up reminder",
      },
    },
    pro: {
      summary: "Otto's help for a busy job hunt.",
      lead: "Everything in Free, plus:",
      note: "Cancel anytime from your account",
      ai: {
        tailor: "Otto tailors your resume to each job",
        letters: "Cover letters, outreach and interview prep from Otto",
      },
      tools: {
        formats: "All {formats} formats, up to {resumes} resumes and Word downloads",
        jobs: "Every match from {open} open jobs, with filters and saved jobs",
        jobsNoCount: "Open jobs matched to your resume, with filters and saved jobs",
        track: "Track up to {applications} applications, with follow-up reminders",
        share: "Share links, and a portfolio site in all {designs} designs",
      },
    },
    max: {
      summary: "For a long search or many roles.",
      lead: "Everything in Pro, with more:",
      note: "Cancel anytime from your account",
      more: {
        tailor: "tailored versions",
        letter: "cover letters, outreach and interview prep",
        fix: "line fixes",
        import: "uploads read by AI",
        drafts: "drafts from your notes and GitHub",
      },
      ratio: {
        more: "More {noun}",
        twice: "Twice the {noun}",
        times: "{times} times the {noun}",
        overTwice: "Over twice the {noun}",
        overTimes: "Over {times} times the {noun}",
      },
      keep: "Up to {resumes} resumes and {applications} tracked applications",
    },
    resumes: { one: "{count} resume", other: "{count} resumes" },
    applications: { one: "{count} application", other: "{count} applications" },
    trackedApplications: {
      one: "{count} tracked application",
      other: "{count} tracked applications",
    },
    limit: "{count} {label} {period}",
    // The line under a card's features: "150 tailored versions · 150 letters and prep · 750 line fixes a month".
    quota: {
      free: "{resumes} · {fix} {fixLabel} {period} from Otto",
      paid: "{items} {period}",
      item: "{count} {label}",
      letters: "letters and prep",
    },
  },
  table: {
    title: "Every limit, plan by plan",
    intro:
      "Pro and Max limits reset each month, on the day of the month your plan started. Free's line fixes reset on the 1st.",
    whatYouGet: "What you get",
    included: "Included",
    notIncluded: "Not included",
    groups: {
      ai: "Otto's AI help, each month",
      resumes: "Resumes and downloads",
      jobs: "Jobs and applications",
    },
    ai: {
      tailor: { label: "Tailored versions", detail: "Your resume rewritten for one job" },
      letter: {
        label: "Letters and interview prep",
        detail: "Cover letters, outreach messages, answers and prep, counted together",
      },
      fix: { label: "Line fixes with Otto" },
      import: {
        label: "Uploads read by AI",
        detail: "Past this, and on Free, the basic reader reads them",
      },
      draft: { label: "First drafts from your notes" },
      github: { label: "Project drafts from GitHub" },
    },
    rows: {
      recruiterView: "Recruiter view and editing by hand",
      resumes: "Resumes",
      resumesDetail: "Tailored versions count as resumes",
      formats: "Formats",
      allFormats: "All {count}",
      pdf: "PDF downloads",
      word: "Word (.docx) downloads",
      share: "Share links",
      portfolio: "Portfolio site",
      portfolioDetail: "{count} designs, made from your resume",
      matches: "Job matches",
      allMatches: "All",
      closestMatches: "{count} closest",
      filters: "Filters and saved jobs",
      tracked: "Tracked applications",
      reminders: "Follow-up reminders",
      hireFrom: "Where each job can hire from",
    },
  },
  faq: {
    trial: {
      question: "How does the Pro trial work?",
      answer:
        "New accounts can try Pro for {days} days, once per person. You add a card at checkout and pay {price} (plus any tax) when the trial starts. When it ends, Pro starts at {priceLabel}. Cancel anytime before the trial ends and you pay nothing more. During the trial you can build and preview a portfolio; it goes public once Pro starts.",
    },
    free: {
      question: "What stays free?",
      answer:
        "Uploading with the basic reader, the recruiter view, editing and fixing by hand, {fix} line fixes a month with Otto, {resumes}, the Classic and Compact formats, PDF downloads, your {matches} closest job matches and {applications} with its reminder. No card, no time limit. More line fixes and the rest of Otto's AI help, the other formats, up to {proResumes} resumes, Word downloads, the full list of job matches with filters, tracking up to {proApplications} applications, share links and the work-rights check come with Pro. If a paid plan ends, everything you made stays: you can still open, edit and download it.",
    },
    payments: {
      question: "Who handles payments?",
      answer:
        "{merchant}, our merchant of record. They process your payment on their own checkout page, send your receipts and handle sales tax or VAT, and your card statement shows the charge under their name, starting with {prefix}. We never see your full card number.",
    },
    tax: {
      question: "Will I pay tax on top?",
      answer:
        "Depending on where you live, sales tax or VAT may be added at checkout. Prices are in US dollars, and your bank may convert them to your currency.",
    },
    cancel: {
      question: "How do I cancel?",
      answer:
        "From your account page, anytime. You keep your plan until the end of the period you paid for, and you won't be charged again.",
    },
    refund: {
      question: "Can I get a refund?",
      answer:
        "Refund requests are handled by {merchant}, our merchant of record, under its <link>buyer terms</link>. You can also cancel anytime from your account page and you won't be charged again. See our <link>refund policy</link>.",
    },
    limits: {
      question: "What are the limits?",
      free: "Free has {fix} {fixLabel} a month (summary help counts as one), reset at the start of each month, and no other AI help.",
      monthly:
        "Pro and Max limits reset each month, when your plan renews (on a yearly plan, on the day of the month it started): {list}.",
      monthlyItem: "{label}: {pro} on Pro, {max} on Max",
      trial: "The {days}-day Pro trial has its own allowance for the whole trial: {list}.",
      trialItem: "{count} {label}",
      kept: "Resumes, with tailored versions counted: {freeResumes} on Free, {proResumes} on Pro and the trial, {maxResumes} on Max. Tracked applications: {freeApplications} on Free, {proApplications} on Pro and the trial, {maxApplications} on Max.",
      uploads:
        "Uploads always work: on Free, or past the AI reads, the basic reader reads them instead.",
    },
    switch: {
      question: "Can I switch between Pro and Max?",
      answer:
        "You can move up from Pro to Max on your account page, on the billing period you already have. Your subscription changes in place, so you're never billed twice: you pay the difference for the rest of the period right away. On the Pro trial, starting Max ends the trial and charges the full Max price (plus any tax) to your card on file right away; the {price} trial charge isn't taken off. To move to Pro, or between monthly and yearly, cancel from your account page and pick the new plan once your current period ends. Moving to Pro keeps every resume and application you have; past Pro's limits, you can add more once you're under them.",
    },
    cancelled: {
      question: "What happens to my resumes if I cancel?",
      answer:
        "Nothing. They stay yours, and you can keep editing and downloading them for free. A published portfolio goes offline until you're back on Pro or Max; it isn't deleted.",
    },
    credit: {
      question: "What if I run out before my plan renews?",
      answer:
        "On {pro} or {max} you can add credit from {min} to {maxUsd} at a time, in whole dollars, plus any tax. {buys}: {prices}. Credit is used only once that month's allowance for the feature runs out, or once the AI budget runs out, at the prices shown at the time it's used. It's prepaid and not refundable once used, never expires while your account exists, works only on a paid plan (not Free or the trial), and is removed if you delete your account. A balance holds up to {balance}.",
    },
  },
} as const;
