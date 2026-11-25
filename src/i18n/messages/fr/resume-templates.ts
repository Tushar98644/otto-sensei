import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume templates page, in French. Format names stay as they are (Classic, Compact).
export default {
  meta: {
    title: "Modèles de CV ATS : {count} formats, {free} gratuits",
    description:
      "{count} modèles de CV sur une colonne de vrai texte, testés en relisant le PDF. {freeFormats} sont gratuits en PDF ; {proCount} autres sont inclus avec {pro}.",
  },
  crumb: "Modèles de CV",
  eyebrow: "Modèles de CV",
  title: "{count} formats de CV,",
  titleEm: "chacun sur une seule colonne de vrai texte.",
  intro:
    "Chacun reprend une mise en page de CV très répandue, et chaque PDF est testé en le relisant. {freeFormats} se téléchargent gratuitement en PDF ; les {proCount} autres sont inclus avec {pro}, et tu peux d'abord les essayer sur ton CV.",
  tip: "Tu hésites ? Classic convient à tous les postes. Compact fait tenir une longue carrière sur une page.",
  formatsTitle: "Formats",
  listName: "Formats de CV",
  preview: "Voir la page {name} en entier",
  use: "Utiliser ce format",
  close: "Fermer",
  imageAlt: "Page 1 d'un exemple de CV au format {name}",
  formats: {
    classic: {
      description:
        "La mise en page que recommandent les services carrières des universités : police simple, titres centrés sans filet, et l'employeur au-dessus de ton intitulé de poste pour chaque expérience.",
      bestFor: "Tous les postes, partout. Le choix sûr quand tu hésites.",
    },
    modern: {
      description:
        "Un grand nom en deux tons, des titres qui commencent en couleur avec un filet jusqu'au bord, et les intitulés de poste en petites capitales.",
      bestFor: "La tech, les startups et les équipes attentives au design.",
    },
    compact: {
      description:
        "Le format d'une page que les écoles de commerce envoient aux banques : police de style Times, titres en capitales sous des filets fins, puces carrées et années seules.",
      bestFor: "La finance, le conseil et les longues carrières qui doivent tenir sur une page.",
    },
    executive: {
      description:
        "Police à empattements de style Palatino, ton nom en couleur à côté de ton titre professionnel, titres de section en couleur au-dessus de filets légers, et des espacements généreux.",
      bestFor: "Postes seniors, finance, droit et conseil.",
    },
    developer: {
      description:
        "Le modèle que partagent les ingénieurs : police à empattements de style livre, titres en petites capitales au-dessus de filets pleine largeur, intitulés en gras au-dessus du nom de l'entreprise en italique. Compétences et projets en premier.",
      bestFor: "Ingénieurs logiciels et autres postes techniques.",
    },
    minimal: {
      description:
        "Noir uniquement : police à empattements de style Charter, un grand nom sobre, titres en gras au-dessus de filets fins, et chaque poste sur une seule ligne.",
      bestFor: "Les ingénieurs et tous ceux qui veulent une page calme et simple.",
    },
  },
  commonTitle: "Ce que tous les formats ont en commun",
  common: {
    oneColumn: {
      title: "Une seule colonne de vrai texte",
      text: "Le texte se lit de haut en bas dans le bon ordre, chaque titre sur sa propre ligne. Chaque format est testé en relisant son PDF, sur papier Lettre US et A4.",
    },
    unscrambled: {
      title: "Rien qui mélange les mots",
      text: "Pas d'icônes, pas de lignes justifiées, et pas de lettres très espacées qui se relisent comme « P R O F I L ».",
    },
    sameWords: {
      title: "Mêmes mots, n'importe quel style",
      text: "Change de format quand tu veux. Ton CV reste le même ; seule la page autour change.",
    },
    pdfFree: {
      title: "PDF gratuit, Word avec {pro}",
      text: "Télécharge {freeFormats} en PDF gratuitement, autant de fois que tu veux. Les {proCount} autres formats et les téléchargements Word (.docx) sont inclus avec {pro}.",
    },
  },
  faq: {
    free: {
      question: "Ces modèles de CV sont-ils gratuits ?",
      answer:
        "{freeFormats} sont gratuits, sans paiement exigé au moment du téléchargement et sans compte. Les {proCount} autres formats sont inclus avec {pro}. Avec {free}, un CV réglé sur un format {pro} se télécharge au format {fallback}.",
    },
    ats: {
      question: "Les logiciels de recrutement vont-ils les lire ?",
      answer:
        "Chacun tient sur une seule colonne de vrai texte, dans l'ordre de lecture, et chaque PDF est testé en le relisant. Chaque employeur configure son logiciel de recrutement à sa manière : personne ne peut donc promettre comment un logiciel donné traitera ton CV. Les <link>guides ATS</link> montrent ce que l'on sait des logiciels courants.",
    },
    pick: {
      question: "Lequel choisir ?",
      answer:
        "{classic} convient à tous les postes, partout : le choix sûr quand tu hésites. {compact} fait tenir une longue carrière sur une page, et {developer} met les compétences et les projets en premier. Change quand tu veux : tes mots restent les mêmes.",
    },
    own: {
      question: "Puis-je utiliser mon propre CV ?",
      answer:
        "Oui. Importe un fichier PDF ou Word dans le studio, ou pars de zéro. « Utiliser ce format » applique le format au CV que tu as ouvert. Si aucun n'est ouvert, le studio te demande ton CV avec le format déjà choisi. Tu peux essayer un format {pro} avec {free} ; il se télécharge au format {fallback} tant que tu n'as pas {pro}.",
    },
  },
} satisfies Translation<Messages["resumeTemplates"]>;
