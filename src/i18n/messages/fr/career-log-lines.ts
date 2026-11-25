import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  gone: "Ces lignes ne sont plus là",
  goneNote: "Écris-les à nouveau depuis ton journal de carrière.",
  noResume: "Ce CV n’est plus dans ta liste",
  alreadyOn: "Ces lignes sont déjà sur cet emploi",
  added: {
    one: "{count} ligne ajoutée depuis ton journal de carrière",
    other: "{count} lignes ajoutées depuis ton journal de carrière",
  },
  changed: "Tu l’as modifié depuis",
  useUndo: "Utilise Annuler en haut de l’éditeur.",
  title: "Depuis ton journal de carrière",
  description: "Accepte les lignes qui sont vraies. Rien ne va sur ton CV tant que tu ne l’as pas fait.",
  notNow: "Pas maintenant",
  addCount: {
    one: "Ajouter {count} ligne",
    other: "Ajouter {count} lignes",
  },
  addLines: "Ajouter des lignes",
  fromNotes: {
    one: "{count} ligne tirée de tes notes",
    other: "{count} lignes tirées de tes notes",
  },
  note: "Chaque ligne vient de ce que tu as écrit. Là où un chiffre aiderait et que tu ne l’as pas donné, j’ai laissé un blanc pour toi.",
  addTo: "Les ajouter à",
  addingTo: "Ajout à <b>{job}</b>",
  noJob: "Ajoute d’abord l’emploi à ce CV, puis réessaie.",
  fromMonths: "Tiré de tes notes de {months} : « {quote} »",
  needsFact: "Otto a besoin d’un fait : {blank}",
  onlyIfKnown: "Seulement si tu le sais",
  accepted: "Acceptée",
  accept: "Accepter",
  pressAgain: "Appuie à nouveau pour la laisser de côté.",
  fillBlank: "Remplis le blanc pour l’accepter, ou laisse-la de côté.",
  jobNumber: "Emploi {number}",
} satisfies Translation<Messages["careerLogLines"]>;
