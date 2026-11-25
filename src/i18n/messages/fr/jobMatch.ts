import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  list: "{items} et {count} de plus",
  roleMatch: "Poste équivalent : {job} ≈ ton poste de {person}. ",
  found: "Trouvé dans ton CV : {list}.",
  notFound: "Absent de ton CV : {list}.",
  noTools: "L'offre ne cite aucun outil à comparer.",
  kind: {
    same: "Le même métier que le tien.",
    sameNamed: "Le même métier que le tien : {name}.",
    close: "Un métier très proche.",
    closeNamed: "Un métier très proche : {name}.",
    group: "Un type de travail voisin.",
    groupNamed: "Un type de travail voisin : {name}.",
    neighbour: "Un type de poste voisin.",
    sameRole: "Le même type de poste que le tien.",
    earlier: "Comme un poste précédent de ton CV.",
  },
  nothing: "Rien de ce que cite l'offre ne figure dans ce CV.",
  nothingToCheck: "Ce CV et cette offre n'ont rien en commun que je puisse vérifier.",
  levels: {
    intern: "un stage",
    junior: "un poste débutant",
    mid: "un poste de niveau intermédiaire",
    senior: "un poste confirmé",
    lead: "un poste de lead ou de staff",
    director: "un poste de direction",
  },
  stepUp: "C'est {level}, un cran au-dessus de ton dernier poste.",
  stepDown: "C'est {level}, un niveau en dessous de ton dernier poste.",
  training:
    "Ce type de poste demande souvent plus de formation ou d'expérience que ton dernier poste.",
  years: "Demande {asked}+ ans d'expérience ; ton CV en montre environ {shown}.",
  yearsShown: { one: "{count} an", other: "{count} ans" },
  visa: {
    ukSponsor: "Inscrite comme sponsor de visas au Royaume-Uni",
    h1b: "Demandes de visa H-1B approuvées pour l'exercice {year} (USCIS)",
  },
} satisfies Translation<Messages["jobMatch"]>;
