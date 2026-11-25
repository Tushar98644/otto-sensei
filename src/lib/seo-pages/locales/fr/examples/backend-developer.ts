import type { ExampleWords } from "../../../examples";

export const backendDeveloper: ExampleWords<"backend-developer"> = {
  role: "Développeur backend",
  card: "Des services qui montrent leur charge, leur latence, leur disponibilité et leur coût.",
  description:
    "Exemple de CV de développeur backend : lignes Java et Python avec charge, disponibilité et coût, compétences demandées et erreurs à éviter.",
  intro:
    "Le travail backend est souvent invisible, alors le CV doit le rendre visible : combien de trafic, quelle fiabilité, quel coût, et ce qui a changé grâce à toi. Cet exemple transforme chacun de ces points en chiffre.",
  person:
    "Ethan est inventé : un développeur backend avec 3 ans dans les logiciels de logistique à Columbus, dans l'Ohio. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de développeur backend",
    basics: {
      headline: "Développeur backend",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Développeur backend avec 3 ans à créer des services de commandes et de suivi en Java, Python et PostgreSQL. Concentré sur des services qui tiennent les pics de charge et coûtent moins cher à faire tourner.",
    experience: [
      {
        title: "Développeur backend",
        bullets: [
          "Créé l'API de suivi des expéditions en Spring Boot, qui traite 1 200 requêtes par seconde en pointe avec un p99 sous les 150 ms.",
          "Migré les événements de commande du polling de base de données vers Kafka, en réduisant de 60 % la charge sur PostgreSQL pendant les soldes de fin d'année.",
          "Réduit la facture AWS mensuelle de 28 % en redimensionnant les instances et en déplaçant les logs froids vers un stockage moins cher.",
        ],
      },
      {
        title: "Ingénieur logiciel junior",
        bullets: [
          "Développé un service Python avec FastAPI qui récupère chaque heure les cours des matières premières auprès de 40 sources pour l'équipe pricing.",
          "Ajouté Docker et GitHub Actions à 6 services, faisant passer le délai entre merge et mise en production de 2 jours à 25 minutes.",
          "Corrigé une condition de concurrence dans les mises à jour de stock qui provoquait la survente de 3 % des commandes, trouvée en rejouant les logs de production.",
        ],
      },
    ],
    projects: [
      {
        name: "Limiteur de débit",
        tech: "Go, Redis",
        bullets: [
          "Codé un limiteur de débit par seau à jetons (token bucket) adossé à Redis, testé en charge jusqu'à 20 000 requêtes par seconde.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Technologies de l'information" }],
    skills: [
      { label: "Langages", items: ["Java", "Python", "Go", "SQL"] },
      {
        label: "Services et données",
        items: ["Spring Boot", "FastAPI", "Kafka", "PostgreSQL", "Redis", "Microservices"],
      },
      { label: "Infrastructure", items: ["AWS", "Docker", "GitHub Actions", "Linux", "Datadog"] },
    ],
  },
  lines: [
    {
      weak: "Chargé du développement backend du système de suivi.",
      strong:
        "Créé l'API de suivi des expéditions en Spring Boot, qui traite 1 200 requêtes par seconde en pointe avec un p99 sous les 150 ms.",
    },
    {
      weak: "Aidé à réduire les coûts cloud.",
      strong:
        "Réduit la facture AWS mensuelle de 28 % en redimensionnant les instances et en déplaçant les logs froids vers un stockage moins cher.",
    },
    {
      weak: "Impliqué dans la mise en place du CI/CD.",
      strong:
        "Ajouté Docker et GitHub Actions à 6 services, faisant passer le délai entre merge et mise en production de 2 jours à 25 minutes.",
    },
  ],
  skills: [
    { label: "Langages" },
    { label: "Données et messagerie" },
    { label: "Architecture et cloud" },
  ],
  tips: [
    {
      title: "Montre la charge, la latence et la disponibilité",
      text: "Requêtes par seconde, latence p99, taux d'erreur, disponibilité. Ce sont les chiffres sur lesquels portent les entretiens backend : en mettre un dans une ligne lance la conversation que tu veux.",
    },
    {
      title: "L'argent aussi est un résultat",
      text: "Une facture cloud plus basse, moins de serveurs ou moins d'astreintes, c'est un résultat que tout manager comprend. Dis de combien, et ce que tu as changé pour y arriver.",
    },
    {
      title: "Explique le domaine en quelques mots",
      text: "« Suivi des expéditions », « remboursements par carte », « cours des matières premières » : un nom court dit au lecteur ce que faisait le système, pour que les chiffres aient un sens.",
    },
  ],
  mistakes: [
    {
      title: "Lister seulement des technologies",
      text: "Une ligne comme « Java, Spring Boot, Kafka, Docker » dit ce que tu as utilisé, pas ce que tu as fait. Mets les outils dans une ligne avec un résultat.",
    },
    {
      title: "Se cacher derrière « impliqué dans »",
      text: "La vérification des lignes d'Otto signale ce genre de début passif et faible, car le lecteur ne sait pas ce que tu as fait. Commence par ton propre verbe : créé, réduit, migré, corrigé.",
    },
    {
      title: "Oublier l'échelle",
      text: "Une file qui traite 50 messages par jour et une autre qui en traite 50 000 par seconde, ce sont deux métiers différents. Dis laquelle était la tienne.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de développeur backend ?",
      answer:
        "Tes langages et frameworks, les systèmes que tu as construits, et des chiffres de charge, de latence, de disponibilité ou de coût. Ajoute un projet si ton travail est sous NDA, et tiens-toi à une ou deux pages.",
    },
    {
      question: "Dois-je parler de conception de systèmes sur mon CV ?",
      answer:
        "Montre-la plutôt que de l'affirmer. Une ligne sur le découpage d'un service, l'ajout d'une file ou la conception pour les pics de trafic en dit plus au lecteur que les mots « system design » dans une liste de compétences.",
    },
    {
      question: "Quel format convient à un CV backend ?",
      answer:
        "N'importe quel format simple sur une colonne. Cet exemple utilise Minimal, inclus avec Pro ; Classic et Compact sont gratuits et se lisent tout aussi proprement.",
    },
  ],
};
