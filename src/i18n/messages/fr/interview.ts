import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  home: {
    title: "Préparation aux entretiens",
    packsIntro: {
      one: "{count} dossier de préparation, un par offre, construit à partir de tes propres lignes de CV.",
      other:
        "{count} dossiers de préparation, un par offre, construits à partir de tes propres lignes de CV.",
    },
    intro:
      "Pour chaque poste pour lequel tu passes un entretien : les questions probables, des histoires tirées de tes lignes de CV et des questions à leur poser.",
    prepare: "Préparer un entretien",
    didntLoad: "Ta préparation aux entretiens ne s'est pas chargée",
    tryAgain: "Réessayer",
    checkConnection: "Vérifie ta connexion, puis réessaie.",
    lockedEyebrow: "Inclus dans Pro",
    lockedTitle: "Entraîne-toi à chaque entretien avant le jour J",
    locked:
      "Avec Pro, je te prépare à chaque entretien à partir de tes propres lignes de CV. Voici un exemple.",
    lockedKept:
      "Créer une nouvelle préparation est inclus dans Pro. Celle que tu as faite avant reste ici pour être lue.",
    emptyEyebrow: "Pas encore d'entretien",
    emptyTitle: "Ton prochain entretien, préparé en un clic",
    emptyDetail:
      "Quand une candidature arrive à l'étape de l'entretien, elle t'attend ici avec un bouton Préparer. Ou prépare-toi dès maintenant pour n'importe quelle offre à partir de son lien.",
    next: "Prochain entretien",
    atStage: "À l'étape de l'entretien",
    interviews: { one: "{count} entretien", other: "{count} entretiens" },
    moreInterviews: "Autres entretiens",
    calendar: "Dans ton agenda",
    morePacks: "Autres dossiers de préparation",
    yourPacks: "Tes dossiers de préparation",
    packs: { one: "{count} dossier", other: "{count} dossiers" },
    loading: "Chargement de ta préparation aux entretiens",
  },
  calendar: {
    ready: "Fichier d'agenda prêt",
    readyDetail:
      "Ouvre-le pour ajouter le jour de l'entretien, avec un rappel pour t'entraîner la veille au matin.",
    failed: "Impossible de créer le fichier d'agenda",
    tryLater: "Réessaie dans un instant.",
    add: "Ajouter à l'agenda",
  },
  brief: {
    title: "Le point du jour",
    stories: "Tes meilleures histoires",
    questions: "Questions probables",
    asks: "Questions à leur poser",
  },
} satisfies Translation<Messages["interview"]>;
