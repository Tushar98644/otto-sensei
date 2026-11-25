import type { ExampleWords } from "../../../examples";

export const graphicDesigner: ExampleWords<"graphic-designer"> = {
  role: "Graphiste",
  card: "Marque, print et réseaux sociaux, avec le volume et les résultats derrière chaque création.",
  description:
    "Exemple de CV de graphiste : marque, print et réseaux sociaux avec volume, rapidité et résultats, plus les compétences Adobe et Figma demandées.",
  intro:
    "Ton portfolio montre à quoi ressemble ton travail ; ton CV montre comment tu travailles. Les managers qui recrutent y cherchent le volume, la rapidité, les marques que tu as gérées et ce que les créations ont apporté à l'entreprise. Cet exemple met un chiffre sur chacun de ces points.",
  person:
    "Jasmine est inventée : une graphiste avec 5 ans dans un studio de design et dans une équipe de marque interne, basée à Nashville, dans le Tennessee. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de graphiste",
    basics: {
      headline: "Graphiste",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Graphiste avec 5 ans en identité de marque, packaging et design digital pour des marques alimentaires et musicales. Travaille vite sous Adobe Creative Cloud et Figma, et crée des modèles qui aident les petites équipes à rester fidèles à la marque.",
    experience: [
      {
        title: "Graphiste",
        bullets: [
          "Repensé le packaging de 14 mélanges de café sous Illustrator et InDesign, contribuant à une hausse de 21 % des ventes en supermarché la première année.",
          "Créé dans Figma un kit de marque de 120 modèles pour les posts sociaux, les menus et la signalétique, faisant passer les demandes de design de 35 à 12 par semaine.",
          "Conçu 6 maquettes d'e-mails et de landing pages par mois avec l'équipe marketing, en faisant passer le taux de clic des e-mails de 2,4 % à 3,8 %.",
          "Préparé 300 fichiers d'impression par an pour 4 imprimeurs sans aucun travail refusé, en tenant la date de chaque lancement saisonnier.",
        ],
      },
      {
        title: "Graphiste junior",
        bullets: [
          "Conçu 40 logos et identités de marque pour des restaurants, des salles de concert et des labels, dont 90 % validés en 2 allers-retours ou moins.",
          "Réalisé dans After Effects 25 publicités animées par mois pour les réseaux sociaux d'un organisateur de concerts, augmentant de 34 % les clics vers la billetterie.",
          "Retouché 2 000 photos produit sous Photoshop et Lightroom pour 3 boutiques en ligne, en livrant chaque lot en 48 heures.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Design graphique" }],
    skills: [
      { label: "Design", items: ["Illustrator", "Photoshop", "InDesign", "Figma"] },
      { label: "Motion et photo", items: ["After Effects", "Premiere Pro", "Lightroom"] },
      { label: "Savoir-faire", items: ["Typographie", "Packaging", "Production print"] },
    ],
  },
  lines: [
    {
      weak: "Fait du graphisme pour les réseaux sociaux.",
      strong:
        "Réalisé dans After Effects 25 publicités animées par mois pour les réseaux sociaux d'un organisateur de concerts, augmentant de 34 % les clics vers la billetterie.",
    },
    {
      weak: "Responsable du design packaging.",
      strong:
        "Repensé le packaging de 14 mélanges de café sous Illustrator et InDesign, contribuant à une hausse de 21 % des ventes en supermarché la première année.",
    },
    {
      weak: "Créé divers modèles pour l'équipe marketing.",
      strong:
        "Créé dans Figma un kit de marque de 120 modèles pour les posts sociaux, les menus et la signalétique, faisant passer les demandes de design de 35 à 12 par semaine.",
    },
  ],
  skills: [
    { label: "Outils de design" },
    { label: "Motion et photo" },
    { label: "Digital et systèmes" },
  ],
  tips: [
    {
      title: "Compte ce que tu as livré",
      text: "Créations par mois, campagnes par an, fichiers envoyés à l'impression. Le volume montre à une équipe interne que tu tiens le rythme, et c'est un chiffre que la plupart des designers oublient de donner.",
    },
    {
      title: "Relie le design à un résultat",
      text: "Les ventes après un nouveau packaging, les clics après une nouvelle pub, moins de demandes après un kit de modèles. Pas besoin de t'attribuer tout le mérite : « contribuant à une hausse des ventes » est honnête et reste utile.",
    },
    {
      title: "Laisse le portfolio montrer le travail",
      text: "Mets le lien dans ton en-tête et nomme le projet correspondant dans une ligne. Le CV dit ce qui s'est passé ; le portfolio montre à quoi ça ressemblait.",
    },
  ],
  mistakes: [
    {
      title: "Un CV conçu comme une affiche",
      text: "Les colonnes, les icônes et les barres de compétences te plaisent, mais elles cassent quand un logiciel de recrutement les lit. Garde un CV sobre et réserve ton savoir-faire pour le portfolio.",
    },
    {
      title: "Des notes sur cinq pour les logiciels",
      text: "Quatre étoiles en Photoshop ne disent rien au lecteur. Liste les outils, puis montre-les à l'œuvre dans des lignes sur de vrais projets.",
    },
    {
      title: "Décrire seulement l'aspect visuel",
      text: "« Épuré, moderne, audacieux » sont des mots de goût. Ajoute la marque, le format et ce que le travail a apporté, pour qu'un lecteur qui n'est pas designer en voie la valeur.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de graphiste ?",
      answer:
        "Tes outils de design, les marques et les formats sur lesquels tu as travaillé, un lien vers ton portfolio, et des chiffres sur le volume, les délais ou les résultats. Tiens-toi à une page, sauf si tu as bien plus de 10 ans d'expérience.",
    },
    {
      question: "Faut-il un diplôme pour être recruté comme graphiste ?",
      answer:
        "Beaucoup d'offres demandent une licence (bachelor) en design ou dans un domaine proche, mais un bon portfolio compte souvent davantage. Si tu es autodidacte, liste tes cours et tes certificats dans la formation, et commence par ton meilleur travail pour des clients.",
    },
    {
      question: "Un graphiste, est-ce la même chose qu'un UI designer ?",
      answer:
        "Non. Un graphiste travaille sur la marque, le print, le packaging et le marketing ; un UI designer conçoit les écrans que les gens utilisent. La recherche d'offres compatibles d'Otto les classe comme des métiers différents, alors aligne ton titre sur l'offre.",
    },
  ],
};
