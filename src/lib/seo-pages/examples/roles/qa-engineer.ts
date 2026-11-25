import type { RoleExample } from "../types";

export const qaEngineer = {
  slug: "qa-engineer",
  role: "QA engineer",
  occupation: "15-1253.00",
  titles: [
    "QA Engineer",
    "Quality Assurance Engineer",
    "SDET",
    "Test Automation Engineer",
    "Software Tester",
  ],
  updated: "2026-11-24",
  card: "Bugs caught before release, faster test runs and coverage that grew.",
  description:
    "A QA engineer resume example with Playwright, Selenium and API testing lines that show escaped bugs, test run time and coverage, plus skills and mistakes.",
  intro:
    "Good testing is measured by what never reaches customers. A QA resume has to show that: bugs caught before release, test runs made shorter, and how much of the product your tests now cover. This example gives each of those a number.",
  person:
    "Kevin is made up: a QA engineer with 5 years testing payment and travel booking apps, based in Austin, Texas. Names, companies and numbers are invented.",
  resume: {
    title: "QA engineer resume",
    template: "classic",
    basics: {
      name: "Kevin Tran",
      headline: "QA Engineer",
      email: "kevin.tran@example.com",
      phone: "+1 512 555 0164",
      location: "Austin, TX",
      links: [{ label: "GitHub", url: "github.example.com/kevin-tran" }],
    },
    summary:
      "QA engineer with 5 years testing web and mobile apps for payments and travel. Builds automated suites in Playwright and Java that catch bugs before release and keep test runs short.",
    experience: [
      {
        company: "Lumen Travel",
        title: "QA Engineer",
        location: "Austin, TX",
        startDate: "Feb 2024",
        endDate: "Present",
        bullets: [
          "Built a Playwright suite of 640 end-to-end tests for booking and checkout, cutting the regression pass from 3 days of manual testing to 40 minutes.",
          "Added API tests for 85 REST endpoints to the CI/CD pipeline, lowering bugs found in production from 14 a month to 4.",
          "Tracked flaky tests in a Jira dashboard and fixed the worst 30, raising the pass rate on clean builds from 82% to 99%.",
        ],
      },
      {
        company: "Copperleaf Payments",
        title: "QA Analyst",
        location: "Dallas, TX",
        startDate: "Jul 2021",
        endDate: "Jan 2024",
        bullets: [
          "Wrote 400 manual test cases for a card payments app and automated the 150 most used in Selenium with Java.",
          "Found a rounding bug in currency conversion 3 days before release that would have overcharged 2% of foreign card payments.",
          "Ran accessibility checks on 25 checkout screens and logged 60 issues, all closed before the bank's yearly audit.",
        ],
      },
    ],
    education: [
      {
        school: "Gulf Plains State University",
        degree: "B.S.",
        field: "Information Systems",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      { label: "Automation", items: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript"] },
      { label: "Testing", items: ["API testing", "Regression testing", "Accessibility"] },
      { label: "Tools", items: ["Jira", "Postman", "Git", "Jenkins"] },
    ],
    certifications: [
      { name: "ISTQB Certified Tester Foundation Level", issuer: "ISTQB", date: "2022" },
    ],
  },
  lines: [
    {
      weak: "Did manual and automated testing for the booking app.",
      strong:
        "Built a Playwright suite of 640 end-to-end tests for booking and checkout, cutting the regression pass from 3 days of manual testing to 40 minutes.",
    },
    {
      weak: "Tested APIs and reported bugs to developers.",
      strong:
        "Added API tests for 85 REST endpoints to the CI/CD pipeline, lowering bugs found in production from 14 a month to 4.",
    },
    {
      weak: "Worked on fixing flaky tests.",
      strong:
        "Tracked flaky tests in a Jira dashboard and fixed the worst 30, raising the pass rate on clean builds from 82% to 99%.",
    },
  ],
  skills: [
    {
      label: "Automation",
      items: ["Selenium", "Playwright", "Cypress", "Jest", "Test automation", "Unit testing"],
    },
    {
      label: "Languages and APIs",
      items: ["Java", "JavaScript", "TypeScript", "Python", "SQL", "REST"],
    },
    {
      label: "Process and tools",
      items: ["Jira", "Git", "CI/CD", "Jenkins", "Agile", "Accessibility"],
    },
  ],
  tips: [
    {
      title: "Count escaped bugs, not test cases",
      text: "Writing 400 test cases is effort; fewer bugs reaching production is the result. Pair the suite you built with the drop in production bugs or support tickets that followed.",
    },
    {
      title: "Show how long a test run takes",
      text: "Teams wait on regression runs before every release. Days turned into minutes is a result any engineering manager feels, so give the before and after.",
    },
    {
      title: "Name the bug you're proudest of",
      text: "One line about a serious bug you caught, and what it would have cost, shows the judgment a coverage number can't.",
    },
  ],
  mistakes: [
    {
      title: "Listing every type of testing",
      text: "Smoke, sanity, regression, UAT, black box, white box: the list fills space without showing skill. Name the kinds of testing inside lines that show what they caught.",
    },
    {
      title: "Manual work first on an automation post",
      text: "If the post asks for automation, put your automated suites at the top, even small ones. Manual testing still counts, but lead with the code you wrote.",
    },
    {
      title: "“Ensured product quality”",
      text: "Nobody can check a claim like that. Say what you tested, how much of it, and what changed: fewer escapes, a shorter run, a higher pass rate.",
    },
  ],
  faq: [
    {
      question: "What should a QA engineer resume include?",
      answer:
        "The products you tested, your automation tools and languages, and numbers for bugs caught, production escapes, test run time or coverage. Add an ISTQB certificate if you have one, but let your lines carry the weight.",
    },
    {
      question: "How do I move from manual testing to automation on my resume?",
      answer:
        "Show the automation you have already done, even as a side task: scripts you wrote, manual cases you automated, a pipeline step you added. A small public project helps if your work code is private.",
    },
    {
      question: "Is an SDET a different job from a QA engineer?",
      answer:
        "An SDET writes more code and often builds the test framework itself, but Otto's job matching files both under the same kind of job. If you apply to SDET roles, put your most code-heavy lines first.",
    },
  ],
  related: ["software-engineer", "devops-engineer", "frontend-developer"],
} as const satisfies RoleExample;
