import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in French.
export default {
  skipToContent: "Aller au contenu",
  otto: "Otto la loutre",
  video: { play: "Lecture", pause: "Pause" },
  brand: {
    tagline: "Toute ta recherche d'emploi, au même endroit.",
    description:
      "Vérifie et corrige ton CV avec Otto, trouve des offres classées selon ton profil, suis chaque candidature depuis ta boîte mail, prépare tes entretiens et partage un site portfolio. Téléchargements gratuits, toujours.",
  },
  referral: {
    rewardedTitle: "Ton ami et toi avez reçu des extras",
    rewarded:
      "Vous recevez chacun {fix} corrections de ligne en plus, et {tailor} versions adaptées sur Pro ou Max.",
    pendingTitle: "Tu as rejoint Otto grâce à une invitation",
    pending:
      "Vérifie un CV, et vous recevez tous les deux {fix} corrections de ligne en plus, et {tailor} versions adaptées sur Pro ou Max.",
  },
  toast: { region: "Notifications", dismiss: "Fermer" },
} satisfies Translation<Messages["common"]>;
