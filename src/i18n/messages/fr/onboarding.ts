import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  tip: {
    position: "{position} sur {total}",
    skip: "Passer les conseils",
    back: "Retour",
    next: "Suivant",
    done: "Compris",
  },
  studio: {
    "read-text": {
      title: "Ce que lit le logiciel de recrutement",
      body: "Voici ton fichier tel que le lit le logiciel de recrutement. Ce qui manque ici manque aussi aux recruteurs.",
    },
    "fix-with-otto": {
      title: "Corrige une ligne avec Otto",
      body: "Les étiquettes signalent les lignes à retravailler. Je demande les faits, puis je réécris. Je n’invente jamais de chiffres.",
    },
    tailor: {
      title: "Adapte à une offre",
      body: "Colle le lien d’une offre. Je te montre ce qu’elle demande et t’aide à ajouter ce que tu as vraiment.",
    },
    download: {
      title: "Télécharge, gratuitement",
      body: "Ton PDF est gratuit, toujours. Ensuite, je le vérifie à nouveau pour te montrer ce qui a changé.",
    },
  },
  dashboard: {
    setup: {
      title: "À faire ensuite",
      none: "Quoi faire ensuite, le plus important d’abord. Chaque ligne disparaît une fois faite.",
      steps: {
        one: "Quoi faire ensuite, le plus important d’abord. Ton étape de configuration se coche toute seule.",
        other:
          "Quoi faire ensuite, le plus important d’abord. Tes {count} étapes de configuration se cochent toutes seules.",
      },
    },
    actions: {
      title: "Commence ici",
      body: "Vérifie un fichier, adapte un CV à une offre ou essaie un nouveau modèle.",
    },
    library: {
      title: "Tes CV",
      body: "Chaque CV et chaque copie adaptée vivent ici. Cherche par nom ou par entreprise.",
    },
    jobs: {
      title: "Des offres pour toi",
      body: "Des offres ouvertes issues des sites carrières, triées selon leur proximité avec ton CV.",
    },
    applications: {
      title: "Candidatures",
      body: "Note chaque offre à laquelle tu postules dans un tableau. Sa lettre et sa préparation y restent liées.",
    },
    interview: {
      title: "Préparation aux entretiens",
      body: "Pour chaque entretien : questions probables, récits tirés de tes lignes et questions à poser.",
    },
    portfolio: {
      title: "Portfolio",
      body: "Transforme ton CV en site portfolio, hébergé pour toi à ton propre lien.",
    },
    "win-rate": {
      title: "Ce qui marche",
      body: "Note les offres auxquelles tu postules. Je te montre quel CV te décroche des entretiens.",
    },
  },
} satisfies Translation<Messages["onboarding"]>;
