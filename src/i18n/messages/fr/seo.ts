import type { Messages } from "..";
import type { Translation } from "../../types";

// Words the comparisons, ATS guides, resume examples and templates share, in French.
export default {
  newTab: "(s'ouvre dans un nouvel onglet)",
  checkCta: {
    title: "Vois comment se lit ton CV",
    text: "Compare ton CV à une offre d'emploi, ou vois le texte que le logiciel de recrutement extrait de ton fichier. Les deux sont gratuits, sans carte bancaire.",
  },
  related: {
    builder: {
      title: "Créateur de CV",
      text: "Comment Otto crée et vérifie un CV, ce qui est gratuit, et ce qu'ajoute {pro}.",
    },
    pricing: {
      title: "Tarifs",
      text: "Ce qui est gratuit, et ce qu'ajoutent {pro} et {max}.",
    },
  },
} satisfies Translation<Messages["seo"]>;
