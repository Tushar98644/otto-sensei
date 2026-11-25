import type { ExampleWords } from "../../../examples";

export const dataScientist: ExampleWords<"data-scientist"> = {
  role: "Data scientist",
  card: "Des modèles liés à un résultat business, et la façon dont chacun est arrivé en production.",
  description:
    "Exemple de CV de data scientist : lignes de machine learning avec le résultat business et le passage en production, plus les compétences demandées.",
  intro:
    "Les CV de data science se lisent souvent comme des programmes de cours : modèles, bibliothèques, métriques. Les managers qui recrutent veulent savoir quel modèle est arrivé en production et ce qu'il a changé. Cet exemple relie chaque modèle à un résultat qui compte pour quelqu'un en dehors de l'équipe.",
  person:
    "Maya est inventée : une data scientist avec 4 ans dans l'assurance et la fintech à Boston. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de data scientist",
    basics: {
      headline: "Data Scientist",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Data scientist avec 4 ans à construire des modèles de tarification et de fraude en Python, du premier notebook à la production. À l'aise pour expliquer un modèle aux personnes qui doivent lui faire confiance.",
    experience: [
      {
        title: "Data Scientist senior",
        bullets: [
          "Construit en Python un modèle de fraude aux sinistres par gradient boosting qui repère 2 fraudes confirmées sur 3, contre 1 sur 3 avec les anciennes règles.",
          "Mis en production le modèle comme service FastAPI sur AWS avec suivi de la dérive, pour scorer 40 000 sinistres par jour.",
          "Mené une expérience de tarification sur 6 régions avec un groupe témoin, montrant un gain de marge de 3 % avant le déploiement complet.",
        ],
      },
      {
        title: "Data Scientist",
        bullets: [
          "Entraîné un modèle d'attrition avec scikit-learn qui a permis au support d'appeler 500 clients à risque par mois, réduisant l'attrition de ce groupe de 11 %.",
          "Construit un pipeline de features avec Spark et Airflow qui a réduit la préparation des données d'entraînement de 2 jours à 3 heures.",
          "Formé 25 analystes aux bases du machine learning lors d'un cours interne de 6 semaines avec des exercices hebdomadaires.",
        ],
      },
    ],
    projects: [
      {
        name: "Prévision des retards de bus",
        tech: "PyTorch, Pandas",
        bullets: [
          "Prédit les retards de bus à partir des données ouvertes de la ville avec un petit réseau de neurones, battant une référence saisonnière de 14 % sur un mois de test.",
        ],
      },
    ],
    education: [
      { degree: "M.S.", field: "Statistiques" },
      { degree: "B.S.", field: "Mathématiques" },
    ],
    skills: [
      { label: "Langages", items: ["Python", "SQL", "R"] },
      {
        label: "Modélisation",
        items: ["scikit-learn", "PyTorch", "Machine learning", "Statistiques", "Tests A/B"],
      },
      { label: "Données et déploiement", items: ["Spark", "Airflow", "AWS", "Docker", "MLOps"] },
    ],
  },
  lines: [
    {
      weak: "Construit des modèles de machine learning avec Python.",
      strong:
        "Construit en Python un modèle de fraude aux sinistres par gradient boosting qui repère 2 fraudes confirmées sur 3, contre 1 sur 3 avec les anciennes règles.",
    },
    {
      weak: "Déployé des modèles en production.",
      strong:
        "Mis en production le modèle comme service FastAPI sur AWS avec suivi de la dérive, pour scorer 40 000 sinistres par jour.",
    },
    {
      weak: "Travaillé avec les parties prenantes sur des expériences.",
      strong:
        "Mené une expérience de tarification sur 6 régions avec un groupe témoin, montrant un gain de marge de 3 % avant le déploiement complet.",
    },
  ],
  skills: [{ label: "Code" }, { label: "Modélisation" }, { label: "Données et production" }],
  tips: [
    {
      title: "Traduis la métrique",
      text: "Une AUC de 0,91 ne dit pas grand-chose à un manager en dehors de l'équipe. « Repère 2 fraudes sur 3 au lieu de 1 sur 3 » veut dire la même chose, et tout le monde peut suivre. Donne les deux si tu veux.",
    },
    {
      title: "Montre le chemin vers la production",
      text: "Dis comment le modèle était servi, à quelle fréquence il tourne et comment tu savais qu'il fonctionnait toujours. C'est ce qui distingue un data scientist d'un notebook.",
    },
    {
      title: "Décris simplement ton travail sur les LLM",
      text: "Si tu as construit avec des grands modèles de langage, dis ce que faisait le système, comment tu l'as mesuré et ce qu'il coûtait. « Travaillé sur la GenAI » ne dit rien au lecteur.",
    },
  ],
  mistakes: [
    {
      title: "Une liste d'algorithmes",
      text: "Random forests, XGBoost, k-means et LSTM à la suite, ça se lit comme un programme de cours. Cite la méthode dans la ligne où elle a résolu un problème.",
    },
    {
      title: "L'accuracy sur un problème déséquilibré",
      text: "« 98 % d'accuracy » sur la fraude, c'est facile si la fraude représente 1 % des cas, et ceux qui te font passer l'entretien le savent. Utilise la métrique qui correspond au problème, et explique pourquoi.",
    },
    {
      title: "Aucune notion d'échelle",
      text: "Lignes, utilisateurs, prédictions par jour, argent en jeu. Sans l'un d'eux, le lecteur ne peut pas distinguer un projet de cours d'un système en production.",
    },
  ],
  faq: [
    {
      question: "Un CV de data scientist doit-il lister les compétitions Kaggle ?",
      answer:
        "Seulement un bon classement, et seulement si tu peux en parler. Le travail en entreprise et un projet bien expliqué comptent en général davantage.",
    },
    {
      question: "Dois-je avoir un master sur mon CV ?",
      answer:
        "Indique ton diplôme le plus élevé et sa spécialité. Beaucoup d'équipes recrutent sans master si le travail montre les compétences ; c'est dans la section expérience que tu le prouves.",
    },
    {
      question: "À quel point un CV de data scientist doit-il être technique ?",
      answer:
        "Assez technique pour la personne qui te fait passer l'entretien, et assez simple pour le recruteur qui le lit en premier. Nomme la méthode et les outils, puis termine la ligne par le résultat business.",
    },
  ],
};
