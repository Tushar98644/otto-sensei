import type { ExampleWords } from "../../../examples";

export const dataEngineer: ExampleWords<"data-engineer"> = {
  role: "Data engineer",
  card: "Des pipelines avec leur volume, leur fraîcheur, leurs pannes et leur coût dans chaque ligne.",
  description:
    "Exemple de CV de data engineer : lignes Spark, Airflow et SQL avec volume, fraîcheur et coût, compétences demandées et erreurs à éviter.",
  intro:
    "Le travail d'un data engineer se voit dans des tables auxquelles les autres font confiance. Le CV doit dire combien de données ont circulé, avec quelle fraîcheur elles sont arrivées, à quelle fréquence ça a cassé et combien ça a coûté. Cet exemple met l'un de ces chiffres dans chaque ligne.",
  person:
    "Marcus est inventé : un data engineer avec 5 ans dans l'analytique bancaire et la distribution, basé à Charlotte, en Caroline du Nord. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de data engineer",
    basics: {
      headline: "Data Engineer",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Data engineer avec 5 ans à construire des pipelines batch et streaming en Python, SQL et Spark. Concentré sur des tables qui arrivent à l'heure, passent leurs contrôles et coûtent moins cher chaque trimestre.",
    experience: [
      {
        title: "Data Engineer",
        bullets: [
          "Reconstruit 40 pipelines Airflow nocturnes sur Spark et Snowflake, faisant passer l'exécution de 6 heures à 70 minutes pour que les rapports finance arrivent avant 7 h chaque matin.",
          "Migré les transactions par carte de chargements batch horaires vers des flux Kafka, ramenant le retard des tableaux de bord fraude de 60 à moins de 2 minutes.",
          "Ajouté des tests dbt à 220 modèles, qui repèrent environ 35 chargements défaillants par trimestre avant que les analystes n'ouvrent un rapport.",
          "Réduit la facture Snowflake de 31 % en clusterisant les 5 plus grandes tables et en suspendant les warehouses inactifs après 5 minutes.",
        ],
      },
      {
        title: "Développeur ETL",
        bullets: [
          "Écrit des jobs ETL en Python qui chargent chaque nuit les ventes de 180 magasins dans Redshift, remplaçant 12 exports de tableurs lancés à la main.",
          "Conçu un schéma en étoile des commandes et retours que 30 analystes interrogent dans Tableau, réduisant le chargement des tableaux de bord de 40 à 6 secondes.",
          "Mis en place des alertes sur les chargements en retard ou vides, faisant passer les rapports du matin manqués de 9 à 1 par mois.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Informatique" }],
    skills: [
      { label: "Langages", items: ["Python", "SQL", "Scala"] },
      { label: "Pipelines", items: ["Spark", "Airflow", "dbt", "Kafka"] },
      {
        label: "Entrepôts de données et cloud",
        items: ["Snowflake", "Redshift", "PostgreSQL", "AWS"],
      },
    ],
    certifications: [{ name: "Databricks Certified Data Engineer Associate" }],
  },
  lines: [
    {
      weak: "Travaillé sur les pipelines de données de l'équipe finance.",
      strong:
        "Reconstruit 40 pipelines Airflow nocturnes sur Spark et Snowflake, faisant passer l'exécution de 6 heures à 70 minutes pour que les rapports finance arrivent avant 7 h chaque matin.",
    },
    {
      weak: "Responsable de la qualité des données de l'entrepôt.",
      strong:
        "Ajouté des tests dbt à 220 modèles, qui repèrent environ 35 chargements défaillants par trimestre avant que les analystes n'ouvrent un rapport.",
    },
    {
      weak: "Aidé à passer le reporting en streaming temps réel.",
      strong:
        "Migré les transactions par carte de chargements batch horaires vers des flux Kafka, ramenant le retard des tableaux de bord fraude de 60 à moins de 2 minutes.",
    },
  ],
  skills: [
    { label: "Langages et traitement" },
    { label: "Pipelines et modélisation" },
    { label: "Entrepôts de données et cloud" },
  ],
  tips: [
    {
      title: "Donne à chaque pipeline une taille et une heure",
      text: "Lignes par jour, téraoctets par mois, durée d'une exécution et heure d'arrivée des données. Un lecteur ne peut pas juger un pipeline sans sa taille et son échéance : mets les deux dans la ligne.",
    },
    {
      title: "Dis qui lit tes tables",
      text: "Rapports finance, tableaux de bord fraude, modèle de prix : dire qui utilise les données montre pourquoi le pipeline comptait, et offre à la personne qui t'interroge une bonne première question.",
    },
    {
      title: "Compte les pannes que tu as évitées",
      text: "Chargements en retard, exécutions échouées, données cassées repérées par des tests avant que quiconque les voie. Les équipes data suivent ces chiffres : un avant et un après en dit plus que « amélioré la qualité des données ».",
    },
  ],
  mistakes: [
    {
      title: "Une stack sans données",
      text: "Spark, Airflow, Kafka, Snowflake et dbt sur une ligne pourraient décrire n'importe quel data engineer. Place chaque outil à côté du travail qu'il a fait et du chiffre qu'il a fait bouger.",
    },
    {
      title: "Du « big data » sans taille",
      text: "Deux téraoctets par jour et 80 gigaoctets par semaine sont deux vrais métiers, très différents. Écris le volume que tu as géré au lieu de l'étiquette.",
    },
    {
      title: "Seulement quand tout va bien",
      text: "En entretien, on te parlera de la nuit où un pipeline a planté. Une ligne sur des rattrapages, des données en retard ou un changement de schéma que tu as absorbé montre que tu as fait tourner des pipelines en production, pas seulement que tu les as écrits.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de data engineer ?",
      answer:
        "Les pipelines que tu as construits, les outils sur lesquels ils tournaient, et des chiffres de volume, de durée d'exécution, de fraîcheur, de pannes ou de coût. Ajoute les équipes qui utilisaient les données, une courte liste de compétences et une certification si tu en as une.",
    },
    {
      question: "Un CV de data engineer est-il différent d'un CV de data analyst ?",
      answer:
        "Oui. Les lignes d'un analyste se terminent par une décision prise à partir des chiffres ; celles d'un ingénieur, par des données arrivées plus vite, plus propres ou moins cher. Si tu passes de l'analyse à l'ingénierie, commence par les pipelines que tu as construits pour tes propres rapports.",
    },
    {
      question: "Ai-je besoin d'une certification cloud en tant que data engineer ?",
      answer:
        "Ça aide quand une offre en cite une, mais des lignes qui montrent que tu as fait tourner des pipelines sur ce cloud comptent davantage. Une certification à jour de la plateforme que tu utilises le plus suffit largement.",
    },
  ],
};
