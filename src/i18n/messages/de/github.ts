import type { Messages } from "..";
import type { Translation } from "../../types";

// Adding projects from GitHub, in German.
export default {
  offer: {
    links: "Dein Lebenslauf verlinkt auf github.com/{username}",
    text: "Wähl deine besten öffentlichen Repos, und Otto entwirft die Projektzeilen. Du prüfst sie zuerst.",
    button: "Projekte aus meinem GitHub hinzufügen",
  },
  connect: {
    title: "Aus GitHub importieren",
    signInFirst: "Melde dich zuerst an und verbinde dann dein GitHub-Konto.",
    checkFailed: "Dein GitHub-Konto konnte gerade nicht geprüft werden.",
    signIn: "Anmelden",
    tryAgain: "Erneut versuchen",
    connectTitle: "Verbinde dein GitHub",
    connectDescription:
      "Otto fügt nur Arbeit aus einem GitHub-Konto hinzu, das dir gehört. Melde dich einmal bei GitHub an, um es zu verbinden.",
    connect: "GitHub verbinden",
    reads:
      "Otto liest deine öffentlichen Repos und gemergten Pull Requests. Es postet nie etwas auf GitHub.",
    description:
      "Wähl öffentliche Repos und gemergte Pull Requests, und Otto entwirft daraus Projektzeilen.",
    find: "Meine Arbeit finden",
    cancel: "Abbrechen",
    connectedAs: "Verbunden als <b>{login}</b>",
    notYou: " · Nicht du? ",
    disconnect: "Trennen",
    signInReason: "Melde dich an, um dein GitHub-Konto zu verbinden.",
    offline: "Otto ist gerade nicht erreichbar. Prüf deine Verbindung.",
    startFailed: "Verbindung mit GitHub konnte nicht gestartet werden. Bitte versuch es noch mal.",
    disconnectFailed: "GitHub konnte nicht getrennt werden. Bitte versuch es noch mal.",
    notConnected: "GitHub ist nicht verbunden",
    errors: {
      taken: "Dieses GitHub-Konto ist schon mit einem anderen Otto-Sensei-Konto verbunden.",
      failed: "GitHub hat sich nicht verbunden. Bitte versuch es noch mal.",
    },
  },
  pick: {
    title: "Wähl, was hinzukommt",
    description:
      "Öffentliche Arbeit von {username}. Bis zu {repos} Repos und {pulls} Pull Requests.",
    repoCount: { one: "{count} Repo", other: "{count} Repos" },
    pullCount: { one: "{count} Pull Request", other: "{count} Pull Requests" },
    otto: "Wähl deine beste Arbeit. Ich schreibe Zeilen nur aus dem, was GitHub zeigt.",
    nothing:
      "Ich habe keine öffentlichen Repos oder gemergten Pull Requests von {username} gefunden.",
    back: "Zurück",
    draft: { one: "{count} Projekt entwerfen", other: "{count} Projekte entwerfen" },
    draftNone: "Projekte entwerfen",
    tabs: "Was importieren",
    repos: "Repos",
    pulls: "Pull Requests",
    picked: "{repos} von {reposMax} Repos und {pulls} von {pullsMax} Pull Requests gewählt",
    search: "Deine Repos durchsuchen",
    searchPlaceholder: "Nach Name, Sprache oder Thema suchen",
    noRepos:
      "Keine eigenen öffentlichen Repos auf GitHub. Forks bleiben draußen, da sie als Arbeit von jemand anderem beginnen.",
    noMatch: "Kein Repo passt zu „{query}“.",
    pullsBusy:
      "GitHub war zu beschäftigt, um Pull Requests aufzulisten. Geh zurück und schau in einer Minute noch mal.",
    noPulls: "Keine gemergten Pull Requests in öffentlichen Repos anderer Leute.",
    onResume: "In deinem Lebenslauf",
    stars: { one: "{count} Stern", other: "{count} Sterne" },
    archived: "Archiviert",
    merged: "Gemergt {month}",
  },
  review: {
    title: "Behalte die Projekte, die du willst",
    description:
      "Otto hat deine beste öffentliche Arbeit gewählt. Entferne Häkchen bei allem, was du nicht willst; nichts wird hinzugefügt, bevor du es sagst.",
    projects: { one: "{count} Projekt", other: "{count} Projekte" },
    lines: { one: "{count} Zeile", other: "{count} Zeilen" },
    usedAI:
      "Ich habe nur Fakten und Zahlen aus GitHub genutzt. Entferne Häkchen bei allem, was du nicht willst.",
    plain:
      "Diese Zeilen nutzen die Worte von GitHub. Mach sie nach dem Hinzufügen zu deinen eigenen.",
    pickOther: "Andere Repos wählen",
    add: { one: "{count} Projekt hinzufügen", other: "{count} Projekte hinzufügen" },
    addNone: "Projekte hinzufügen",
    already: "Schon in deinem Lebenslauf",
    noLines: "Noch keine Zeilen. Du kannst sie nach dem Hinzufügen schreiben.",
  },
  added: {
    title: {
      one: "{count} Projekt aus GitHub hinzugefügt",
      other: "{count} Projekte aus GitHub hinzugefügt",
    },
    skipped: "Ein Lebenslauf fasst {max} Projekte, darum passten {skipped} nicht mehr.",
    where: "Sie stehen unter Projekte. Bearbeite jede Zeile, um sie zu deiner eigenen zu machen.",
    full: "Dieser Lebenslauf hat schon {max} Projekte",
    makeRoom: "Entferne eins, um Platz zu schaffen.",
    undo: "Projekte aus GitHub hinzugefügt",
  },
} satisfies Translation<Messages["github"]>;
