import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in German.
export default {
  skipToContent: "Zum Inhalt springen",
  otto: "Otto, der Otter",
  video: { play: "Abspielen", pause: "Pause" },
  brand: {
    tagline: "Deine ganze Jobsuche, an einem Ort.",
    description:
      "Prüfe und verbessere deinen Lebenslauf mit Otto, finde offene Jobs, die zu ihm passen, verfolge jede Bewerbung aus deinem Postfach, bereite dich auf Interviews vor und teile eine Portfolio-Website. Downloads immer kostenlos.",
  },
} satisfies Translation<Messages["common"]>;
