// Otto's lines about limits, plans and errors (OTTO in src/components/mascot/lines-en.ts), wherever the app draws them.
export default {
  comesWithPro: {
    fix: "More line fixes come with Pro.",
    tailor: "Tailoring comes with Pro.",
    letter: "Letters, outreach messages, answers and interview prep come with Pro.",
    import: "AI reading of uploads comes with Pro.",
    draft: "Building drafts with me comes with Pro.",
    github: "GitHub drafts come with Pro.",
  },
  tool: {
    resumes: "Free keeps {free}. {pro} keeps {proCount}, {max} {maxCount}.",
    formats: "This format comes with Pro. Free has Classic and Compact.",
    word: "Word downloads come with Pro. Your PDF download stays free.",
    tracker: "Free tracks {free}. {pro} tracks {proCount}, {max} {maxCount}.",
    jobs: "Filters, saved jobs and every match come with Pro.",
    share: "Share links come with Pro.",
    eligibility: "Checking where a job can hire from comes with Pro.",
    portfolio: "A portfolio site at your own link comes with Pro.",
  },
  resumes: { one: "{count} resume", other: "{count} resumes" },
  applications: { one: "{count} application", other: "{count} applications" },
  labels: {
    fix: "line fixes",
    tailor: "tailored versions",
    letter: "letters, answers and prep",
    import: "AI reads",
    draft: "drafts",
    github: "GitHub drafts",
  },
  withTrial: "{line} Try {plan} for {days} days.",
  reached: {
    month: "You've used this month's {limit} {label}. {reset}",
    trial: "You've used this trial's {limit} {label}. {reset}",
  },
  freeUsed: "You've used this month's {limit} {label}. {pro} has {proLimit} a month.",
  near: "Uh-oh, {used} of {limit} {label} used. {reset}",
  // planFullText in src/lib/plan-limits-text.ts: a paid plan at its number of resumes or applications.
  full: {
    resumes: "{plan} keeps {limit} resumes. Delete one to save another{upsell}.",
    resumesOver:
      "{plan} keeps {limit} resumes; you have {held}. Delete {over} to save another{upsell}.",
    tracker: "{plan} tracks {limit} applications. Delete some old ones to add more{upsell}.",
    trackerOver:
      "{plan} tracks {limit} applications; you have {held}. Delete {over} to add another{upsell}.",
    upsell: ", or move to {plan} for {limit}",
  },
  signedOut: "You've been signed out. Sign in again to keep going.",
  // writingAllowance in src/components/studio/tailor/writing-allowance.ts; {period} is "this month" or "this trial".
  writing: {
    none: "No cover letters, messages or answers left {period}. {reset}",
    left: "{left} of {limit} cover letters, messages and answers left {period}.",
  },
  errors: {
    generic: "Something went wrong on my end. Mind trying that again?",
    aiUnavailable:
      "I'm stuck on that one. Try again in a minute. Most hiccups like this won't count against you.",
    offline: "You seem to be offline. Your work is saved in this browser.",
    rateLimited: "That's a lot at once. Give me a minute to catch up.",
    notFound: "I looked everywhere, but this page isn't here.",
  },
  upgrade: {
    done: "You're on {plan} now. Your new limits apply straight away.",
    trial:
      "Try all my AI help: {plan} for {days} days, {price}. Cancel before it ends to pay nothing more.",
    trialStarted: "Your Pro trial runs until {day}. Let's get to work.",
  },
  // budgetReachedText in src/lib/ai-budget-copy.ts.
  budget: {
    month: "You've used this month's AI budget.",
    trial: "You've used this trial's AI budget.",
    resetsOn: "It resets on {day}.",
    resetsWhenRenews: "It resets when your plan renews.",
  },
  // Notes under AI-written text (src/lib/ai/warning-text), written in English on the server and shown in the app's language.
  warnings: {
    fillIn: {
      send: "Fill in {blanks} before you send it.",
      sendNumbers: "Fill in {blanks} before you send it. Otto never guesses numbers.",
      ownWords: "Fill in {blanks} with your own words before you send it.",
      use: "Fill in {blanks} before you use it.",
    },
    number: "Put your real figure in [number], or cut it. Otto never guesses numbers.",
    verb: "Check “{verb}”. Your resume says “{line}”.",
    unbacked: "Check “{phrase}”: only you know that. Keep it if it's true.",
    cliche: "Swap {phrases} for your own words. Recruiters skim past it.",
    quote: "“{text}”",
  },
} as const;
