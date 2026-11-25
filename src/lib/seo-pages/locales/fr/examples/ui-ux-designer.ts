import type { ExampleWords } from "../../../examples";

export const uiUxDesigner: ExampleWords<"ui-ux-designer"> = {
  role: "Designer UI/UX",
  card: "Du texte simple avec un lien vers le portfolio, et de la recherche et des résultats dans chaque ligne.",
  description:
    "Exemple de CV de designer UI/UX en texte simple, lisible par les logiciels de recrutement : recherche et résultats, compétences et conseils.",
  intro:
    "Les designers sont tentés de faire de leur CV une vitrine, mais les logiciels de recrutement lisent une mise en page graphique comme un texte en désordre. La solution : un CV simple avec un lien vers ton portfolio, et des lignes qui montrent la recherche derrière chaque design et ce qui a changé après la mise en ligne.",
  person:
    "Hannah est inventée : une designer produit avec 4 ans dans l'edtech et la fintech à Denver. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de designer UI/UX",
    basics: {
      headline: "Designer produit (UI/UX)",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Designer produit avec 4 ans à concevoir des applis d'apprentissage et de paiement utilisées sur des téléphones Android bon marché. Commence par la recherche, conçoit dans Figma et vérifie les chiffres après le lancement.",
    experience: [
      {
        title: "Designer produit",
        bullets: [
          "Repensé le lecteur de cours après 18 tests utilisateurs avec des étudiants de 3 villes, en faisant passer le taux de leçons terminées de 42 % à 55 %.",
          "Créé dans Figma un design system de 90 composants avec mode sombre, réduisant d'environ moitié le délai entre maquette et développement des nouveaux écrans.",
          "Conçu un parcours d'onboarding en espagnol et en anglais qui a fait passer la rétention à 7 jours des nouveaux apprenants de 21 % à 27 %.",
        ],
      },
      {
        title: "Designer UI/UX",
        bullets: [
          "Repensé le parcours de paiement des factures en passant de 7 écrans à 4, ce qui a réduit de 30 % les appels au support pour paiements échoués.",
          "Mené 2 sessions de tri de cartes avec 40 clients pour refondre le menu de l'appli, puis testé le résultat avec un prototype cliquable.",
          "Rédigé des règles d'accessibilité sur le contraste des couleurs et les zones tactiles, suivies aujourd'hui par les 3 équipes de l'appli.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Design d'interaction" }],
    skills: [
      {
        label: "Design",
        items: ["Design UX", "Design UI", "Design d'interaction", "Design systems", "Prototypage"],
      },
      {
        label: "Recherche",
        items: ["Recherche utilisateur", "Tests utilisateurs", "Wireframing"],
      },
      { label: "Outils", items: ["Figma", "Framer", "Miro", "Adobe Illustrator"] },
    ],
  },
  lines: [
    {
      weak: "Conçu des écrans pour l'appli mobile.",
      strong:
        "Repensé le parcours de paiement des factures en passant de 7 écrans à 4, ce qui a réduit de 30 % les appels au support pour paiements échoués.",
    },
    {
      weak: "Fait de la recherche utilisateur et des tests d'utilisabilité.",
      strong:
        "Repensé le lecteur de cours après 18 tests utilisateurs avec des étudiants de 3 villes, en faisant passer le taux de leçons terminées de 42 % à 55 %.",
    },
    {
      weak: "Créé un design system.",
      strong:
        "Créé dans Figma un design system de 90 composants avec mode sombre, réduisant d'environ moitié le délai entre maquette et développement des nouveaux écrans.",
    },
  ],
  skills: [{ label: "Design" }, { label: "Recherche" }, { label: "Outils" }],
  tips: [
    {
      title: "Laisse le portfolio porter les visuels",
      text: "Mets le lien vers ton portfolio dans l'en-tête et garde le CV en texte simple. Un recruteur parcourt d'abord le CV ; c'est dans le portfolio qu'il voit ton travail.",
    },
    {
      title: "Associe chaque design à une recherche et à un résultat",
      text: "Avec combien de personnes tu as testé, ce que tu as changé en conséquence, et ce qui a bougé après le lancement. Cette ligne en trois temps, c'est ce que cherchent les responsables design.",
    },
    {
      title: "Dis qui étaient les utilisateurs",
      text: "Des étudiants sur des téléphones bon marché, des clients d'une banque qui paient leurs factures, des employés d'entrepôt qui portent des gants. Le contexte montre que tu as conçu pour de vraies personnes, pas pour un shot Dribbble.",
    },
  ],
  mistakes: [
    {
      title: "Un CV fait dans un outil de design",
      text: "Les colonnes, les zones de texte et les icônes d'un outil de design ressortent souvent des logiciels de recrutement dans le mauvais ordre, ou pas du tout. La vue recruteur d'Otto te montre exactement ce qu'ils lisent.",
    },
    {
      title: "Barres de compétences et notes",
      text: "« Figma : 4 étoiles sur 5 » ne peut pas être lu par un logiciel et ne dit rien aux humains. Liste les outils ; montre la compétence dans tes lignes.",
    },
    {
      title: "Des écrans, mais pas de résultats",
      text: "« Conçu l'onboarding » est une tâche. Ajoute ce qui a changé : taux de complétion, rétention, moins de tickets de support ou des développements plus rapides.",
    },
  ],
  faq: [
    {
      question: "Un designer UI/UX doit-il avoir un CV créatif ?",
      answer:
        "Garde le CV simple et laisse ton portfolio être créatif. Beaucoup d'employeurs lisent d'abord les CV avec un logiciel de recrutement, et les mises en page graphiques en ressortent souvent en désordre.",
    },
    {
      question: "Dois-je mettre le lien vers mon portfolio sur mon CV ?",
      answer:
        "Oui, en haut, à côté de ton e-mail. Vérifie qu'il s'ouvre vite sur un téléphone et que la première étude de cas est ta meilleure.",
    },
    {
      question: "Designer produit, est-ce la même chose que designer UI/UX ?",
      answer:
        "Les intitulés se recoupent beaucoup, et la recherche d'offres compatibles d'Otto les traite comme le même type de poste. Dans ton titre, reprends l'intitulé de l'offre à laquelle tu postules.",
    },
  ],
};
