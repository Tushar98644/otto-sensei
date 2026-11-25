import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in French.
export default {
  skipToContent: "Aller au contenu",
  brand: {
    tagline: "Toute ta recherche d'emploi, au même endroit.",
    description:
      "Vérifie et corrige ton CV avec Otto, trouve des offres classées selon ton profil, suis chaque candidature depuis ta boîte mail, prépare tes entretiens et partage un site portfolio. Téléchargements gratuits, toujours.",
  },
} satisfies Translation<Messages["common"]>;
