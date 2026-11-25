import type { Messages } from "..";
import type { Translation } from "../../types";

// Words the comparisons, ATS guides, resume examples and templates share, in German.
export default {
  newTab: "(öffnet in einem neuen Tab)",
  checkCta: {
    title: "Sieh, wie dein Lebenslauf gelesen wird",
    text: "Vergleiche deinen Lebenslauf mit einer Stellenanzeige oder sieh den Text, den Bewerbermanagementsysteme aus deiner Datei ziehen. Beides ist kostenlos, ohne Karte.",
  },
  related: {
    builder: {
      title: "Lebenslauf-Generator",
      text: "Wie Otto einen Lebenslauf erstellt und prüft, was kostenlos ist und was {pro} dazu bringt.",
    },
    pricing: {
      title: "Preise",
      text: "Was kostenlos ist und was {pro} und {max} dazu bringen.",
    },
  },
} satisfies Translation<Messages["seo"]>;
