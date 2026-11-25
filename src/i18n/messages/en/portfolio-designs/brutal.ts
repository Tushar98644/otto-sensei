// Brutal: loud, short lines on bright cards.
export default {
  nav: {
    label: "Sections",
    about: "About",
    projects: "Projects",
    work: "Work",
    contact: "Contact",
  },
  resume: "Resume",
  hero: {
    label: "Introduction",
    hello: "Hi, I’m <b>{name}</b>",
    getInTouch: "Get in touch",
  },
  stack: { label: "Stack", title: "{name} works with" },
  about: {
    title: "Who is {name}?",
    moreLabel: "More about me",
    more: "More about {name}",
  },
  projects: {
    title: "Projects",
    github: "See GitHub",
    source: "Source",
    visit: "Visit",
    tags: "tags:",
  },
  experience: { title: "Experience", fullResume: "Full resume" },
  extras: {
    education: "Education",
    certifications: "Certifications",
    writing: "Writing",
    minutes: "{minutes} min read",
    talks: "Talks",
    milestones: "Milestones",
  },
  contact: {
    title: "Let’s talk.",
    byEmail: "The quickest way to reach {name} is by email.",
    below: "The quickest way to reach {name} is below.",
  },
  backToTop: "Back to top",
} as const;
