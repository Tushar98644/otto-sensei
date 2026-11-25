// Otto's first-run tips in the studio and on the dashboard (P3).
export default {
  tip: {
    position: "{position} of {total}",
    skip: "Skip tips",
    back: "Back",
    next: "Next",
    done: "Got it",
  },
  studio: {
    "read-text": {
      title: "What hiring software reads",
      body: "This is your file as hiring software reads it. Anything missing here is missing for recruiters too.",
    },
    "fix-with-otto": {
      title: "Fix a line with Otto",
      body: "Tags show lines that need work. I ask for the facts, then rewrite. I never invent numbers.",
    },
    tailor: {
      title: "Tailor to a job",
      body: "Paste a job link. I'll show what it asks for and help add what you really have.",
    },
    download: {
      title: "Download, free",
      body: "Your PDF is free, always. Then I check it again to show what changed.",
    },
  },
  dashboard: {
    setup: {
      title: "Up next",
      none: "What to do next, most important first. Each row goes once it's done.",
      steps: {
        one: "What to do next, most important first. Your {count} setup step ticks itself off.",
        other:
          "What to do next, most important first. Your {count} setup steps tick themselves off.",
      },
    },
    actions: {
      title: "Start here",
      body: "Check a file, tailor a resume to one job, or try a new format.",
    },
    library: {
      title: "Your resumes",
      body: "Every resume and tailored copy lives here. Search by name or company.",
    },
    jobs: {
      title: "Jobs for you",
      body: "Open jobs from company boards, ordered by how closely each one matches your resume.",
    },
    applications: {
      title: "Applications",
      body: "Log each job you apply to on a board. Its letter and interview prep stay linked.",
    },
    interview: {
      title: "Interview prep",
      body: "For each interview: likely questions, stories from your own resume lines, and questions to ask.",
    },
    portfolio: {
      title: "Portfolio",
      body: "Turn your resume into a portfolio site, hosted for you at your own link.",
    },
    "win-rate": {
      title: "What's working",
      body: "Log the jobs you apply to. I'll show which resume gets you interviews.",
    },
  },
} as const;
