import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  user: "besucher",
  banner: {
    help: "Gib '<link>{command}</link>' ein, um alle verfügbaren Befehle zu sehen.",
    summary: "Gib '<link>{command}</link>' ein, um eine Übersicht zu sehen.",
    resume: "Gib '<link>{command}</link>' ein oder klick <link>hier</link> für den Lebenslauf.",
  },
  fetch: {
    title: "<b>{command}</b>: Übersicht",
    about: "ÜBER MICH",
    resume: "Lebenslauf",
    contact: "KONTAKT",
    status: "STAND",
    now: "JETZT",
  },
  about: {
    hello: "Hi, ich bin {name}.",
    more: "Mehr über mich:",
    summary: "'<link>{command}</link>' - kurze Übersicht.",
    work: "'<link>{command}</link>' - wo ich gearbeitet habe.",
    projects: "'<link>{command}</link>' - was ich gebaut habe.",
  },
  skills: "fähigkeiten",
  stack: "technik:",
  minutes: "{minutes} Min.",
  email: "e-mail",
  resume: "lebenslauf",
  shell: {
    welcome: "Willkommen! Hier sind alle verfügbaren Befehle:",
    tab: "[tab]: vervollständigen.",
    clear: "[ctrl+l]/clear: Terminal leeren.",
    opening: "Öffne {label}...",
    themeSet: "Theme auf {mode} gestellt.",
    usage: "Verwendung: theme [light|dark]",
    notFound: "shell: Befehl nicht gefunden: {name}. Versuch es mit 'help'.",
    prompt: "Gib einen Befehl ein, oder help",
    jokes: {
      vi: "wow, du nutzt noch 'vi'? probier mal 'vim'.",
      vim: "'vim' ist so was von veraltet. wie wär’s mit 'nvim'?",
      nvim: "'nvim'? zu schick. warum nicht 'emacs'?",
      emacs: "weißt du was? nimm einfach vscode.",
      sudo: "Zugriff verweigert: aus wenig Macht folgt... keine Verantwortung?",
      cd: "leider kann ich mir keine weiteren Verzeichnisse leisten.",
    },
  },
} satisfies Translation<Messages["portfolioDesigns"]["terminal"]>;
