// Interview prep: the prep home, its calendar and the day's brief (P3).
export default {
  home: {
    title: "Interview prep",
    packsIntro: {
      one: "{count} prep pack, one per job, built from your own resume lines.",
      other: "{count} prep packs, one per job, built from your own resume lines.",
    },
    intro:
      "For each job you interview for: likely questions, stories from your own resume lines, and questions to ask them.",
    prepare: "Prepare for a job",
    didntLoad: "Your interview prep didn't load",
    tryAgain: "Try again",
    checkConnection: "Check your connection, then try again.",
    lockedEyebrow: "Comes with Pro",
    lockedTitle: "Practice every interview before it happens",
    locked:
      "With Pro, I prep you for each interview from your own resume lines. Here's an example.",
    lockedKept: "Making new prep comes with Pro. The prep you made before stays here to read.",
    emptyEyebrow: "No interviews yet",
    emptyTitle: "Your next interview, prepped in one click",
    emptyDetail:
      "When an application reaches the interview stage, it waits here with a Prepare key. Or prep for any job now from its link.",
    next: "Next interview",
    atStage: "At the interview stage",
    interviews: { one: "{count} interview", other: "{count} interviews" },
    moreInterviews: "More interviews",
    calendar: "In your calendar",
    morePacks: "More prep packs",
    yourPacks: "Your prep packs",
    packs: { one: "{count} pack", other: "{count} packs" },
    loading: "Loading your interview prep",
  },
  calendar: {
    ready: "Calendar file ready",
    readyDetail:
      "Open it to add the interview day, with a reminder to practice the morning before.",
    failed: "Couldn't make the calendar file",
    tryLater: "Try again in a moment.",
    add: "Add to calendar",
  },
  brief: {
    title: "Today's brief",
    stories: "Your strongest stories",
    questions: "Likely questions",
    asks: "Questions to ask them",
  },
} as const;
