import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in German.
export default {
  skipToContent: "Zum Inhalt springen",
  brand: {
    tagline: "Deine ganze Jobsuche, an einem Ort.",
    description:
      "Prüfe und verbessere deinen Lebenslauf mit Otto, finde offene Jobs, die zu ihm passen, verfolge jede Bewerbung aus deinem Postfach, bereite dich auf Interviews vor und teile eine Portfolio-Website. Downloads immer kostenlos.",
  },
  referral: {
    rewardedTitle: "Ihr habt beide Extras bekommen",
    rewarded:
      "Ihr bekommt beide {fix} Zeilenkorrekturen mehr, dazu {tailor} angepasste Versionen mit Pro oder Max.",
    pendingTitle: "Du bist über eine Einladung dabei",
    pending:
      "Prüf einen Lebenslauf, dann bekommt ihr beide {fix} Zeilenkorrekturen mehr, dazu {tailor} angepasste Versionen mit Pro oder Max.",
  },
  toast: { region: "Benachrichtigungen", dismiss: "Schließen" },
} satisfies Translation<Messages["common"]>;
