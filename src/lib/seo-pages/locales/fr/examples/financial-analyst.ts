import type { ExampleWords } from "../../../examples";

export const financialAnalyst: ExampleWords<"financial-analyst"> = {
  role: "Analyste financier",
  card: "Prévisions, modèles et budgets liés à une décision prise par l'entreprise.",
  description:
    "Exemple de CV d'analyste financier : prévisions, budgets et modèles FP&A qui ont guidé une décision, plus les compétences Excel et finance demandées.",
  intro:
    "Un analyste financier est jugé sur un point : les dirigeants font-ils assez confiance à ses chiffres pour agir ? Chaque ligne nomme donc le modèle ou la prévision, son niveau de précision et la décision qui en est sortie : un prix, un budget, ou un magasin qui n'a jamais ouvert.",
  person:
    "Ryan est inventé : un analyste FP&A avec 4 ans chez un distributeur d'articles pour la maison à Dallas, qui a commencé par un stage d'été dans une banque. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV d'analyste financier",
    basics: {
      headline: "Analyste financier, FP&A",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Analyste financier avec 4 ans en FP&A chez un distributeur de 600 M$, qui construit les prévisions, les budgets et les modèles de prix sur lesquels les dirigeants s'appuient pour décider. Travaille sous Excel, SQL et NetSuite, et explique les chiffres dans une note d'une page.",
    experience: [
      {
        title: "Analyste financier senior",
        bullets: [
          "Construit la prévision mensuelle des ventes de 85 magasins sous Excel et SQL, en ramenant l'erreur de 9 % à 3,5 % par l'ajout des promotions et de la météo au modèle.",
          "Modélisé le délai de récupération de 6 projets de magasins et recommandé d'abandonner les 2 qui dépassaient 3 ans, en économisant 7 M$ de capital.",
          "Mené la revue mensuelle budget contre réel avec 9 chefs de service, en expliquant chaque écart de plus de 50 000 $ dans une note d'une page.",
          "Automatisé le dossier d'analyse des écarts de fin de mois avec Power Query, en le faisant passer de 3 jours à 4 heures.",
        ],
      },
      {
        title: "Analyste financier",
        bullets: [
          "Fixé le prix de nouveaux frais de livraison à partir d'un modèle portant sur 400 000 commandes, ajoutant 2,1 M$ de marge par an sans baisse mesurable des commandes.",
          "Préparé le budget annuel de 4 services totalisant 38 M$, livré 2 semaines avant la date limite fixée par le conseil d'administration.",
        ],
      },
      {
        title: "Stagiaire analyste financier",
        bullets: [
          "Construit un modèle de flux de trésorerie pour l'examen de 25 prêts aux petites entreprises, utilisé par 3 chargés de crédit dans leurs notes d'approbation.",
        ],
      },
    ],
    education: [{ degree: "B.B.A.", field: "Finance" }],
    skills: [
      {
        label: "Finance",
        items: [
          "Modélisation financière",
          "Prévisions",
          "Budgétisation",
          "Analyse des écarts",
          "FP&A",
        ],
      },
      { label: "Outils", items: ["Excel", "SQL", "Power Query", "NetSuite", "Power BI"] },
    ],
    certifications: [{ name: "CFA Level I (réussi)" }],
  },
  lines: [
    {
      weak: "Préparé des rapports mensuels d'écarts.",
      strong:
        "Mené la revue mensuelle budget contre réel avec 9 chefs de service, en expliquant chaque écart de plus de 50 000 $ dans une note d'une page.",
    },
    {
      weak: "Chargé de construire la prévision des ventes.",
      strong:
        "Construit la prévision mensuelle des ventes de 85 magasins sous Excel et SQL, en ramenant l'erreur de 9 % à 3,5 % par l'ajout des promotions et de la météo au modèle.",
    },
    {
      weak: "Aidé à la modélisation financière des ouvertures de nouveaux magasins.",
      strong:
        "Modélisé le délai de récupération de 6 projets de magasins et recommandé d'abandonner les 2 qui dépassaient 3 ans, en économisant 7 M$ de capital.",
    },
  ],
  skills: [
    { label: "Finance" },
    { label: "Tableurs et données" },
    { label: "Systèmes et certifications" },
  ],
  tips: [
    {
      title: "Dis à quel point ta prévision a vu juste",
      text: "Erreur de prévision, écart au budget, fréquence à laquelle les dirigeants utilisaient le modèle. La précision est le chiffre qui compte le plus pour un responsable financier, et peu de CV la donnent.",
    },
    {
      title: "Relie chaque modèle à une décision",
      text: "Un modèle sur lequel personne n'a agi, c'est un exercice scolaire. Dis ce que l'entreprise a fait grâce à lui : un prix modifié, un magasin écarté, un budget déplacé.",
    },
    {
      title: "Montre la taille de ce que tu couvrais",
      text: "Le chiffre d'affaires, le budget ou la taille du portefeuille indiquent tout de suite ton niveau au lecteur. Écris-le en dollars dans la ligne, comme un budget de 38 M$ réparti sur 4 services.",
    },
  ],
  mistakes: [
    {
      title: "« Préparé des rapports financiers »",
      text: "Tous les analystes le font. Dis quel rapport, qui le lisait, et ce qu'ils ont changé après l'avoir lu.",
    },
    {
      title: "Citer Excel et s'arrêter là",
      text: "Excel va de soi pour ce poste. Dis ce que tu as construit avec, comme une prévision par inducteurs, un modèle à trois états financiers ou un dossier d'écarts automatisé, et ce que ça t'a fait gagner.",
    },
    {
      title: "S'attribuer les résultats de l'entreprise",
      text: "Si l'entreprise a dépassé ses objectifs, ce n'est pas ta ligne. Tiens-t'en à la prévision, à l'analyse ou à la décision dont tu étais responsable, avec son propre chiffre.",
    },
  ],
  faq: [
    {
      question: "Quelles compétences montrer sur un CV d'analyste financier ?",
      answer:
        "La modélisation financière, les prévisions et la budgétisation, Excel presque toujours, et souvent SQL, un outil de BI et l'ERP de l'entreprise, comme NetSuite ou SAP. Montre chacune dans une ligne où elle a produit un chiffre.",
    },
    {
      question: "Dois-je indiquer ma progression au CFA sur mon CV ?",
      answer:
        "Oui, si c'est pertinent pour le poste. Écris le niveau réussi et l'année, ou que tu es candidat au Level II avec la date de l'examen. Ça compte davantage pour les postes en investissement qu'en FP&A.",
    },
    {
      question: "Le FP&A, est-ce la même chose qu'un poste d'analyste financier ?",
      answer:
        "Le FP&A est un type de poste d'analyste financier : planification, budgétisation et prévisions au sein d'une entreprise. Les analystes en investissement et en crédit en sont d'autres types. Reprends l'intitulé de l'offre si ton travail y correspond.",
    },
  ],
};
