import type { Messages } from "..";
import type { Translation } from "../../types";

// The comparison pages around each product's facts, in French; the brand stays Otto Sensei.
export default {
  title: "{brand} vs {name}",
  meta: {
    index: {
      title: "{brand} comparé à {count} autres outils de CV",
      description:
        "Comparatifs justes et sourcés : {brand} face à {count} outils de CV, dont Jobscan, Rezi, Zety, Teal et Canva. Points forts et forfaits de chacun.",
    },
    page: {
      title: "Alternative à {name} : {compare} comparés",
      description:
        "{compare} : points forts de chacun, contenu des forfaits gratuits et payants, et différences. D'après les pages de chaque produit.",
    },
  },
  crumb: "Comparer",
  index: {
    eyebrow: "Comparer",
    title: "{brand} face aux autres outils",
    intro:
      "{short} ne s'arrête pas au CV : il continue avec les offres, les candidatures et les entretiens. Voici comment il se compare, outil par outil.",
    facts:
      "Les informations sur chaque produit viennent de son propre site, à jour en <link>{month}</link>, avec un lien vers chaque source sur chaque page.",
    listTitle: "{brand} vs les autres",
    cta: "Essaie {brand} sur ton CV",
  },
  pipeline: {
    title: "Plus qu'un vérificateur de CV",
    intro:
      "{brand}, c'est toute ta recherche d'emploi dans un seul compte, de la première vérification de CV jusqu'à l'entretien.",
    steps: {
      check: {
        title: "Vérifie ton CV",
        text: "Vois ce que lit le logiciel de recrutement, corrige les lignes faibles avec Otto, télécharge un PDF propre.",
      },
      jobs: {
        title: "Trouve des offres qui te correspondent",
        text: "Des offres ouvertes issues des sites des entreprises, lues chaque jour et classées pour ton CV.",
      },
      tailor: {
        title: "Adapte chaque candidature",
        text: "Une copie de ton CV pour chaque offre, plus des lettres de motivation et des messages de prise de contact.",
      },
      track: {
        title: "Suis tout depuis ta boîte mail",
        text: "Tes candidatures sur un seul tableau, qui avancent toutes seules grâce à tes e-mails de candidature.",
      },
      prep: {
        title: "Prépare tes entretiens",
        text: "Les questions probables et des histoires tirées de ton propre CV, pour chaque entretien.",
      },
      share: {
        title: "Partage un portfolio",
        text: "Un site portfolio créé à partir de ton CV, avec ton propre lien.",
      },
    },
  },
  page: {
    eyebrow: "Alternative à {name}",
    intro:
      "{brand}, c'est toute ta recherche d'emploi dans un seul compte : un CV que le logiciel de recrutement sait lire, des offres classées pour lui, des candidatures qui se suivent toutes seules et la préparation de chaque entretien.",
    tryTitle: "Essaie-le sur ton CV",
    matchCheck: "Lancer le test de compatibilité gratuit",
    noSignIn: "Gratuit, sans connexion.",
    reasonsTitle: "Pourquoi choisir {brand}",
    sideBySide: "{short} et {name}, côte à côte",
    tableCaption: "{brand} et {name}, côte à côte",
    fromSite:
      "Tout ce qui concerne {name} sur cette page vient de son propre site, <link>{checked}</link>.",
    byCountry:
      "{name} affiche des prix propres à chaque pays ; ceux qui figurent ici sont ceux qu'il affichait en Inde.",
    pricesChange: "Les prix et les forfaits changent : vérifie donc les <link>sources</link>.",
    checkedOn: "vérifié le {date}",
    asListed: "tel qu'affiché en {month}",
    pickTitle: "Vois ce que {short} pense de ton CV",
    pickText: "Le vérifier et le comparer à une offre, c'est gratuit, sans carte bancaire.",
    sources: "Sources",
    pricing: "Tarifs {brand}",
    pricesNote: "Prix en dollars américains. Des taxes peuvent s'appliquer.",
    trademark:
      "{name} est une marque de son propriétaire, citée ici uniquement pour identifier son produit. Cette page n'est ni réalisée avec {name}, ni approuvée par ce dernier. Tu as repéré une info dépassée ? Écris à <link>{email}</link> et on vérifiera.",
    moreTitle: "Autres comparatifs",
  },
} satisfies Translation<Messages["compare"]>;
