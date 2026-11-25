import type { ExampleWords } from "../../../examples";

export const productManager: ExampleWords<"product-manager"> = {
  role: "Product manager",
  card: "Les résultats d'abord, avec la recherche et les expériences qui les expliquent.",
  description:
    "Exemple de CV de product manager : le résultat, comment tu l'as trouvé et qui tu as mené, plus les compétences demandées et les erreurs à éviter.",
  intro:
    "Un product manager n'écrit pas le code et ne dessine pas les écrans : le CV doit donc montrer ce qui a changé grâce à ses décisions. Cet exemple commence chaque ligne par un résultat et l'appuie sur la façon dont l'équipe y est arrivée.",
  person:
    "David est inventé : un product manager avec 6 ans d'expérience, passé de l'ingénierie au produit dans une entreprise de voyage à Seattle. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de product manager",
    basics: {
      headline: "Product Manager",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Product manager avec 3 ans en produit et 3 ans en ingénierie, sur la réservation et les paiements d'une appli de voyage. Livre par petites étapes, mesure honnêtement et met tout par écrit.",
    experience: [
      {
        title: "Product Manager",
        bullets: [
          "Dirigé une équipe de 7 personnes pour refaire le paiement des hôtels, en faisant passer le taux de réservations finalisées de 61 % à 70 % en deux trimestres.",
          "Découvert grâce à 30 entretiens utilisateurs que les gens abandonnaient à l'étape de la facture professionnelle, et réduit celle-ci à un seul champ facultatif.",
          "Mis en place des revues produit hebdomadaires dans Amplitude avec le design et l'ingénierie, pour qu'une étape cassée du funnel soit repérée en 7 jours au lieu de 30.",
          "Rédigé la roadmap du paiement partagé avec Apple Pay et cartes bancaires, lancé auprès de 2 millions d'utilisateurs avec un taux d'échec de 0,2 %.",
        ],
      },
      {
        title: "Associate Product Manager",
        bullets: [
          "Mené 12 tests A/B sur les filtres de recherche en 5 mois, et gardé les 3 qui ont augmenté le nombre de recherches par session.",
        ],
      },
      {
        title: "Ingénieur logiciel",
        bullets: [
          "Créé les API de réservation d'une appli de billetterie de bus qui traitait jusqu'à 40 000 réservations par jour en pointe.",
          "Évolué vers le produit en rédigeant les spécifications de 2 fonctionnalités, ce qui a mené au passage à un poste d'APM.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Génie électrique et informatique" }],
    skills: [
      {
        label: "Produit",
        items: ["Gestion de produit", "Roadmap", "Recherche utilisateur", "Tests A/B", "Agile"],
      },
      { label: "Outils", items: ["Jira", "Amplitude", "SQL", "Figma", "Confluence"] },
    ],
  },
  lines: [
    {
      weak: "Géré la roadmap produit du tunnel de paiement.",
      strong:
        "Dirigé une équipe de 7 personnes pour refaire le paiement des hôtels, en faisant passer le taux de réservations finalisées de 61 % à 70 % en deux trimestres.",
    },
    {
      weak: "Mené des recherches utilisateurs.",
      strong:
        "Découvert grâce à 30 entretiens utilisateurs que les gens abandonnaient à l'étape de la facture professionnelle, et réduit celle-ci à un seul champ facultatif.",
    },
    {
      weak: "Collaboré avec des équipes transverses pour livrer des fonctionnalités.",
      strong:
        "Rédigé la roadmap du paiement partagé avec Apple Pay et cartes bancaires, lancé auprès de 2 millions d'utilisateurs avec un taux d'échec de 0,2 %.",
    },
  ],
  skills: [
    { label: "Travail produit" },
    { label: "Méthodes de travail" },
    { label: "Données et design" },
  ],
  tips: [
    {
      title: "Commence par le résultat",
      text: "Conversion, rétention, chiffre d'affaires, temps gagné, tickets de support évités. Choisis le chiffre que suivait l'entreprise et mets-le en premier, puis dis comment l'équipe l'a fait bouger.",
    },
    {
      title: "Montre comment tu as décidé",
      text: "Une ligne sur des entretiens, une expérience ou une extraction de données montre que tu fais tes choix à partir de faits. Les managers qui recrutent le cherchent dans chaque entretien produit.",
    },
    {
      title: "Rends visible ton passage au produit",
      text: "Si tu viens de l'ingénierie, du design ou du support, garde ce poste et ajoute une ligne sur le travail produit que tu y as fait. C'est une force, pas un trou dans ton parcours.",
    },
  ],
  mistakes: [
    {
      title: "« Collaboré avec des équipes transverses »",
      text: "Tous les product managers le font, donc ça ne dit rien. Nomme ce que l'équipe a livré et ce qui a changé.",
    },
    {
      title: "S'attribuer les résultats de toute l'entreprise",
      text: "Si le chiffre d'affaires a augmenté de 40 % pendant que tu gérais une seule fonctionnalité, dis ce que ta fonctionnalité a apporté. Les recruteurs vérifient, et un chiffre plus petit mais honnête tient la route.",
    },
    {
      title: "Seulement des noms de fonctionnalités",
      text: "« Lancé Smart Filters » ne veut rien dire hors de l'entreprise. Dis en quelques mots simples ce que ça a apporté aux utilisateurs.",
    },
  ],
  faq: [
    {
      question: "Comment écrire un CV de product manager sans en avoir eu le titre ?",
      answer:
        "Garde tes vrais intitulés et montre le travail produit qu'ils contenaient : spécifications rédigées, recherches menées, lancements pilotés. Une courte ligne de résumé peut dire que tu te diriges vers le produit.",
    },
    {
      question: "Un CV de product manager doit-il tenir sur une page ?",
      answer:
        "Une page jusqu'à environ 5 ans d'expérience, deux pages au-delà si la seconde contient de vrais résultats. Réduis les anciens postes à une ou deux lignes plutôt que de rapetisser la police.",
    },
    {
      question: "Quels indicateurs un product manager doit-il mettre sur son CV ?",
      answer:
        "Ceux que suivait ton équipe : conversion, activation, rétention, chiffre d'affaires ou coût. Donne l'avant et l'après, et le temps qu'il a fallu.",
    },
  ],
};
