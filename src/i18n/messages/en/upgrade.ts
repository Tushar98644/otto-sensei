// The upgrade and add-credit dialogs, their plan cards and billing notes, wherever the app opens them (P3).
export default {
  otto: {
    pitch: "Tailoring, letters and line fixes each month, for a busy job hunt.",
    billingOff: "Payments aren't switched on yet, but you can still email us about a plan.",
    alreadyMax: "You're on Max, the biggest plan. Email us if you need more.",
    biggest: "You're on {plan}, the biggest plan on sale here. Email us if you need more.",
    hasMore: "{line} {plan} has more.",
    monthCredit:
      "You've added {spent} of credit this month, more than the {extra} {max} costs over {pro}.",
  },
  title: {
    reached: {
      month: "You've reached this month's limit",
      trial: "You've reached this trial's limit",
    },
    onPlan: "You're on {plan}",
    updateCard: "Update your card",
    upgradeTo: "Upgrade to {plan}",
    choose: "Choose your plan",
    trial: "Try {plan} for {days} days",
  },
  resets: "It resets {when}. Need more before then? Email us.",
  resetsCredit: "It resets {when}. Need more before then? Add credit, or email us.",
  cancelAnytime: "Cancel anytime from your account.",
  inPlace: "Your subscription changes in place: you pay only the difference, never twice.",
  creditFrom: "Or add credit from {min}: {buys}.",
  balance: "Your balance: {balance}.",
  replace:
    "Or replace “{title}” with the new one. The old one waits in Recently deleted for {days} days, in this browser only.",
  buttons: {
    addCredit: "Add credit",
    replace: "Replace it",
    notNow: "Not now",
    close: "Close",
    emailUs: "Email us",
    back: "Back",
    manageBilling: "Manage billing",
  },
  toast: {
    alreadyOn: "You're already on {plan}.",
    backOn: "You're on {plan}. Let's pick up where you left off.",
  },
  // src/components/account/trial-upgrade.ts
  trial: {
    notice: "{plan} starts now and your {trialPlan} trial ends. {charge}",
    charge:
      "You pay {price} (plus any tax) right away, charged to your card on file. The {trial} trial charge isn't taken off.",
    paymentIssue:
      "Your last payment didn't go through, so you're on Free for now. Update your card in Manage billing to get your plan back.",
    resumeTrial: "Your trial is set to end. Resume it in Manage billing, then start {plan}.",
    resumePlan: "Your plan is set to end. Resume it in Manage billing to change plans.",
  },
  // The plan cards (plan-offer.tsx) and how often to pay.
  offer: {
    howOften: "How often to pay",
    intervals: { month: "Monthly", year: "Yearly" },
    spoken: { month: "per month", year: "per year" },
    per: { month: "/month", year: "/year" },
    current: "Current plan",
    popular: "Popular",
    save: "Save {percent}%",
    referencePrice: "Reference price",
    monthlyOnly: "Sold monthly only, for now.",
    aboutMonth: "About {price} a month.",
    everythingInPro: "Everything in Pro, with more:",
    highlight: {
      month: "{count} {label} a month",
      trial: "{count} {label} during the trial",
    },
    labels: {
      fix: "line fixes",
      tailor: "tailored versions",
      letter: "cover letters, outreach messages, answers and interview prep",
      import: "AI reads of an uploaded resume",
      draft: "Build with Otto drafts",
      github: "GitHub project drafts",
    },
    proHighlight: "All {formats} formats, Word downloads and every job match",
    limitsHighlight: "Up to {resumes} resumes and {applications} tracked applications",
    tryPlan: "Try {plan} for {days} days",
    upgradeTo: "Upgrade to {plan}",
    startNow: "Start {plan} now",
    resetRule: {
      month: "Limits reset each month, when your plan renews.",
      year: "Limits reset each month, on the day of the month your plan started.",
    },
    promises:
      "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.",
    trialSentence:
      "{price} for {days} days, then {planPrice} {perInterval}. Cancel anytime before the trial ends.",
    perInterval: { month: "a month", year: "a year" },
    endsTrial: "Ends your {trialPlan} trial today and starts {plan} at {priceLabel}.",
    monthly: "{price} a month. Cancel anytime.",
    yearly: "{price} once a year, about {perMonth} a month. {savings}% less than paying monthly.",
    yearlyFlat: "{price} once a year.",
  },
  billing: {
    testMode: "Test mode",
    mockPlan: "No real payment. Your plan switches right away.",
    offTitle: "Payments aren't live yet",
    off: "Want a paid plan now? Email <link>{email}</link> and we'll set you up.",
  },
  // The add-credit dialog; amounts are US dollars.
  credit: {
    title: "Add credit",
    description:
      "Used only once a month's allowance runs out. It never expires while your account exists.",
    amount: "Amount",
    other: "Other",
    amountLabel: "Amount in dollars",
    hint: "Whole dollars, {min} to {max}.",
    add: "Add {amount}",
    pick: "Pick a whole-dollar amount from {min} to {max}.",
    room: "Your balance holds up to {cap}, so you can add up to {room} now.",
    full: "Your balance holds up to {cap}. Use some, then add more.",
    failed: "Couldn't add credit",
    balanceNow: "Your balance now: {balance}.",
    mock: "No real payment. The credit is added right away.",
    tax: "Plus any tax at checkout. Prepaid, and not refundable once used.",
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
  },
} as const;
