import type { Messages } from "..";
import type { Translation } from "../../types";

// Header, footer, navigation, the language hint and the 404 page, in French.
export default {
  nav: {
    label: "Navigation principale",
    howItWorks: "Comment ça marche",
    jobs: "Emplois",
    pricing: "Tarifs",
    signIn: "Connexion",
    dashboard: "Tableau de bord",
    menu: "Menu",
  },
  checkMyResume: "Vérifier mon CV",
  footer: {
    label: "Pied de page",
    tagline: "Fait pour les chercheurs d'emploi du monde entier.",
    groups: {
      product: "Produit",
      guides: "Ressources",
      legal: "Juridique",
    },
    links: {
      resumeBuilder: "Créateur de CV",
      jobMatch: "Test de compatibilité",
      coverLetters: "Lettres de motivation",
      applicationTracker: "Suivi des candidatures",
      interviewPrep: "Préparation aux entretiens",
      portfolioWebsite: "Site portfolio",
      pricing: "Tarifs",
      resumeExamples: "Exemples de CV",
      resumeTemplates: "Modèles de CV",
      atsGuides: "Guides ATS",
      comparisons: "Comparatifs",
      privacy: "Confidentialité",
      terms: "Conditions",
      refunds: "Remboursements",
      acceptableUse: "Utilisation acceptable",
    },
    payments: "Paiements par {merchant}",
    language: "Langue",
  },
  languageHint: {
    text: "Cette page existe aussi en français.",
    link: "Lire en français",
    dismiss: "Fermer",
  },
  notFound: {
    title: "Page introuvable",
    otto: "Otto la loutre, l'air inquiet",
    text: "J'ai cherché partout, mais cette page n'est pas ici. Le lien est peut-être ancien ou mal saisi.",
    home: "Aller à la page d'accueil",
  },
} satisfies Translation<Messages["site"]>;
