import type { ExampleWords } from "../../../examples";

export const marketingManager: ExampleWords<"marketing-manager"> = {
  role: "Responsable marketing",
  card: "Lancements, budget, équipe et le chiffre d'affaires qui en a découlé.",
  description:
    "Exemple de CV de responsable marketing : lancements, marque et pipeline avec budget, taille d'équipe et revenu, plus les compétences recherchées.",
  intro:
    "Un responsable marketing est recruté pour fixer le cap et porter un objectif chiffré, pas pour gérer un seul canal. Le CV doit montrer le plan, le budget, l'équipe et le chiffre d'affaires qui en a découlé. Cet exemple relie chaque ligne au pipeline, aux ventes ou à la part de marché.",
  person:
    "Olivia est inventée : une responsable marketing avec 7 ans dans les logiciels pour entreprises et l'agroalimentaire, basée à Portland, dans l'Oregon. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de responsable marketing",
    basics: {
      headline: "Responsable marketing",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Responsable marketing avec 7 ans dans les logiciels pour entreprises et les produits de grande consommation. Dirige une équipe de 5 personnes, gère un budget annuel de 1,8 M$, et planifie les lancements et les messages autour d'objectifs de pipeline et de chiffre d'affaires.",
    experience: [
      {
        title: "Responsable marketing senior",
        bullets: [
          "Piloté le lancement d'un nouveau produit de facturation par e-mail, événements et search payant, générant 3,1 M$ de pipeline qualifié sur ses 2 premiers trimestres.",
          "Géré une équipe de 5 personnes et un budget annuel de 1,8 M$, en transférant 30 % des dépenses des salons vers les webinaires et en réduisant de 42 % le coût par opportunité.",
          "Réécrit le positionnement et les messages du site à partir de 40 entretiens clients, en faisant passer la conversion en demandes de démo de 1,6 % à 2,9 %.",
          "Mis en place dans Marketo un lead scoring qui envoie chaque mois 300 leads qualifiés aux commerciaux, dont 24 % deviennent des opportunités.",
        ],
      },
      {
        title: "Brand Manager",
        bullets: [
          "Mené la relance d'une marque de snacks dans 1 200 supermarchés, en faisant passer sa part de marché de 3,8 % à 5,5 % en 18 mois.",
          "Planifié un budget média annuel de 650 000 $ entre la télévision, les réseaux sociaux et la PLV en magasin, avec un reporting mensuel du retour par canal.",
          "Utilisé une étude de marché auprès de 2 000 acheteurs pour retirer 3 parfums peu vendus et en ajouter 2 nouveaux, augmentant de 17 % les ventes par magasin.",
        ],
      },
    ],
    education: [{ degree: "MBA", field: "Marketing" }],
    skills: [
      {
        label: "Marketing",
        items: [
          "Études de marché",
          "Marketing de contenu",
          "E-mail marketing",
          "Marketing automation",
        ],
      },
      { label: "Outils", items: ["Marketo", "Salesforce", "Google Analytics", "Tableau"] },
      {
        label: "Management",
        items: ["Management d'équipe", "Budgétisation", "Gestion des parties prenantes"],
      },
    ],
  },
  lines: [
    {
      weak: "Responsable des lancements produit et du go-to-market.",
      strong:
        "Piloté le lancement d'un nouveau produit de facturation par e-mail, événements et search payant, générant 3,1 M$ de pipeline qualifié sur ses 2 premiers trimestres.",
    },
    {
      weak: "Géré une équipe et un gros budget marketing.",
      strong:
        "Géré une équipe de 5 personnes et un budget annuel de 1,8 M$, en transférant 30 % des dépenses des salons vers les webinaires et en réduisant de 42 % le coût par opportunité.",
    },
    {
      weak: "Aidé à améliorer les messages de l'entreprise.",
      strong:
        "Réécrit le positionnement et les messages du site à partir de 40 entretiens clients, en faisant passer la conversion en demandes de démo de 1,6 % à 2,9 %.",
    },
  ],
  skills: [
    { label: "Stratégie et contenu" },
    { label: "Outils et données" },
    { label: "Pilotage de l'équipe" },
  ],
  tips: [
    {
      title: "Relie le marketing au pipeline ou aux ventes",
      text: "Les leads et les clics comptent pour ton équipe ; le pipeline, le chiffre d'affaires et la part de marché comptent pour la personne qui te recrute. Termine tes lignes les plus fortes sur le chiffre que l'entreprise publie.",
    },
    {
      title: "Montre la taille de ce que tu pilotais",
      text: "Une équipe de 5 avec un budget de 1,8 M$, ce n'est pas le même métier qu'un poste en solo avec 50 000 $. Donne l'équipe et le budget une fois, près du haut, pour que chaque résultat qui suit ait une échelle.",
    },
    {
      title: "Nomme les décisions que tu as prises",
      text: "Déplacer des dépenses entre canaux, arrêter une gamme de produits, changer le message : on recrute des managers pour leurs décisions. Dis ce que tu as changé et ce qui s'est passé ensuite.",
    },
  ],
  mistakes: [
    {
      title: "Ressembler à un spécialiste d'un seul canal",
      text: "Si chaque ligne parle d'un seul canal, le lecteur voit un spécialiste, pas un manager. Montre au moins un plan qui couvrait plusieurs canaux, des personnes et un budget.",
    },
    {
      title: "Des mots de marque sans résultat business",
      text: "« Valorisé la marque » et « développé la notoriété » ne peuvent pas être vérifiés. Utilise la hausse mesurée par une enquête, l'évolution de la part de marché ou les ventes qui ont suivi.",
    },
    {
      title: "Oublier l'équipe",
      text: "Recruter, coacher et briefer les agences, c'est la moitié du travail d'un manager. Une ligne sur les personnes que tu as dirigées montre que tu sais mener une équipe, pas seulement une campagne.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de responsable marketing ?",
      answer:
        "Les produits ou les marques dont tu faisais le marketing, la taille de ton budget et de ton équipe, et des résultats en pipeline, chiffre d'affaires, part de marché ou coût. Ajoute les outils de ton équipe, et limite les anciens postes juniors à deux lignes chacun.",
    },
    {
      question:
        "En quoi un CV de responsable marketing diffère-t-il d'un CV en marketing digital ?",
      answer:
        "Un CV en marketing digital montre le travail concret sur les canaux, annonce par annonce. Un CV de manager montre des plans qui couvrent les canaux, le budget, l'équipe et le résultat business, avec moins de détails sur chaque campagne.",
    },
    {
      question: "Dois-je mettre mon MBA sur un CV de responsable marketing ?",
      answer:
        "Oui, dans la formation, avec l'école et l'année. Il pèse le plus en début de carrière de manager ; après quelques années en poste, tes résultats comptent davantage que le diplôme.",
    },
  ],
};
