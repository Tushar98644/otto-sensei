import type { ExampleWords } from "../../../examples";

export const devopsEngineer: ExampleWords<"devops-engineer"> = {
  role: "Ingénieur DevOps",
  card: "Déploiements, temps de rétablissement et coût cloud : les chiffres qui rythment les équipes d'astreinte.",
  description:
    "Exemple de CV d'ingénieur DevOps : lignes Kubernetes, Terraform et CI/CD avec vitesse de déploiement, disponibilité et coût, compétences et erreurs.",
  intro:
    "Le DevOps se juge à ce qui n'arrive plus : déploiements ratés, longues pannes, factures cloud surprises. Un CV doit transformer ce calme en chiffres, comme la fréquence à laquelle les équipes livrent, la vitesse à laquelle elles se rétablissent et ce que coûte la plateforme. Cet exemple montre chacun d'eux.",
  person:
    "Sofia est inventée : une ingénieure DevOps avec 5 ans dans les logiciels de santé et le commerce en ligne, basée à Salt Lake City, dans l'Utah. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV d'ingénieure DevOps",
    basics: {
      headline: "Ingénieure DevOps",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Ingénieure DevOps avec 5 ans à faire tourner des plateformes AWS et Kubernetes pour les équipes produit. Construit des pipelines et de l'infrastructure as code pour que les équipes livrent chaque jour et se remettent d'un incident en quelques minutes.",
    experience: [
      {
        title: "Ingénieure DevOps",
        bullets: [
          "Migré 45 services de serveurs EC2 montés à la main vers Kubernetes avec Helm, faisant passer les déploiements de 3 par semaine à 20 par jour.",
          "Écrit des modules Terraform pour les réseaux, bases de données et clusters, utilisés par 9 équipes produit, réduisant la création d'un environnement de 2 semaines à 1 jour.",
          "Mis en place des alertes Prometheus et Grafana liées aux objectifs de niveau de service (SLO), réduisant le temps moyen de rétablissement de 75 à 18 minutes.",
          "Réduit la facture AWS de 38 000 $ par mois en passant les jobs batch sur des instances spot et en supprimant 600 volumes inutilisés.",
        ],
      },
      {
        title: "Ingénieure cloud",
        bullets: [
          "Construit un pipeline GitHub Actions avec tests automatisés et rollback en un clic, faisant passer les mises en production ratées de 1 sur 8 à 1 sur 40.",
          "Écrit des playbooks Ansible qui ont patché 300 serveurs Linux en une nuit au lieu de 2 week-ends.",
          "Mené 4 exercices de reprise après sinistre par an, ramenant le temps de restauration des bases de 6 heures à 45 minutes.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Génie informatique" }],
    skills: [
      { label: "Cloud", items: ["AWS", "Terraform", "Kubernetes", "Helm", "Docker"] },
      {
        label: "Livraison et supervision",
        items: ["GitHub Actions", "Jenkins", "Prometheus", "Grafana", "Datadog"],
      },
      { label: "Scripting", items: ["Python", "Bash", "Go", "Linux"] },
    ],
    certifications: [{ name: "Certified Kubernetes Administrator (CKA)" }],
  },
  lines: [
    {
      weak: "Impliquée dans la migration des services vers Kubernetes.",
      strong:
        "Migré 45 services de serveurs EC2 montés à la main vers Kubernetes avec Helm, faisant passer les déploiements de 3 par semaine à 20 par jour.",
    },
    {
      weak: "Chargée de la supervision et des astreintes en production.",
      strong:
        "Mis en place des alertes Prometheus et Grafana liées aux objectifs de niveau de service (SLO), réduisant le temps moyen de rétablissement de 75 à 18 minutes.",
    },
    {
      weak: "Responsable du pipeline de mise en production.",
      strong:
        "Construit un pipeline GitHub Actions avec tests automatisés et rollback en un clic, faisant passer les mises en production ratées de 1 sur 8 à 1 sur 40.",
    },
  ],
  skills: [
    { label: "Cloud et infrastructure" },
    { label: "Conteneurs et livraison" },
    { label: "Supervision et scripting" },
  ],
  tips: [
    {
      title: "Utilise les quatre indicateurs de livraison",
      text: "À quelle fréquence tu déploies, combien de temps un changement met à arriver en production, combien de mises en production échouent, et à quelle vitesse tu te rétablis. Les responsables techniques suivent ces chiffres : en mettre un dans une ligne montre que tu parles leur langue.",
    },
    {
      title: "Compte les équipes que tu as débloquées",
      text: "Le travail de plateforme se fait pour d'autres ingénieurs. Dis combien d'équipes ou de services utilisent ce que tu as construit, et combien d'attente tu as retiré de leur semaine.",
    },
    {
      title: "Chiffre les économies cloud en dollars",
      text: "Une économie mensuelle ou annuelle en dollars, c'est une ligne que la finance comme l'ingénierie lisent. Nomme ce que tu as changé pour l'obtenir, comme les instances spot, le redimensionnement ou les niveaux de stockage.",
    },
  ],
  mistakes: [
    {
      title: "Un mur de badges de certification",
      text: "Six badges cloud au-dessus de ton travail repoussent la preuve en bas de la page. Garde le ou les deux que demande l'offre, et laisse tes lignes montrer le reste.",
    },
    {
      title: "Aucun incident en vue",
      text: "Presque chaque entretien DevOps aborde une panne. Une ligne sur le temps de rétablissement, une correction issue d'un post-mortem ou un exercice que tu as mené montre que tu as tenu l'astreinte, pas seulement écrit du YAML.",
    },
    {
      title: "L'outil a changé, mais qu'est-ce qui s'est amélioré ?",
      text: "« Mis en place Kubernetes » dit ce que tu as installé, pas ce qui s'est amélioré. Ajoute le nombre de déploiements, le temps de rétablissement ou le coût, avant et après.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV d'ingénieur DevOps ?",
      answer:
        "Les clouds et les outils que tu fais tourner, les plateformes que tu as construites, et des chiffres de fréquence de déploiement, de disponibilité, de temps de rétablissement ou de coût. Ajoute les équipes qui dépendaient de ton travail et une ou deux certifications à jour.",
    },
    {
      question: "Un ingénieur DevOps, est-ce la même chose qu'un site reliability engineer (SRE) ?",
      answer:
        "Le travail se recoupe beaucoup, et pour les offres compatibles, Otto range les deux intitulés dans le même type de poste. Reprends l'intitulé de l'offre dans ton titre, et mets en avant des lignes sur la disponibilité et le rétablissement pour les postes de SRE, et sur la livraison pour les postes DevOps.",
    },
    {
      question: "Comment passer de l'administration système au DevOps ?",
      answer:
        "Montre l'automatisation dans ton poste actuel : des scripts qui ont remplacé des étapes manuelles, des serveurs que tu as patchés avec Ansible, un pipeline que tu as mis en place. Ces lignes se lisent comme du travail DevOps, quel que soit ton intitulé.",
    },
  ],
};
