import type { Messages } from "..";
import type { Translation } from "../../types";

// The private calendar feed card, in French.
export default {
  title: "Tous tes entretiens dans ton agenda",
  intro:
    "Abonne-toi une fois. Les entretiens que tu notes, à leur heure, et tes jours de relance s'affichent tout seuls, chacun avec un lien vers sa préparation.",
  google: "S'abonner dans Google Agenda",
  googleNewTab: "(ouvre Google Agenda dans un nouvel onglet)",
  apple: "Apple / Outlook",
  copy: "Copier le lien",
  copied: "Copié",
  paste: "Colle le lien de l'agenda dans ton application d'agenda.",
  cantCopy: "Impossible de copier",
  selectText: "Sélectionne le texte dans la zone et copie-le depuis là.",
  note: "Google actualise les agendas abonnés toutes les quelques heures, donc pour un changement le jour même, utilise aussi Ajouter à l'agenda sur l'entretien. Le lien est privé : toute personne qui l'a peut voir tes entretiens.",
  noteRenewable:
    "Google actualise les agendas abonnés toutes les quelques heures, donc pour un changement le jour même, utilise aussi Ajouter à l'agenda sur l'entretien. Le lien est privé : toute personne qui l'a peut voir tes entretiens, alors crées-en un nouveau s'il circule.",
  renew: "Créer un nouveau lien",
  renewHint: "Les agendas qui utilisent l'ancien lien ne se mettent plus à jour.",
  cancel: "Annuler",
  renewed: "Nouveau lien d'agenda prêt",
  renewedNote:
    "Les agendas qui utilisent l'ancien lien ne se mettent plus à jour. Abonne-toi à nouveau avec celui-ci.",
  renewFailed: "Impossible de créer un nouveau lien",
  loadFailed: "Le lien de ton agenda n'a pas chargé",
  tryAgain: "Réessayer",
  loading: "Récupération du lien de ton agenda",
} satisfies Translation<Messages["calendar"]>;
