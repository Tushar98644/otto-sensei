import type { Messages } from "..";
import type { Translation } from "../../types";

// The ATS guide pages around each system's sourced notes, in French.
export default {
  topics: {
    titles: {
      file: "Comment il lit ton fichier",
      search: "Comment les recruteurs y font leurs recherches",
      screening: "Les questions qui peuvent t'éliminer",
      ai: "Matching et classement par IA",
      review: "Comment des personnes examinent les candidats",
    },
    phrases: {
      file: "la lecture de ton fichier",
      search: "les recherches des recruteurs",
      screening: "les questions de présélection",
      ai: "le matching par IA",
      review: "l'examen humain des candidatures",
    },
    short: {
      file: "lecture du fichier",
      search: "recherche des recruteurs",
      screening: "questions de présélection",
      ai: "matching par IA",
      review: "examen humain",
    },
  },
  meta: {
    index: {
      title: "Guides ATS : comment le logiciel de recrutement lit un CV",
      description:
        "Comment {count} logiciels ATS, de Greenhouse et Workday à Taleo, lisent les CV, filtrent les candidats et les classent par IA. Chaque note cite sa source.",
    },
    reads: "ATS {name} : comment il lit ton CV",
    does: "ATS {name} : ce qu'il fait de ta candidature",
  },
  headline: {
    reads: "Comment {name} lit ton CV",
    does: "Ce que {name} fait de ta candidature",
  },
  // The first intro and ending, in this order, that fit a search result.
  description: {
    intros: {
      long: "Ce que l'ATS {name} fait de ta candidature : {topics}.",
      plain: "Ce que {name} fait de ta candidature : {topics}.",
      short: "Ce que l'ATS {name} fait de ta candidature : {short}.",
      brief: "Guide de l'ATS {name} : {short}.",
    },
    endings: {
      sourcedGeneral: "{sourced}, et des conseils généraux pour tout ATS.",
      sourcedAny: "{sourced}, et des conseils pour tout ATS.",
      briefGeneral: "{brief}, et des conseils généraux pour tout ATS.",
      briefAny: "{brief}, et des conseils pour tout ATS.",
      sourced: "{sourced}.",
      brief: "{brief}.",
    },
    sourced: {
      one: "Une note sourcée, avec un conseil pratique et sa source",
      other: "{count} notes sourcées, chacune avec un conseil pratique et sa source",
    },
    brief: {
      one: "Une note sourcée avec un conseil pratique",
      other: "{count} notes sourcées avec des conseils pratiques",
    },
  },
  sources: {
    on: "{label} sur {topics}",
    nth: "{label} ({count})",
    covers: "sur {topics}",
  },
  crumb: "Guides ATS",
  index: {
    eyebrow: "Guides ATS",
    title: "Comment le logiciel de recrutement",
    titleEm: "lit ton CV",
    intro:
      "Un système de suivi des candidatures (ATS) est le logiciel que les employeurs utilisent pour recevoir et trier les candidatures. Voici ce qu'Otto a trouvé sur {count} d'entre eux, avec pour chaque note un lien vers la page d'où elle vient.",
    systems: "Logiciels de recrutement",
    notes: "{count} notes sourcées",
    generalTitle: "Des conseils valables pour la plupart d'entre eux",
    generalIntro:
      "Ces conseils reviennent encore et encore pour les logiciels ci-dessus. Chaque guide donne les détails, et les sources, pour un logiciel précis.",
  },
  guide: {
    eyebrow: "Guide ATS",
    count: {
      one: "1 note sourcée, avec un lien vers la page d'où elle vient.",
      other: "{count} notes sourcées, chacune avec un lien vers la page d'où elle vient.",
    },
    setUp:
      "Chaque employeur configure {name} à sa façon : toutes les notes ne s'appliquent donc pas à chaque offre.",
    spotTitle: "Comment savoir si une offre utilise {name}",
    noFileNotes:
      "Les notes d'Otto ne couvrent pas encore la façon dont {name} lit les fichiers : il n'y a donc rien de sourcé à partager ici. Les <link>conseils généraux</link> ci-dessous sont un point de départ sûr.",
    whatToDo: "À faire :",
    optIn: "Seulement si l'employeur l'active",
    source: "Source :",
    generalTitle: "Conseils généraux pour tout logiciel de recrutement",
    generalIntro:
      "Ces conseils ne sont pas propres à {name}. Ils reviennent encore et encore dans les notes qu'Otto a sur {count} logiciels de recrutement.",
    sourcesTitle: "Sources",
    aside: "Prochaines étapes et autres guides",
    sideTitle: "Tu postules via {name} ?",
    sideText: "Vois lesquelles des compétences de l'offre ton CV montre. Gratuit, sans connexion.",
    moreTitle: "Autres guides ATS",
    templatesLink: "Modèles de CV sur une seule colonne de vrai texte",
    compareLink: "Comment Otto se compare aux autres outils",
  },
  jobLink: {
    label: "Lien de l'offre",
    submit: "Comparer mon CV à cette offre",
    empty: "Colle le lien d'une offre et je te dirai si elle utilise {name}.",
    unknown:
      "Je n'arrive pas à identifier le logiciel de recrutement à partir de ce lien. Les conseils généraux ci-dessous s'appliquent quand même.",
    same: "Cette offre utilise {name} : les notes de cette page s'y appliquent donc.",
    other:
      "Cette offre utilise {other}, pas {name}. Son propre guide contient les notes qui la concernent.",
    readGuide: "Lire le guide {name}",
  },
} satisfies Translation<Messages["ats"]>;
