import type { ExampleWords } from "../../../examples";

export const businessAnalyst: ExampleWords<"business-analyst"> = {
  role: "Business analyst",
  card: "Exigences, cartographies de processus et données qui ont changé la façon de travailler d'une équipe.",
  description:
    "Exemple de CV de business analyst : exigences, processus et SQL dans des lignes qui montrent ce qui a changé, plus les compétences, outils et conseils.",
  intro:
    "Un business analyst se tient entre les personnes qui font tourner un processus et celles qui le changent. Le CV doit montrer les deux côtés : ce que tu as découvert, ce que tu as documenté, et ce qui s'est amélioré une fois le changement livré. Cet exemple le fait pour une banque et un assureur.",
  person:
    "Natalie est inventée : une business analyst avec 5 ans dans une banque et chez un assureur à Charlotte, qui a évolué depuis la gestion des sinistres. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de business analyst",
    basics: {
      headline: "Business Analyst",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Business analyst avec 5 ans dans la banque et l'assurance, qui transforme des processus confus en exigences claires et en corrections mesurables. Travaille avec SQL, Excel et Power BI, aussi à l'aise avec les équipes opérationnelles qu'avec les ingénieurs.",
    experience: [
      {
        title: "Business Analyst senior",
        bullets: [
          "Cartographié le processus de prêt aux petites entreprises sur 4 équipes et 23 transmissions, puis rédigé les exigences qui ont réduit le délai d'approbation de 19 à 8 jours.",
          "Rédigé 140 user stories avec critères d'acceptation pour un nouveau portail de prêts, et mené des tests utilisateurs avec 12 analystes crédit qui ont révélé 31 défauts avant lancement.",
          "Analysé en SQL 3 ans de données de prêts pour montrer que 40 % des reprises venaient de 2 champs manquants du formulaire de demande, que l'équipe a rendus obligatoires.",
          "Créé un tableau de bord Power BI des prêts par étape que 15 directeurs d'agence consultent chaque jour, à la place d'un tableur envoyé chaque semaine par e-mail.",
        ],
      },
      {
        title: "Business Analyst",
        bullets: [
          "Documenté le processus de déclaration des sinistres et repéré 6 étapes de saisie en double, supprimées dans une version qui a fait gagner 5 heures par semaine à chaque gestionnaire.",
          "Recueilli les besoins de 30 gestionnaires pour une page de suivi des sinistres, qui a réduit de 22 % les appels de suivi au centre d'appels.",
        ],
      },
      {
        title: "Gestionnaire sinistres",
        bullets: [
          "Géré 60 dossiers de sinistres auto par semaine et rédigé le premier guide pratique de l'équipe, devenu le support de formation de 25 nouvelles recrues.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Administration des entreprises" }],
    skills: [
      {
        label: "Analyse",
        items: [
          "Recueil des besoins",
          "Cartographie des processus",
          "User stories",
          "Recette utilisateur",
          "Analyse de données",
        ],
      },
      { label: "Outils", items: ["SQL", "Excel", "Power BI", "Jira", "Confluence", "Visio"] },
    ],
    certifications: [{ name: "Certification of Capability in Business Analysis (CCBA)" }],
  },
  lines: [
    {
      weak: "Recueilli les besoins auprès des parties prenantes.",
      strong:
        "Cartographié le processus de prêt aux petites entreprises sur 4 équipes et 23 transmissions, puis rédigé les exigences qui ont réduit le délai d'approbation de 19 à 8 jours.",
    },
    {
      weak: "Impliquée dans des projets d'amélioration des processus.",
      strong:
        "Documenté le processus de déclaration des sinistres et repéré 6 étapes de saisie en double, supprimées dans une version qui a fait gagner 5 heures par semaine à chaque gestionnaire.",
    },
    {
      weak: "Réalisé diverses tâches d'analyse de données avec SQL.",
      strong:
        "Analysé en SQL 3 ans de données de prêts pour montrer que 40 % des reprises venaient de 2 champs manquants du formulaire de demande, que l'équipe a rendus obligatoires.",
    },
  ],
  skills: [{ label: "Analyse" }, { label: "Mise en œuvre" }, { label: "Outils de données" }],
  tips: [
    {
      title: "Montre le processus avant et après",
      text: "Délais d'approbation, étapes supprimées, erreurs, heures gagnées. Le travail d'un business analyst se voit dans la façon dont le processus tourne après le changement : mesure-le avant de commencer.",
    },
    {
      title: "Compte les documents que tu as rédigés",
      text: "User stories, cartographies de processus, exigences et cas de test. Dis combien, et qui les a validés : ça montre que tu sais porter un changement de la salle de réunion jusqu'à la mise en production.",
    },
    {
      title: "Mets SQL dans une ligne, pas seulement dans une liste",
      text: "Beaucoup d'offres de business analyst demandent SQL ou une bonne maîtrise d'Excel. Une ligne où une requête a trouvé la cause d'un problème le prouve mieux qu'une liste de compétences.",
    },
  ],
  mistakes: [
    {
      title: "« Interface entre les métiers et l'IT »",
      text: "Ça ne fait que répéter l'intitulé du poste. Dis sur quoi les deux côtés se sont mis d'accord grâce à toi, et ce qui a été livré en conséquence.",
    },
    {
      title: "Les outils, jamais le changement",
      text: "Jira, Visio et Confluence sont l'endroit où vit le travail, pas le travail lui-même. Chaque ligne a besoin d'un processus, d'une décision ou d'un chiffre qui a bougé.",
    },
    {
      title: "Cacher tes années en opérations",
      text: "Ton passage par les sinistres, la facturation ou un centre d'appels explique pourquoi tu comprends le processus. Garde ce poste sur la page, avec une ligne qui montre que tu as amélioré son fonctionnement.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de business analyst ?",
      answer:
        "Les processus ou systèmes que tu as analysés, les exigences que tu as rédigées, les outils que tu as utilisés, et ce qui a changé ensuite : temps gagné, erreurs réduites ou coûts évités. Ajoute une certification ECBA, CCBA ou CBAP si tu en as une.",
    },
    {
      question: "Un business analyst doit-il mettre SQL sur son CV ?",
      answer:
        "Toutes les offres ne l'exigent pas, mais beaucoup d'offres aux États-Unis le demandent, et SQL te permet de vérifier toi-même un problème dans les données. Si tu l'as utilisé, montre dans une ligne un constat tiré d'une requête.",
    },
    {
      question: "Comment passer des opérations à un poste de business analyst ?",
      answer:
        "Décris ton poste actuel autour de l'analyse qu'il contient : un processus que tu as cartographié, un rapport que tu as créé, une correction que tu as proposée. Le résumé peut dire que tu te réorientes vers l'analyse métier.",
    },
    {
      question: "Un business analyst, est-ce la même chose qu'un data analyst ?",
      answer:
        "Les deux se recoupent. Les business analysts se concentrent sur les processus et les exigences d'un changement ; les data analysts sur le reporting et l'analyse. Oriente tes lignes vers ce que demande l'offre.",
    },
  ],
};
