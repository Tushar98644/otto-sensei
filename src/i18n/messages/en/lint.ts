// The resume checks' words: issue messages (by LintIssue.messageId), help, entry checks and the review.
export default {
  quote: '"{text}"',
  issues: {
    stock: {
      one: "{phrases} is a phrase recruiters skip. Show the result instead.",
      other: "{phrases} are phrases recruiters skip. Show the result instead.",
    },
    weakStart: 'Swap {phrase} for what you did, like "Built", "Cut" or "Led".',
    duty: "{phrase} reads like a job description. Say what you did and what changed.",
    tense: "This job has ended, so write {past}, not {phrase}.",
    noResult: "What changed because of this? Add the result, and how much if you know it.",
    noNumber: "How many, how much, or how fast? Add a number if you know it.",
    noNumberWord: "{word} by how much, or for how many? Add a number if you know it.",
    noMethod: "Say how you did it: what did you build, change or run?",
    firstPersonTeam: "{word} hides your part. Say what you did.",
    firstPersonSelf: "Drop {word}. Resume lines leave out I, me and my.",
    passive: "{phrase} hides who did it. Say what you did instead.",
    vagueList: "{phrase} is vague. Name what matters, or cut it.",
    vagueThing: "{phrase} is vague. Say exactly what.",
    vagueCount: "{phrase} is vague. Give the real number.",
    tooLongWords: "This line has {count} words. Trim it to two lines so it's easy to skim.",
    tooLongChars: "This line has {count} characters. Trim it to two lines so it's easy to skim.",
    tooShort: "This line is too short to show much. Add what you did and what changed.",
    duplicate: "This line repeats another one. Keep one, or make each say something new.",
    stopMost: "Most lines here end with a full stop. Add one here to match.",
    stopFirst: "Your first line here ends with a full stop. Add one here to match.",
    noneMost: "Most lines here end without a full stop. Remove this one to match.",
    noneFirst: "Your first line here ends without a full stop. Remove this one to match.",
  },
  help: {
    duty: {
      why: "Recruiters look for what you did and what changed, not the job description.",
      before: "Responsible for maintaining the database",
      after: "Kept the database at 99.9% uptime by adding automated backups",
    },
    "no-result": {
      why: "A line that ends in a result shows why your work mattered.",
      before: "Developed REST APIs in Node.js",
      after: "Built REST APIs in Node.js that cut page load time from 3s to 0.8s",
    },
    "no-number": {
      why: "A number shows the size of the result: how many, how much or how fast.",
      before: "Improved the checkout flow",
      after: "Improved the checkout flow, lifting completed orders 12%",
    },
    "no-method": {
      why: "Saying how you got the result makes it believable.",
      before: "Cut cloud costs 30%",
      after: "Cut cloud costs 30% by moving batch jobs to cheaper servers",
    },
    "weak-start": {
      why: "The first word gets read first. A strong verb shows you did the work.",
      before: "Helped migrate the patient portal to React",
      after: "Migrated the patient portal to React for 40,000 patients",
    },
    "first-person": {
      why: "Resume lines leave out I, me and we. It's your resume, so it's clear who did it.",
      before: "I built the billing system",
      after: "Built the billing system used by 40 clients",
    },
    tense: {
      why: "Jobs you've left read in past tense.",
      before: "Build internal tools for the support team",
      after: "Built internal tools that saved support 5 hours a week",
    },
    "too-long": {
      why: "Long lines get skimmed. One or two lines each is easier to read.",
      after: "Cut deploy time 40% by moving builds to a shared cache",
    },
    "too-short": {
      why: "A few words can't show what you did and what changed.",
      before: "Fixed bugs",
      after: "Fixed 120 checkout bugs, cutting failed payments 18%",
    },
    passive: {
      why: "Saying what you did makes your part clear.",
      before: "The database was migrated to PostgreSQL",
      after: "Migrated the database to PostgreSQL in 3 weeks",
    },
    vague: {
      why: "Words like various or several stand in for a real number or name.",
      before: "Ran various webinars",
      after: "Ran 14 partner webinars that brought in 2,300 sign-ups",
    },
    "stock-phrase": {
      why: "Phrases every resume has get skipped. A result says it better.",
      before: "Results-driven team player",
      after: "Led a team of 4 that shipped the mobile app 2 weeks early",
    },
    duplicate: { why: "A repeated line takes space another result could use." },
    punctuation: { why: "Lines that end the same way look neat and careful." },
  },
  checks: {
    result: "Says what changed",
    start: "Starts strong",
    voice: "No I, me or we",
    stock: "No stock phrases",
    length: "Right length",
    numbers: "Has numbers",
    method: "Says how",
    tense: "Past tense",
    passive: "Says who did it",
    vague: "No vague words",
    repeat: "No repeated lines",
    stops: "Full stops match",
  },
  review: {
    groups: {
      duty: {
        title: {
          one: "{count} line reads like a job description",
          other: "{count} lines read like a job description",
        },
        reason: "Recruiters look for what you did and what changed, not the duty itself.",
      },
      "no-result": {
        title: {
          one: "{count} line doesn't say what changed",
          other: "{count} lines don't say what changed",
        },
        reason:
          "Each line should end in a result: what got better, for whom, and how much if you know.",
      },
      "weak-start": {
        title: { one: "{count} line starts weak", other: "{count} lines start weak" },
        reason: "Start with what you did, like Built, Cut, Led or Wrote.",
      },
      "first-person": {
        title: { one: "{count} line uses I, me or we", other: "{count} lines use I, me or we" },
        reason: "Resume lines leave out I, me and my.",
      },
      "stock-phrase": {
        title: { one: "{count} line uses stock phrases", other: "{count} lines use stock phrases" },
        reason: "Phrases every resume has get skimmed past. Show the result instead.",
      },
      "too-long": {
        title: {
          one: "{count} line runs past two lines",
          other: "{count} lines run past two lines",
        },
        reason: "Long lines get skipped. Keep each one to one or two lines.",
      },
      tense: {
        title: {
          one: "{count} line in past jobs uses present tense",
          other: "{count} lines in past jobs use present tense",
        },
        reason: "Jobs you've left read in past tense: Built, not Build.",
      },
      passive: {
        title: {
          one: "{count} line hides who did the work",
          other: "{count} lines hide who did the work",
        },
        reason: "Say what you did, not what was done.",
      },
      vague: {
        title: { one: "{count} line uses vague words", other: "{count} lines use vague words" },
        reason: "Words like various or several stand in for a real number or name.",
      },
      duplicate: {
        title: { one: "{count} line repeats another", other: "{count} lines repeat another" },
        reason: "Keep one, or make each say something new.",
      },
      "too-short": {
        title: { one: "{count} line is too short", other: "{count} lines are too short" },
        reason: "A few words can't show what you did and what changed.",
      },
      "no-method": {
        title: { one: "{count} result doesn't say how", other: "{count} results don't say how" },
        reason: "A result reads stronger with how you got it: by doing what.",
      },
      "no-number": {
        title: {
          one: "{count} line could use a number",
          other: "{count} lines could use a number",
        },
        reason: "Where you know it, a number shows the size: how many, how much, how fast.",
      },
      punctuation: {
        title: {
          one: "Full stops don't match in {count} line",
          other: "Full stops don't match in {count} lines",
        },
        reason:
          "Lines under one job or project read neater when they all end the same way: with a full stop, or without.",
      },
    },
    summary: {
      place: "Summary",
      both: "Your summary uses stock phrases and I",
      firstPerson: "Your summary uses I or we",
      stock: "Your summary uses stock phrases",
      reason:
        "The top of the page gets read first, so it should sound like your lines: facts, no I.",
    },
    firstLook: {
      title: {
        one: "{count} job is missing a title, company or dates",
        other: "{count} jobs are missing a title, company or dates",
      },
      reason: "A recruiter's first look goes to your job titles, companies and dates.",
      missing: "No {parts}.",
      parts: { title: "job title", company: "company", dates: "dates" },
      at: "{title} at {company}",
      aJob: "A job",
    },
    headline: {
      title: "No job title under your name",
      reason: "Put the job you want at the top, so the reader knows what you're applying as.",
    },
    skills: {
      title: {
        one: "{count} skill is only in your Skills list",
        other: "{count} skills are only in your Skills list",
      },
      reason: {
        one: "{skills}: no job or project line shows you using it. Recruiters and screeners trust a skill more in a line about what you did.",
        other:
          "{skills}: no job or project line shows you using them. Recruiters and screeners trust a skill more in a line about what you did.",
      },
      more: "{names} and {count} more",
    },
  },
} as const;
