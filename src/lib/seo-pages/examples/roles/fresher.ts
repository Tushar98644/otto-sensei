import type { RoleExample } from "../types";

export const fresher: RoleExample = {
  slug: "fresher",
  role: "Fresher",
  occupation: "15-1252.00",
  titles: ["Trainee Software Engineer", "Associate Software Engineer", "Software Engineer Trainee"],
  updated: "2026-11-22",
  card: "A B.Tech graduate with one internship and two projects, on one page.",
  description:
    "A one-page fresher resume example for B.Tech and other graduates, with projects, internships and CGPA done right, the skills to list, and mistakes to skip.",
  intro:
    "With no full-time job yet, a fresher resume runs on projects, internships, marks and proof that you finish things. This example is a B.Tech graduate applying for trainee and associate engineer roles, and the same shape works for any graduate.",
  person:
    "Aditya is made up: a 2026 B.Tech graduate in computer science from Chennai, with one internship and two projects. Names, colleges, companies and numbers are invented.",
  resume: {
    title: "Fresher resume",
    template: "compact",
    sectionOrder: ["summary", "education", "experience", "projects", "skills", "certifications"],
    basics: {
      name: "Aditya Sharma",
      headline: "Computer Science Graduate",
      email: "aditya.sharma@example.com",
      phone: "+91 50000 47128",
      location: "Chennai, India",
      links: [{ label: "Portfolio", url: "aditya-sharma.example.com" }],
    },
    summary:
      "Computer science graduate (2026) looking for a trainee or associate software engineer role. Has built and shipped two full-stack projects and spent a summer fixing real bugs at a startup.",
    education: [
      {
        school: "Kaveri Institute of Technology",
        degree: "B.Tech",
        field: "Computer Science and Engineering",
        location: "Chennai",
        startDate: "2022",
        endDate: "2026",
        bullets: ["CGPA 8.4/10. Final-year project: campus bus tracker (below)."],
      },
      {
        school: "Greenfield Higher Secondary School",
        degree: "Class XII (CBSE)",
        field: "Science",
        location: "Chennai",
        endDate: "2022",
        bullets: ["91.2%"],
      },
    ],
    experience: [
      {
        company: "Orbitly",
        title: "Software Engineering Intern",
        location: "Chennai",
        startDate: "May 2025",
        endDate: "Jul 2025",
        bullets: [
          "Fixed 14 bugs in the React dashboard, including a date bug that showed wrong delivery days to 3,000 users.",
          "Wrote 40 unit tests in Jest for the booking form, raising its coverage from 20% to 75%.",
        ],
      },
    ],
    projects: [
      {
        name: "Campus bus tracker",
        tech: "React, Node.js, MongoDB",
        link: "aditya-sharma.example.com/bus",
        bullets: [
          "Built a live bus tracker for 6 college buses with a team of 3, now used by about 900 students each morning.",
          "Cut map updates from every 30 seconds to every 5 by sending GPS points over WebSockets instead of polling.",
        ],
      },
      {
        name: "Expense splitter",
        tech: "Python, Django, PostgreSQL",
        link: "aditya-sharma.example.com/split",
        bullets: [
          "Made a web app to split hostel and trip expenses, with UPI payment links, used by 120 friends and classmates.",
        ],
      },
    ],
    skills: [
      { label: "Languages", items: ["Java", "Python", "JavaScript", "SQL"] },
      { label: "Web", items: ["React", "Node.js", "Django", "HTML", "CSS"] },
      { label: "Tools", items: ["Git", "Linux", "MongoDB", "PostgreSQL"] },
    ],
    certifications: [
      {
        name: "NPTEL: Data Structures and Algorithms using Java (Elite)",
        issuer: "NPTEL",
        date: "2024",
      },
    ],
  },
  lines: [
    {
      weak: "Did a project on bus tracking.",
      strong:
        "Built a live bus tracker for 6 college buses with a team of 3, now used by about 900 students each morning.",
    },
    {
      weak: "Hardworking and passionate fresher eager to learn.",
      strong:
        "Fixed 14 bugs in the React dashboard, including a date bug that showed wrong delivery days to 3,000 users.",
    },
    {
      weak: "Learned React and Node.js during internship.",
      strong:
        "Wrote 40 unit tests in Jest for the booking form, raising its coverage from 20% to 75%.",
    },
  ],
  skills: [
    { label: "Languages", items: ["Java", "Python", "C++", "JavaScript", "SQL"] },
    { label: "Web", items: ["HTML", "CSS", "React", "Node.js", "Django"] },
    { label: "Tools", items: ["Git", "Linux", "MySQL", "Excel"] },
  ],
  tips: [
    {
      title: "Education goes first",
      text: "Until you have a full-time job, your degree, college and CGPA are the strongest facts you have. Put Education above Experience, and keep Class XII marks while campus posts still ask for them.",
    },
    {
      title: "Treat projects like jobs",
      text: "Each project gets the same kind of line as a job: what you built, who used it, and one number. A project with 10 real users beats a tutorial clone with none.",
    },
    {
      title: "One page, no exceptions",
      text: "Recruiters at campus drives and mass hiring read hundreds of fresher resumes. Keep it to one page; Compact fits more on it without shrinking the text.",
    },
  ],
  mistakes: [
    {
      title: "An objective full of adjectives",
      text: "“Hardworking and passionate fresher eager to learn” is on thousands of resumes. Otto's line check flags stock phrases like “hardworking”. Say the role you want and one thing you have built.",
    },
    {
      title: "Personal details and a declaration",
      text: "Father's name, date of birth, a photo and “I hereby declare that the above information is true” come from old templates. Employers don't need them, and they take space from your projects.",
    },
    {
      title: "Listing courses as skills",
      text: "“Operating Systems, DBMS, Computer Networks” are subjects, not skills. List the languages and tools you have used in a project or internship.",
    },
  ],
  faq: [
    {
      question: "What is the best resume format for freshers?",
      answer:
        "One page, one column, with Education first, then internships, projects, skills and certifications. Classic and Compact both work and are free to download as PDFs.",
    },
    {
      question: "Should a fresher put CGPA on the resume?",
      answer:
        "Yes, if it helps you. Many campus and trainee posts set a cut-off, so leaving it out can look like hiding it. Write it as the college does, such as 8.4/10.",
    },
    {
      question: "Can I make a fresher resume with no internship?",
      answer:
        "Yes. Lead with two or three projects written like jobs, add hackathons, college clubs or freelance work with numbers, and keep Education at the top.",
    },
  ],
  related: ["software-engineer", "data-analyst", "customer-support"],
};
