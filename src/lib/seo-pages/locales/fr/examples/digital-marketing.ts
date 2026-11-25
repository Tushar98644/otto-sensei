import type { ExampleWords } from "../../../examples";

export const digitalMarketing: ExampleWords<"digital-marketing"> = {
  role: "Marketing digital",
  card: "Budget, canal et résultat réunis, pour la publicité payante, le référencement et l'e-mail.",
  description:
    "Exemple de CV en marketing digital : lignes SEO, publicité et e-mail avec budget, leads et rentabilité, plus les compétences et outils demandés.",
  intro:
    "Le marketing digital se mesure au dollar, au clic et au lead près : un CV sans chiffres s'y remarque pour de mauvaises raisons. Cet exemple montre budget, canal et résultat dans chaque ligne, comme les lit un responsable marketing.",
  person:
    "Rachel est inventée : une spécialiste du marketing digital avec 4 ans dans des marques de vente directe aux consommateurs et l'edtech, basée à Los Angeles. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV en marketing digital",
    basics: {
      headline: "Responsable marketing digital",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Spécialiste du marketing digital avec 4 ans à piloter la publicité payante, le référencement et l'e-mail pour des marques grand public. Gère ses budgets, rend compte avec des chiffres simples et coupe ce qui ne rapporte pas.",
    experience: [
      {
        title: "Responsable marketing digital",
        bullets: [
          "Piloté des campagnes Google Ads et Meta avec un budget mensuel de 21 000 $, faisant passer le ROAS de 2,1 à 3,4 en 9 mois.",
          "Augmenté le trafic organique de 40 000 à 110 000 visites par mois grâce à un plan SEO de 60 pages produits et guides pratiques.",
          "Mis en place dans HubSpot des e-mails de panier abandonné qui récupèrent aujourd'hui 9 % des paniers, soit environ 1 200 commandes par mois.",
          "Remplacé les captures d'écran du reporting hebdomadaire par un tableau de bord Looker Studio, économisant 4 heures de travail manuel chaque semaine.",
        ],
      },
      {
        title: "Chargée de marketing digital",
        bullets: [
          "Réduit le coût par lead des inscriptions aux cours de 4,80 $ à 3,00 $ en refaisant les landing pages et en mettant en pause 30 mots-clés peu performants.",
          "Planifié 3 campagnes avec des créateurs Instagram et YouTube qui ont apporté 14 000 inscriptions à l'essai gratuit.",
          "Rédigé et testé 50 variantes d'annonces par mois, en gardant les 10 % les plus performantes pour le tour suivant.",
        ],
      },
    ],
    education: [{ degree: "BBA", field: "Marketing" }],
    skills: [
      {
        label: "Canaux",
        items: [
          "SEO",
          "Google Ads",
          "Marketing de performance",
          "E-mail marketing",
          "Réseaux sociaux",
        ],
      },
      { label: "Outils", items: ["Google Analytics", "HubSpot", "Canva", "Excel"] },
    ],
    certifications: [{ name: "Google Ads Search Certification" }],
  },
  lines: [
    {
      weak: "Géré les réseaux sociaux et les campagnes payantes.",
      strong:
        "Piloté des campagnes Google Ads et Meta avec un budget mensuel de 21 000 $, faisant passer le ROAS de 2,1 à 3,4 en 9 mois.",
    },
    {
      weak: "En charge du SEO du site de l'entreprise.",
      strong:
        "Augmenté le trafic organique de 40 000 à 110 000 visites par mois grâce à un plan SEO de 60 pages produits et guides pratiques.",
    },
    {
      weak: "Responsable de l'e-mail marketing.",
      strong:
        "Mis en place dans HubSpot des e-mails de panier abandonné qui récupèrent aujourd'hui 9 % des paniers, soit environ 1 200 commandes par mois.",
    },
  ],
  skills: [{ label: "Canaux" }, { label: "Analyse" }, { label: "Plateformes" }],
  tips: [
    {
      title: "Montre le budget et le retour ensemble",
      text: "Un montant dépensé seul ressemble à un coût ; un retour seul ressemble à de la chance. Ensemble, ils montrent qu'on peut te confier de l'argent : budget, canal, résultat.",
    },
    {
      title: "Écris les montants comme les lit l'employeur",
      text: "Pour les postes en Inde, les lakhs et les roupies se lisent naturellement. Pour les postes à l'étranger, convertis en dollars américains ou dans la devise locale, ou utilise un pourcentage, pour que personne n'ait à faire le calcul.",
    },
    {
      title: "Nomme les outils de l'offre",
      text: "Google Ads, Meta, HubSpot, GA4 : les offres marketing citent les outils avec précision, tout comme le test de compatibilité d'Otto. Nomme l'outil dans la ligne où tu l'as utilisé.",
    },
  ],
  mistakes: [
    {
      title: "Les chiffres de vanité",
      text: "Des abonnés et des impressions sans leads, ventes ni coût, ça ressemble à du remplissage. Associe la portée au résultat qu'elle a produit.",
    },
    {
      title: "« En charge des réseaux sociaux »",
      text: "La vérification des lignes d'Otto signale les débuts faibles comme « En charge de », car ils cachent ce que tu as fait. Commence par l'action et termine par le chiffre.",
    },
    {
      title: "Tous tes certificats",
      text: "Deux ou trois certificats à jour des plateformes que tu utilises suffisent. Une longue liste de formations courtes repousse tes résultats en bas de la page.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV en marketing digital ?",
      answer:
        "Les canaux que tu as pilotés, les budgets que tu as gérés, et un résultat pour chacun : leads, ventes, coût par lead ou retour sur dépenses publicitaires (ROAS). Ajoute les outils que tu as utilisés et deux ou trois certificats à jour.",
    },
    {
      question: "Comment montrer des résultats si je ne connais pas les chiffres exacts ?",
      answer:
        "Utilise ce que tu peux défendre : une fourchette, un pourcentage, ou un avant-après tiré de tes rapports. Otto te demande le chiffre quand il corrige une ligne, et n'en invente jamais.",
    },
    {
      question: "Dois-je ajouter un portfolio en marketing digital ?",
      answer:
        "Un court portfolio aide : deux ou trois campagnes avec l'objectif, ce que tu as fait et le résultat. Laisse de côté tout ce que ton employeur ne voudrait pas voir partagé.",
    },
  ],
};
