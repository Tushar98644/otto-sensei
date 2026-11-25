import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume example pages around each example, in French.
export default {
  meta: {
    index: {
      title: "{count} exemples de CV pour {year}, par métier",
      description:
        "{count} exemples de CV complets, d'ingénieur logiciel à data analyst, vente, marketing et débutant : chacun avec lignes plus fortes, compétences et erreurs.",
    },
    // The fuller title when it fits a search result.
    long: "{headline} ({year}), compétences et conseils",
    short: "{headline} ({year})",
  },
  headline: "{role} : exemple de CV",
  crumb: "Exemples de CV",
  index: {
    eyebrow: "Exemples de CV",
    title: "Exemples de CV",
    titleEm: "pour {count} métiers.",
    intro:
      "Des CV complets pour les métiers que l'on cherche le plus, en Inde et à l'étranger, de l'ingénieur logiciel aux RH et aux jeunes diplômés. Chacun montre des lignes plus percutantes, les compétences à citer et les erreurs à éviter.",
    listTitle: "Exemples",
    howTitle: "Comment ces exemples sont conçus",
    how: {
      madeUp: {
        title: "Des personnes inventées, des structures réelles",
        text: "Chaque nom, entreprise, école et chiffre est inventé. Reprends la structure, le type de lignes et l'ordre des sections, puis mets tes propres faits.",
      },
      lineCheck: {
        title: "Chaque ligne passe la vérification des lignes d'Otto",
        text: "Chaque ligne est passée par la même vérification que celle que le studio fait sur les tiennes, qui signale les tâches, les formules toutes faites, les mots vagues et les lignes sans résultat.",
      },
      skills: {
        title: "Des compétences qu'Otto lit dans les offres",
        text: "Les compétences de chaque page sont celles que le <link>test de compatibilité</link> repère dans les offres d'emploi : tu peux donc tester ton propre CV sur une vraie offre de la même façon.",
      },
      realText: {
        title: "Du vrai texte dans un vrai format",
        text: "Chaque exemple est affiché dans l'un des {count} formats de l'appli, en texte et non en image : ce que tu vois est donc ce que lirait le logiciel de recrutement.",
      },
      start: {
        title: "Pars de n'importe lequel",
        text: "« Partir de cet exemple » ouvre une copie dans le studio, comme ton propre CV. Avec {free}, elle occupe ton unique CV ; {pro} en garde jusqu'à {proResumes} et {max} jusqu'à {maxResumes}.",
      },
    },
    ctaTitle: "Pas d'exemple pour ton métier ?",
    ctaText:
      "Importe ton CV actuel pour voir ce que lit le logiciel de recrutement, ou compare-le à une offre d'emploi. Les deux sont gratuits, sans carte bancaire.",
  },
  example: {
    eyebrow: "Exemple de CV",
    start: "Partir de cet exemple",
    startNote: "S'ouvre dans le studio comme ton propre CV. Gratuit, sans carte bancaire.",
    resumeTitle: "Le CV d'exemple",
    formatFree: "Présenté au format {name}, téléchargeable gratuitement en PDF.",
    formatPro:
      "Présenté au format {name}, inclus avec {pro}. Avec {free}, il se télécharge au format {fallback}.",
    linesTitle: "Transforme les tâches en résultats",
    linesIntro:
      "Trois lignes faibles, ce qu'en dit la vérification des lignes d'Otto, et la ligne de cet exemple qui y répond.",
    before: "Avant",
    after: "Après",
    lineCheck: "vérification des lignes",
    skillsTitle: "Les compétences que cherche le logiciel de recrutement",
    skillsIntro:
      "Ces compétences restent en anglais, telles que les écrivent les offres d'emploi aux États-Unis, et le <link>test de compatibilité</link> d'Otto repère chacune d'elles dans les offres. Cite celles que tu as, et nomme chacune dans une ligne où tu l'as utilisée : une compétence qui n'apparaît que dans ta liste de compétences s'affiche comme listée, pas démontrée.",
    titlesLabel: "Intitulés de poste à rechercher",
    titles:
      "{titles}. Pour les offres compatibles, Otto traite ces intitulés comme un même type de poste : cherche donc chacun d'eux.",
    tipsTitle: "Ce qu'il faut montrer",
    mistakesTitle: "Les erreurs à éviter",
    otto: "Otto la loutre, qui montre un CV",
    closingTitle: "Fais de ce CV le tien.",
    closingText:
      "Il s'ouvre dans le studio comme ton propre CV. Remplace les faits par les tiens, et Otto vérifie chaque ligne au fur et à mesure.",
    blank: "Ou <link>pars d'une page blanche</link>. Gratuit, sans carte bancaire.",
    moreTitle: "Autres exemples de CV",
  },
} satisfies Translation<Messages["resumeExamples"]>;
