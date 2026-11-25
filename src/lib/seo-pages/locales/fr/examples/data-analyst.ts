import type { ExampleWords } from "../../../examples";

export const dataAnalyst: ExampleWords<"data-analyst"> = {
  role: "Data analyst",
  card: "Du travail SQL, Python et Power BI qui aboutit à une décision prise par quelqu'un.",
  description:
    "Exemple de CV de data analyst : lignes SQL, Excel et Power BI qui montrent la décision issue de chaque analyse, plus les compétences et des conseils.",
  intro:
    "Tout data analyst connaît SQL et un outil de tableaux de bord : ça seul ne te distinguera pas. Ce qui te distingue, c'est la décision que ton travail a changée : un prix, un budget, un processus. Cet exemple termine chaque ligne par l'une d'elles.",
  person:
    "Emily est inventée : une data analyst avec 3 ans dans la distribution et la livraison de repas à Houston. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de data analyst",
    basics: {
      headline: "Data Analyst",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Data analyst avec 3 ans à transformer des données de ventes et de livraison en décisions pour les équipes opérations et marketing. Travaille surtout avec SQL, Python et Power BI.",
    experience: [
      {
        title: "Data Analyst",
        bullets: [
          "Créé un tableau de bord Power BI des délais de livraison par zone, utilisé par 30 responsables de ville lors de leur revue hebdomadaire.",
          "Découvert que 18 % des commandes en retard venaient de 4 cuisines partageant un même pool de livreurs, d'où un changement d'effectifs qui a réduit les retards d'un tiers.",
          "Écrit des modèles SQL dans BigQuery pour les indicateurs quotidiens de commandes, remplaçant 12 rapports Excel manuels et faisant gagner 10 heures par semaine à l'équipe.",
          "Mené un test A/B sur l'affichage des frais de livraison auprès de 200 000 commandes, et conservé la version qui a augmenté de 4 % les commandes récurrentes.",
        ],
      },
      {
        title: "Analyste MIS",
        bullets: [
          "Automatisé le rapport de stock hebdomadaire avec Python et Pandas, le faisant passer de 6 heures de copier-coller à 15 minutes.",
          "Construit un modèle Excel du taux d'écoulement par magasin qui a permis de déplacer les stocks lents entre 45 magasins avant les soldes de fin de saison.",
        ],
      },
    ],
    projects: [
      {
        name: "Pluie et commandes en ville",
        tech: "Python, Tableau",
        bullets: [
          "Croisé des données publiques de pluie avec 2 ans de commandes pour montrer comment la pluie déplace la demande heure par heure, publié en story Tableau.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Statistiques" }],
    skills: [
      {
        label: "Analyse",
        items: ["SQL", "Python", "Pandas", "Excel", "Statistiques", "Tests A/B"],
      },
      { label: "Outils BI", items: ["Power BI", "Tableau", "BigQuery", "Google Sheets"] },
    ],
    certifications: [{ name: "Microsoft Certified: Power BI Data Analyst Associate" }],
  },
  lines: [
    {
      weak: "Créé des tableaux de bord et des rapports pour la direction.",
      strong:
        "Créé un tableau de bord Power BI des délais de livraison par zone, utilisé par 30 responsables de ville lors de leur revue hebdomadaire.",
    },
    {
      weak: "Analysé des données pour trouver des insights.",
      strong:
        "Découvert que 18 % des commandes en retard venaient de 4 cuisines partageant un même pool de livreurs, d'où un changement d'effectifs qui a réduit les retards d'un tiers.",
    },
    {
      weak: "Responsable des rapports Excel hebdomadaires.",
      strong:
        "Automatisé le rapport de stock hebdomadaire avec Python et Pandas, le faisant passer de 6 heures de copier-coller à 15 minutes.",
    },
  ],
  skills: [{ label: "Requêtes et code" }, { label: "Tableurs et BI" }, { label: "Méthodes" }],
  tips: [
    {
      title: "Termine chaque ligne par la décision",
      text: "« Créé un tableau de bord » est une tâche. « Créé un tableau de bord que 30 managers utilisent pour planifier les équipes » est un résultat. La décision, c'est ce pour quoi le manager qui recrute te paie.",
    },
    {
      title: "Nomme l'outil dans la ligne",
      text: "Les offres citent en général SQL plus Power BI, Tableau ou Looker. Si tu as utilisé celui qu'elles citent, nomme-le dans la ligne où tu t'en es servi : le test de compatibilité d'Otto le verra démontré, pas seulement listé.",
    },
    {
      title: "Les postes MIS comptent",
      text: "En Inde, beaucoup d'analystes débutent comme MIS executives. Garde l'intitulé tel quel et laisse les lignes montrer l'analyse : automatisations, modèles et rapports qui ont changé quelque chose.",
    },
  ],
  mistakes: [
    {
      title: "Lister chaque type de graphique",
      text: "Les camemberts et les tableaux croisés dynamiques ne sont pas des compétences en soi. Nomme les outils, puis montre ce qu'une analyse a changé.",
    },
    {
      title: "Des insights sans chiffre",
      text: "« Trouvé des insights qui ont amélioré les ventes » ne peut pas être vérifié. Dis ce que tu as trouvé, quelle en était l'ampleur, et ce que l'équipe a fait ensuite.",
    },
    {
      title: "Une liste Kaggle au lieu d'un vrai travail",
      text: "Un projet avec des données réelles et désordonnées et une question claire vaut mieux que cinq notebooks de tutoriel. Mets d'abord ton travail en entreprise si tu en as.",
    },
  ],
  faq: [
    {
      question: "Quelles compétences montrer sur un CV de data analyst ?",
      answer:
        "SQL et un outil de tableaux de bord presque toujours, Excel quasiment toujours, et souvent Python ou R. Les statistiques et les tests A/B comptent pour les équipes produit et marketing. Montre chacune dans une ligne où tu l'as utilisée.",
    },
    {
      question: "Dois-je ajouter un portfolio en tant que data analyst ?",
      answer:
        "Oui, si tu as un projet que tu sais bien expliquer. Mets le lien vers une courte présentation ou un tableau de bord avec la question, les données, ce que tu as trouvé et ce qu'il faudrait faire.",
    },
    {
      question: "Un CV de data analyst est-il différent d'un CV de data scientist ?",
      answer:
        "Surtout par l'accent. Les data analysts montrent des décisions tirées du reporting et de l'analyse ; les data scientists montrent des modèles, des expériences et la façon dont ils sont arrivés en production.",
    },
  ],
};
