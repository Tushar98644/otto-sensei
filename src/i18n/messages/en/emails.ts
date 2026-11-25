// Emails Resend sends, the unsubscribe page, the bell notes crons write and the sign-in code email (P4).
export default {
  signOff: "{mascot}, from {brand}",
  linkLine: "{label}: {url}",
  unsubscribe: "Unsubscribe",
  unsubscribeLine: "Unsubscribe in one click: {url}",
  emailSettings: "Email settings",
  signInCode: {
    subject: "Your Otto Sensei code: {token}",
    lead: "Your Otto Sensei code is",
    expires: "It expires in 10 minutes.",
    ignore: "If you didn't ask for this, you can ignore this email.",
  },
  trialEnding: {
    subject: "Your {plan} trial ends on {day}",
    at: "{day} at {time}",
    price: { month: "{price}/month", year: "{price}/year" },
    noticeBody:
      "It ends on {when}. After that, {plan} costs {price}. You can cancel anytime before then from your account page.",
    lead: "A quick heads-up: your {plan} trial ends on {when}.",
    charge:
      "After that, {plan} costs {price} (in US dollars, plus any sales tax or VAT where you live) until you cancel. If you'd like to keep {plan}, there's nothing to do.",
    cancel:
      "If you don't want to continue, you can cancel anytime before then from your account page, and you won't be charged anything more.",
    account: "Your account",
    button: "Go to your account",
    footer:
      "You're getting this because your {plan} trial is about to end. It's a billing notice, so it comes even if reminder emails are off.",
  },
  checkin: {
    noticeTitle: "Your {month} check-in",
    noticeBody: "One minute: what you shipped, any numbers, and anything you learned or led.",
    subject: "Your one-minute {month} check-in",
    lead: "One minute for {month}? Three quick questions, by voice or text. Skip any you like.",
    prompts: {
      shipped: {
        label: "What did you ship or improve?",
        hint: "A feature, a fix, a process, a deal.",
      },
      numbers: { label: "Any numbers?", hint: "Users, %, money, time saved. Rough is fine." },
      learned: {
        label: "Anything you learned or led?",
        hint: "A skill, a tool, a person you helped.",
      },
    },
    nothingNew: "Nothing new this month? That's one tap on the page.",
    free: "Your notes stay free on every plan. When you look for your next job, Pro turns them into resume lines that quote your own facts.",
    button: "Write my check-in",
    reason: "You get this because you turned on the career log check-in. Once a month.",
  },
  processorNotice: {
    subject: "Dodo Payments takes live payments for {brand} from {day}",
    intro:
      "A short notice about payments: Dodo Payments now handles checkout for {brand} in place of Paddle, and takes live payments from {day}.",
    reseller:
      "Dodo Payments is our online reseller and merchant of record. It takes the payment when you buy a plan, and handles receipts, sales tax or VAT, refunds and billing support.",
    data: "When you start a checkout, we send Dodo Payments your account email, our random id for your account and the plan you pick, the same details Paddle used to get. Dodo Payments handles your payment details under its own privacy policy.",
    nothing:
      "There's nothing you need to do. Everything you've made in {brand} stays as it is, and our prices don't change.",
    updated: "We've updated our terms, privacy policy and refund page to match:",
    terms: "Terms",
    privacy: "Privacy policy",
    refunds: "Refunds",
    questions: "Questions? Email {email}.",
    footer:
      "You're getting this because you have a {brand} account. It's a one-time notice about a change to our terms and privacy policy, so it comes even if other emails are off.",
  },
  unsubscribePage: {
    title: "Unsubscribe",
    invalid:
      "That link isn't valid any more. Otto no longer sends these emails; your reminders are in the bell on your dashboard.",
    failed: "Couldn't turn those emails off. Please try again.",
    lists: {
      reminders: {
        name: "Follow-up reminder emails",
        ask: "Turn off follow-up reminder emails? Your reminders stay in the bell on your dashboard.",
        press: "Turn off reminder emails",
        done: "Done. You won't get follow-up reminder emails any more. The bell on your dashboard keeps them.",
      },
      jobs: {
        name: "The weekly jobs email",
        ask: "Stop the weekly email about new jobs that match your resume? The Jobs tab still shows them.",
        press: "Stop the weekly email",
        done: "Done. You won't get the weekly jobs email any more. New matches show in the bell on your dashboard.",
      },
      tips: {
        name: "Tips and reminders",
        ask: "Stop tips and reminder emails, like the note when Free's line fixes come back? Billing notices about a trial still come.",
        press: "Stop tips and reminders",
        done: "Done. You won't get tips and reminder emails any more.",
      },
      views: {
        name: "Views emails",
        ask: "Stop the emails about people opening your resume links and portfolio? The bell on your dashboard still shows them.",
        press: "Stop views emails",
        done: "Done. You won't get views emails any more. The bell on your dashboard keeps them.",
      },
      career: {
        name: "Career log check-in emails",
        ask: "Stop the monthly career log email? Your log stays, free, and the bell on your dashboard still asks once a month.",
        press: "Stop check-in emails",
        done: "Done. You won't get career log emails any more. Your log stays, and you can turn the email back on in your account settings.",
      },
    },
  },
  followUp: {
    title: "Time to follow up with {company}?",
    titleBlank: "Time to follow up?",
    titleMany: {
      one: "{count} application is ready for a follow-up",
      other: "{count} applications are ready for a follow-up",
    },
    days: { one: "{count} day", other: "{count} days" },
    sinceInterview:
      "It's been {days} since your interview with {company}. A short note keeps you in mind.",
    sinceInterviewBlank: "It's been {days} since your interview. A short note keeps you in mind.",
    sinceApplied: "It's been {days} since you applied to {company}. A short follow-up can help.",
    thatCompany: "that company",
    many: "{who} are ready for a follow-up. A short note can help.",
    applications: { one: "{count} application", other: "{count} applications" },
    andMore: "{names} and {count} more",
    pair: "{first} and {second}",
  },
  interviewSoon: {
    title: "Your interview with {company} is {day}",
    titleBlank: "Your interview is {day}",
    today: "today",
    tomorrow: "tomorrow",
    onDay: "on {weekday}",
    role: "For the {role} role.",
    advice: "Go over the likely questions in your prep before you go.",
  },
  views: {
    count: { one: "{count} view", other: "{count} views" },
    shareTitle: "Someone opened your resume link",
    shareBody: "{link} has {views} so far.",
    namedLink: "Your link for “{name}”",
    resumeLink: "Your resume link",
    portfolioTitle: "Your portfolio got {views} {period}",
    thisWeek: "this week",
    since: "since {day}",
    portfolioBody: "Counted without you, link previews or search engines.",
  },
  jobs: {
    title: { one: "{count} new match this week", other: "{count} new matches this week" },
    job: "{title} at {company}",
    andMore: "{names} and {count} more.",
    pair: "{first} and {second}.",
    single: "{name}.",
    free: "On Free, Jobs shows your closest few.",
    alert: { one: "{count} new job for “{name}”", other: "{count} new jobs for “{name}”" },
  },
} as const;
