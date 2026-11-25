import type { Messages } from "..";
import type { Translation } from "../../types";

// Otto's lines about limits, plans and errors, in French.
export default {
  comesWithPro: {
    fix: "Plus de corrections de ligne avec Pro.",
    tailor: "L'adaptation est incluse dans Pro.",
    letter:
      "Les lettres, les messages de prise de contact, les réponses et la préparation aux entretiens sont inclus dans Pro.",
    import: "La lecture par l'IA des fichiers importés est incluse dans Pro.",
    draft: "Créer des brouillons avec moi est inclus dans Pro.",
    github: "Les brouillons depuis GitHub sont inclus dans Pro.",
  },
  tool: {
    resumes: "Free garde {free}. {pro} en garde {proCount}, {max} {maxCount}.",
    formats: "Ce format est inclus dans Pro. Free a Classic et Compact.",
    word: "Les téléchargements Word sont inclus dans Pro. Ton téléchargement PDF reste gratuit.",
    tracker: "Free suit {free}. {pro} en suit {proCount}, {max} {maxCount}.",
    jobs: "Les filtres, les offres enregistrées et toutes les correspondances sont inclus dans Pro.",
    share: "Les liens de partage sont inclus dans Pro.",
    eligibility: "Vérifier d'où une offre peut recruter est inclus dans Pro.",
    portfolio: "Un site portfolio à ton propre lien est inclus dans Pro.",
  },
  resumes: { one: "{count} CV", other: "{count} CV" },
  applications: { one: "{count} candidature", other: "{count} candidatures" },
  labels: {
    fix: "corrections de ligne",
    tailor: "versions adaptées",
    letter: "lettres, réponses et préparations",
    import: "lectures par l'IA",
    draft: "brouillons",
    github: "brouillons GitHub",
  },
  withTrial: "{line} Essaie {plan} pendant {days} jours.",
  reached: {
    month: "Tu as utilisé tes {limit} {label} de ce mois-ci. {reset}",
    trial: "Tu as utilisé tes {limit} {label} de cet essai. {reset}",
  },
  freeUsed: "Tu as utilisé tes {limit} {label} de ce mois-ci. {pro} en a {proLimit} par mois.",
  near: "Oups, tu en es à {used} {label} sur {limit}. {reset}",
  full: {
    resumes: "{plan} garde {limit} CV. Supprimes-en un pour en enregistrer un autre{upsell}.",
    resumesOver:
      "{plan} garde {limit} CV ; tu en as {held}. Supprimes-en {over} pour en enregistrer un autre{upsell}.",
    tracker:
      "{plan} suit {limit} candidatures. Supprimes-en quelques anciennes pour en ajouter d'autres{upsell}.",
    trackerOver:
      "{plan} suit {limit} candidatures ; tu en as {held}. Supprimes-en {over} pour en ajouter une autre{upsell}.",
    upsell: ", ou passe à {plan} pour en avoir {limit}",
  },
  signedOut: "Tu as été déconnecté. Reconnecte-toi pour continuer.",
  writing: {
    none: "Plus de lettres, de messages ni de réponses {period}. {reset}",
    left: "Il te reste {left} lettres, messages et réponses sur {limit} {period}.",
  },
  errors: {
    generic: "Un problème est survenu de mon côté. Tu peux réessayer ?",
    aiUnavailable:
      "Je bloque sur celle-ci. Réessaie dans une minute. La plupart de ces ratés ne sont pas décomptés.",
    offline: "On dirait que tu es hors ligne. Ton travail est enregistré dans ce navigateur.",
    rateLimited: "Ça fait beaucoup d'un coup. Laisse-moi une minute pour suivre.",
    notFound: "J'ai cherché partout, mais cette page n'est pas là.",
  },
  upgrade: {
    done: "Tu es maintenant sur {plan}. Tes nouvelles limites s'appliquent tout de suite.",
    trial:
      "Essaie toute mon aide par l'IA : {plan} pendant {days} jours, {price}. Annule avant la fin pour ne rien payer de plus.",
    trialStarted: "Ton essai Pro dure jusqu'au {day}. Au travail.",
  },
  budget: {
    month: "Tu as utilisé le budget IA de ce mois-ci.",
    trial: "Tu as utilisé le budget IA de cet essai.",
    resetsOn: "Il se renouvelle le {day}.",
    resetsWhenRenews: "Il se renouvelle au renouvellement de ton forfait.",
  },
} satisfies Translation<Messages["otto"]>;
