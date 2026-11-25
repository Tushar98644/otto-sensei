import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  usage: {
    thisPeriod: { month: "ce mois-ci", trial: "pendant cet essai" },
    perPeriod: { month: "par mois", trial: "pendant l'essai" },
    renews: "au renouvellement de ton forfait",
    onDayRenews: "le {day}, au renouvellement de ton forfait",
    onDay: "le {day}",
    trialStarts: "Ton quota complet commence le {day}.",
    reset: "Ils se renouvellent {when}.",
    pool: "{count} {feature}",
    usedAll: "Tu as utilisé tes {pool} {period}. {reset}",
    usesOne: "Utilise 1 de tes {pool} {period}. Il en reste {left}.",
  },
  features: {
    fix: "corrections de ligne",
    tailor: "versions adaptées",
    letter:
      "lettres de motivation, messages de prise de contact, réponses et préparations aux entretiens",
    import: "lectures par l'IA d'un CV importé",
    draft: "brouillons Créer avec Otto",
    github: "brouillons de projets GitHub",
  },
  copy: {
    copied: "Copié",
    cantCopy: "Copie impossible",
    selectText: "Sélectionne le texte dans la zone et copie-le depuis là.",
  },
  undo: "Annuler",
  trashed: "Déplacé dans Supprimés récemment",
  pro: { comesWith: ", inclus dans " },
  seePro: "Voir Pro",
  tryOffer: "Essaie {plan} pendant {days} jours",
  errors: {
    fallback: "Un problème est survenu. Réessaie.",
    offline: "Impossible de joindre le serveur. Vérifie ta connexion.",
  },
  justNow: "à l'instant",
  working: {
    import: "Otto lit ton fichier.",
    job: "Otto lit l'offre d'emploi.",
    tailor: "Otto lit l'offre d'emploi et ton CV.",
    fix: "Otto cherche une ligne plus forte.",
    line: "Otto écrit ta ligne.",
    summary: "Otto réfléchit à un résumé.",
    letter: "Otto écrit ta lettre de motivation.",
    answer: "Otto rédige ta réponse.",
    outreach: "Otto écrit ton message.",
    interview: "Otto prépare ton dossier pour l'entretien.",
    draft: "Otto écrit ton premier brouillon.",
    githubLookup: "Otto cherche ton travail public sur GitHub.",
    github: "Otto transforme ton travail GitHub en lignes de projet.",
  },
} satisfies Translation<Messages["app"]>;
