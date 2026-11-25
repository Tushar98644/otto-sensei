// Bento: short labels on a grid of tiles.
export default {
  welcome: "welcome",
  hello: "Hi, I’m <b>{name}</b>",
  stack: "Stack & tools",
  skills: "Skills",
  contact: {
    title: "Let’s start working together!",
    details: "Contact Details",
    resume: "Resume",
    findMe: "Find me on",
  },
  tz: {
    in: "In {place}",
    here: "Where you are",
    same: "same timezone",
    ahead: "{offset} ahead of you",
    behind: "{offset} behind you",
    hours: "{hours}h",
    hoursMinutes: "{hours}h {minutes}m",
  },
  github: {
    label: "GitHub profile",
    // English has always read "1 stars" and "1 repos" here.
    stars: { one: "{count} stars", other: "{count} stars" },
    repos: { one: "{count} repos", other: "{count} repos" },
  },
  now: { title: "Now", what: "what’s this?" },
  experience: "Experience",
  at: "at {company}",
  accents: {
    red: "red accent",
    yellow: "yellow accent",
    blue: "blue accent",
    purple: "purple accent",
    green: "green accent",
  },
  crafted: "Crafted with <b>love</b> by {name}",
} as const;
