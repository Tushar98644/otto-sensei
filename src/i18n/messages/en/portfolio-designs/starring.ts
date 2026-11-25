// Starring: a career told as a film, in the voice of its credits.
export default {
  visibility: {
    open: "Open source",
    live: "Live",
    private: "Private",
  },
  seeLive: "See it live ↗",
  viewSource: "View source ↗",
  acts: {
    numbers: "By the numbers",
    studios: "Studios I’ve worked with",
    road: "The road",
    work: "Featured work",
    catalogue: "The back catalogue",
    accolades: "Accolades",
    press: "Press tour",
    activity: "Every commit counts",
    training: "Training montage",
    bonus: "Bonus features",
    offscreen: "Behind the scenes",
    critics: "The critics",
    soon: "Coming soon",
  },
  iceberg: {
    one: "<b>{stars}</b>stars across {count} public repository, and {followers} people following along.",
    other:
      "<b>{stars}</b>stars across {count} public repositories, and {followers} people following along.",
  },
  studio: {
    now: "Now",
    past: "Past",
  },
  until: "now",
  talk: "Talk",
  article: "Article",
  alsoPlaying: "Also playing",
  openCode: "More of the code, out in the open.",
  certified: "Certified",
  contributions: "/ contributions in 90 days",
  // English has always read "1 weeks" here.
  heatLabel: {
    one: "Contributions per week over the last {count} weeks",
    other: "Contributions per week over the last {count} weeks",
  },
  heatNote: "One square a week, brightest at {count}",
  repos: {
    one: "{count} repo",
    other: "{count} repos",
  },
  skills: "Skills",
  hero: {
    nowStarring: "Now starring",
    available: "Available for work",
    resume: "Resume ↓",
    scroll: "Scroll — the show starts ↓",
  },
  act: "Act {number}",
  credits: {
    wrap: "That’s a wrap",
    starring: "Starring",
    email: "Email ↗",
  },
} as const;
