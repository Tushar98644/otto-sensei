import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  list: "{items} und {count} weitere",
  roleMatch: "Passende Rolle: {job} ≈ deine Rolle als {person}. ",
  found: "In deinem Lebenslauf gefunden: {list}.",
  notFound: "Nicht gefunden in deinem Lebenslauf: {list}.",
  noTools: "Die Stellenanzeige nennt keine Tools zum Vergleichen.",
  kind: {
    same: "Derselbe Beruf wie deiner.",
    sameNamed: "Derselbe Beruf wie deiner: {name}.",
    close: "Ein eng verwandter Beruf.",
    closeNamed: "Ein eng verwandter Beruf: {name}.",
    group: "Eine verwandte Art von Arbeit.",
    groupNamed: "Eine verwandte Art von Arbeit: {name}.",
    neighbour: "Eine benachbarte Art von Rolle.",
    sameRole: "Dieselbe Art von Rolle wie deine.",
    earlier: "Wie eine frühere Rolle in deinem Lebenslauf.",
  },
  nothing: "Nichts, was die Stellenanzeige nennt, steht in diesem Lebenslauf.",
  nothingToCheck:
    "Dieser Lebenslauf und diese Stellenanzeige haben nichts gemeinsam, das ich prüfen kann.",
  levels: {
    intern: "ein Praktikum",
    junior: "eine Einstiegsposition",
    mid: "eine Position mit Berufserfahrung",
    senior: "eine Senior-Position",
    lead: "eine Lead- oder Staff-Position",
    director: "eine Position auf Direktorenebene",
  },
  stepUp: "Das ist {level}, eine Stufe über deinem letzten Jobtitel.",
  stepDown: "Das ist {level}, eine Stufe unter deinem letzten Jobtitel.",
  training:
    "Für solche Jobs braucht es meist mehr Ausbildung oder Erfahrung als für deine letzte Rolle.",
  years: "Verlangt {asked}+ Jahre Erfahrung; dein Lebenslauf zeigt etwa {shown}.",
  yearsShown: { one: "{count} Jahr", other: "{count} Jahre" },
  visa: {
    ukSponsor: "Als Visa-Sponsor im Vereinigten Königreich gelistet",
    h1b: "H-1B-Visumanträge im Geschäftsjahr {year} genehmigt (USCIS)",
  },
} satisfies Translation<Messages["jobMatch"]>;
