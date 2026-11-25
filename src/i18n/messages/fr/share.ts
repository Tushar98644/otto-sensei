import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: {
    shared: "CV partagé",
    title: "{name} - CV",
    untitled: "CV",
    description: "Un CV partagé depuis {brand}.",
    notFound: "Lien introuvable",
  },
  updated: "CV · Mis à jour le {date}",
  madeWith: "Créé avec",
  unavailable: {
    thinking: "Otto la loutre, qui réfléchit",
    worried: "Otto la loutre, l'air inquiet",
    busyTitle: "Trop de pages ouvertes en même temps",
    missingTitle: "Ce lien ne fonctionne pas",
    busy: {
      one: "Beaucoup de CV ont été ouverts depuis ton réseau à l'instant. Réessaie dans {count} minute.",
      other:
        "Beaucoup de CV ont été ouverts depuis ton réseau à l'instant. Réessaie dans {count} minutes.",
    },
    missing: "La personne qui l'a partagé l'a peut-être désactivé. Demande-lui un nouveau lien.",
    checkOwn: "Vérifie ton propre CV",
  },
  download: {
    failed: "Ça n'a pas marché. Réessaie.",
    tryAgain: "Réessayer",
    pdf: "Télécharger le PDF",
  },
  owner: {
    label: "Ton lien",
    onlyYou: "Toi seul vois cette barre",
    settings: "Réglages du lien",
    edit: "Modifier",
    saveFailed: "Impossible d'enregistrer",
    checkConnection: "Vérifie ta connexion, puis réessaie.",
  },
  options: {
    legend: "Ce que la page affiche",
    contact: "Afficher l'e-mail et le téléphone",
    contactHint:
      "Désactivé : la page et son PDF ne les incluent pas. Ton nom, ta ville et tes liens s'affichent toujours.",
    indexing: "Laisser les moteurs de recherche la référencer",
    indexingHint:
      "Désactivé : on demande à Google et aux autres de la garder hors des résultats de recherche.",
  },
  facts: {
    none: "Pas encore de visites",
    views: { one: "{count} visite", other: "{count} visites" },
    lastOpened: "Dernière ouverture {when}",
    shared: "Partagé {when}",
    justNow: "à l'instant",
  },
} satisfies Translation<Messages["share"]>;
