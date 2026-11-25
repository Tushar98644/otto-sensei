// The job match page around the tool (P2); the tool's own words are in match-check.ts.
export default {
  meta: {
    title: "Free resume to job description match checker",
    description:
      "Paste your resume and a job post or its link to see which skills and tools the post names, which your resume shows and which are missing. Free, no sign-in.",
  },
  toolName: "{brand} job match check",
  eyebrow: "Free, no sign-in",
  title: "Does your resume",
  titleEm: "match this job?",
  intro:
    "See which skills the post names, where your resume shows each one, and what's missing. Counts, not a made-up score.",
  faqTitle: "What the check does",
  faq: {
    looksFor: {
      question: "What does the check look for?",
      answer:
        "The skills, tools, licences and languages the post names, from about {known} that Otto knows, such as Python, Figma, Salesforce, BLS or fluent Spanish. He looks for each one in your resume and shows you the line it's in.",
    },
    mustHaves: {
      question: "How does it tell must-haves from nice-to-haves?",
      answer:
        "From the post's own headings and words. A skill under “Requirements” or “What you'll need”, or next to “required” or “must”, is a must-have. One under “Nice to have”, or next to “a plus” or “preferred”, is a nice-to-have. When a post doesn't say, Otto doesn't guess.",
    },
    noScore: {
      question: "Why is there no match score?",
      answer:
        "A percentage would claim more than a word check knows. Hiring software and recruiters each weigh things their own way, so Otto shows you the counts and the lines and leaves the judging to you.",
    },
    meaning: {
      question: "What doesn't it check?",
      answer:
        "Meaning. It matches the post's words, so “led a team of five” won't count as “leadership”. It can't judge years of experience, degrees or how good your work was either, so it quotes those asks from the post for you to check. Real recruiters read for all of it.",
    },
    listed: {
      question: "What does “Listed, not shown” mean?",
      answer:
        "The skill is in a list, such as your skills section or headline, but no line about your work says where you used it. Recruiters look for that, so “Rebuilt the billing service in Go” says more than “Go” in a list.",
    },
    stored: {
      question: "Is my resume stored?",
      answer:
        "No. Pasted text is checked in your browser and never leaves it. An uploaded file goes to our server so its text can be read, the way hiring software reads it, and is then thrown away. A job link goes to our server too, which opens the post and sends its text back. You don't need an account.",
    },
    tailoring: {
      question: "How is this different from tailoring?",
      answer:
        "This check shows what's already there. Tailoring on Pro goes further: Otto reads the post for meaning, puts your best lines for the job first, writes a summary for it and helps you add lines for what's missing, from facts you give him, in a tailored copy. See <link>what Pro includes</link>.",
    },
  },
  closing: {
    otto: "Otto the otter, reading a resume",
    title: "See what the software sees.",
    cta: "Check my resume",
    note: "Checking and PDFs are free. Pro and Max add more help from Otto.",
  },
} as const;
