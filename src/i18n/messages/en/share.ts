// Shared resume pages (/s): Otto's words around the owner's resume, and the bar only the owner sees (P3).
export default {
  meta: {
    shared: "Shared resume",
    title: "{name} - Resume",
    untitled: "Resume",
    description: "A resume shared from {brand}.",
    notFound: "Link not found",
  },
  updated: "Resume · Updated {date}",
  madeWith: "Made with",
  unavailable: {
    thinking: "Otto the otter, thinking",
    worried: "Otto the otter, looking worried",
    busyTitle: "Lots of pages opened at once",
    missingTitle: "This link doesn't work",
    busy: {
      one: "Many resumes were opened from your network just now. Try again in {count} minute.",
      other: "Many resumes were opened from your network just now. Try again in {count} minutes.",
    },
    missing: "The person who shared it may have turned it off. Ask them for a new link.",
    checkOwn: "Check your own resume",
  },
  download: {
    failed: "That didn't work. Try again.",
    tryAgain: "Try again",
    pdf: "Download PDF",
  },
  owner: {
    label: "Your link",
    onlyYou: "Only you see this bar",
    settings: "Link settings",
    edit: "Edit",
    saveFailed: "Couldn't save that",
    checkConnection: "Check your connection, then try again.",
  },
  options: {
    legend: "What the page shows",
    contact: "Show email and phone",
    contactHint: "Off: the page and its PDF leave them out. Your name, city and links always show.",
    indexing: "Let search engines list it",
    indexingHint: "Off: Google and others are asked to keep it out of search results.",
  },
  facts: {
    none: "No views yet",
    views: { one: "{count} view", other: "{count} views" },
    lastOpened: "Last opened {when}",
    shared: "Shared {when}",
    justNow: "just now",
  },
} as const;
