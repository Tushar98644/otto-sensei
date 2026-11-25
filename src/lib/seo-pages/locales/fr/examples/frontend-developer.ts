import type { ExampleWords } from "../../../examples";

export const frontendDeveloper: ExampleWords<"frontend-developer"> = {
  role: "Développeur frontend",
  card: "React et TypeScript, avec la vitesse et l'accessibilité en chiffres.",
  description:
    "Exemple de CV de développeur frontend : lignes React et TypeScript chiffrées, compétences demandées, et comment montrer vitesse et accessibilité.",
  intro:
    "Un CV frontend doit prouver deux choses en quelques secondes : que tu construis des interfaces que les gens utilisent, et que leur vitesse et leur accessibilité comptent pour toi. Cet exemple montre les deux avec des chiffres qu'un manager qui recrute peut vérifier.",
  person:
    "Daniel est inventé : un développeur frontend avec 5 ans dans des entreprises produit, en télétravail depuis Minneapolis. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de développeur frontend",
    basics: {
      headline: "Développeur frontend",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Développeur frontend avec 5 ans à créer des applications React et TypeScript pour des boutiques en ligne et des tableaux de bord SaaS. Reconnu pour ses pages rapides, ses design systems soignés et ses formulaires accessibles.",
    experience: [
      {
        title: "Développeur frontend senior",
        bullets: [
          "Reconstruit la page produit en Next.js avec le rendu côté serveur, en réduisant le Largest Contentful Paint de 3,9 s à 1,6 s sur les téléphones milieu de gamme.",
          "Piloté la migration de 120 composants vers un design system partagé dans Storybook, utilisé par 4 équipes produit.",
          "Corrigé 64 problèmes WCAG dans le tunnel de paiement après un audit, et ajouté des tests Playwright qui font échouer le build à chaque nouveau problème.",
          "Encadré 2 développeurs juniors par des revues de code et du pair programming ; tous deux gèrent désormais des fonctionnalités de bout en bout.",
        ],
      },
      {
        title: "Développeur frontend",
        bullets: [
          "Créé en React, TypeScript et D3.js le tableau de bord analytique que 900 comptes clients ouvrent chaque semaine.",
          "Réduit le bundle JavaScript principal de 780 Ko à 310 Ko en découpant les routes et en remplaçant deux bibliothèques de graphiques trop lourdes.",
          "Écrit des tests unitaires avec Jest pour les écrans de facturation, en faisant passer la couverture de 35 % à 80 % en 6 mois.",
        ],
      },
    ],
    projects: [
      {
        name: "Vérificateur de contraste des couleurs",
        tech: "TypeScript, Vite",
        bullets: [
          "Créé un outil gratuit dans le navigateur qui vérifie les couleurs de texte selon les ratios de contraste WCAG, avec 2 000 visiteurs par mois.",
        ],
      },
    ],
    education: [{ degree: "Licence", field: "Informatique" }],
    skills: [
      { label: "Langages", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Redux", "Tailwind CSS", "D3.js"],
      },
      { label: "Qualité", items: ["Jest", "Playwright", "Storybook", "WCAG", "Figma"] },
    ],
  },
  lines: [
    {
      weak: "Développé divers composants d'interface pour le site.",
      strong:
        "Piloté la migration de 120 composants vers un design system partagé dans Storybook, utilisé par 4 équipes produit.",
    },
    {
      weak: "Amélioré les performances du site.",
      strong:
        "Reconstruit la page produit en Next.js avec le rendu côté serveur, en réduisant le Largest Contentful Paint de 3,9 s à 1,6 s sur les téléphones milieu de gamme.",
    },
    {
      weak: "Rendu le site accessible.",
      strong:
        "Corrigé 64 problèmes WCAG dans le tunnel de paiement après un audit, et ajouté des tests Playwright qui font échouer le build à chaque nouveau problème.",
    },
  ],
  skills: [{ label: "Langages" }, { label: "Frameworks" }, { label: "Tests et savoir-faire" }],
  tips: [
    {
      title: "Mesure la vitesse comme les équipes le font",
      text: "Nomme l'indicateur et l'appareil : le Largest Contentful Paint sur un téléphone milieu de gamme, la taille du bundle en Ko, le time to interactive. « Rendu le site plus rapide » ne donne à la personne qui te fait passer l'entretien rien à demander.",
    },
    {
      title: "Mets le lien vers un projet en ligne",
      text: "Un portfolio ou un projet en ligne permet au lecteur de cliquer au lieu de te croire sur parole. Mets le lien dans l'en-tête, et vérifie qu'il se charge bien sur un téléphone.",
    },
    {
      title: "Nomme le framework que cite l'offre",
      text: "Si l'offre demande React et que tu as travaillé en React, écris React dans la ligne, pas seulement « frameworks JavaScript ». Le test de compatibilité d'Otto cherche les mots exacts de l'offre.",
    },
  ],
  mistakes: [
    {
      title: "Un portfolio en captures d'écran dans le CV",
      text: "Les images et les mises en page d'outils de design plaisent aux humains, mais un logiciel de recrutement n'y lit rien. Garde le CV en texte et mets un lien vers les visuels.",
    },
    {
      title: "Chaque bibliothèque que tu as importée",
      text: "Lodash et Axios ne te feront pas décrocher d'entretien. Liste les frameworks et les outils que tu as choisis et que tu sais défendre, et garde le reste pour la conversation.",
    },
    {
      title: "Des mots vagues comme « divers » et « plusieurs »",
      text: "La vérification des lignes d'Otto les signale parce qu'ils cachent l'ampleur. Compte plutôt les composants, les pages ou les équipes.",
    },
  ],
  faq: [
    {
      question: "Faut-il soigner le design d'un CV de développeur frontend ?",
      answer:
        "Reste sobre. Ton portfolio montre ton sens du design ; le CV doit se lire proprement dans les logiciels de recrutement, qui mélangent les colonnes, les icônes et les zones de texte. Une seule colonne de vrai texte est le choix le plus sûr.",
    },
    {
      question: "React suffit-il, ou me faut-il d'autres frameworks ?",
      answer:
        "Aligne-toi sur l'offre. Beaucoup d'équipes recrutent pour React avec TypeScript, mais certaines demandent Vue ou Angular. Nomme ce que tu as vraiment utilisé, et adapte l'ordre à chaque offre.",
    },
    {
      question: "Ai-je besoin d'un portfolio en tant que développeur frontend ?",
      answer:
        "Ça aide beaucoup. Un ou deux projets en ligne, avec une courte note sur ce que tu as construit et pourquoi, valent plus qu'une longue liste de tutoriels.",
    },
  ],
};
