// The Dock design: a friendly developer page with a macOS-style dock.
export default {
  hello: "Hi, I’m {name}",
  about: "About",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: {
    pill: "My Projects",
    title: "Check out my latest work",
    text: "A few of the things I’ve built, with links to try them out.",
  },
  website: "Website",
  source: "Source",
  open: "Open {name}",
  milestones: {
    pill: "Hackathons",
    title: "I like building things",
    text: "Hackathons, awards and launches along the way.",
  },
  link: "Link",
  contact: {
    pill: "Contact",
    title: "Get in Touch",
    chat: "Want to chat?",
    email: "Just <link>send me an email</link> and I’ll get back to you.",
    message: "Just <link>send me a message</link> and I’ll get back to you.",
    none: "I’d love to hear from you.",
  },
  home: "Home",
  resume: "Resume",
  email: "Email",
  theme: { label: "Theme", toggle: "Toggle theme" },
} as const;
