import type { Messages } from "..";
import type { Translation } from "../../types";

// French spacing: a no-break space before ":" and inside « », a narrow one before "?", "!" and ";".
export default {
  quote: "« {text} »",
  issues: {
    stock: {
      one: "{phrases} est une formule que les recruteurs ignorent. Montre plutôt le résultat.",
      other: "{phrases} sont des formules que les recruteurs ignorent. Montre plutôt le résultat.",
    },
    weakStart: "Remplace {phrase} par ce que tu as fait, comme « Créé », « Réduit » ou « Dirigé ».",
    duty: "{phrase} ressemble à une fiche de poste. Dis ce que tu as fait et ce qui a changé.",
    tense: "Ce poste est terminé, alors écris {past}, pas {phrase}.",
    noResult:
      "Qu'est-ce qui a changé grâce à ça ? Ajoute le résultat, et de combien si tu le sais.",
    noNumber: "Combien, à quel point ou en combien de temps ? Ajoute un chiffre si tu le connais.",
    noNumberWord:
      "{word} de combien, ou pour combien de personnes ? Ajoute un chiffre si tu le connais.",
    noMethod: "Dis comment tu as fait : qu'as-tu créé, changé ou mis en place ?",
    firstPersonTeam: "{word} cache ta part. Dis ce que tu as fait.",
    firstPersonSelf: "Retire {word}. Les lignes d'un CV se passent de « je », « mon » et « nous ».",
    passive: "{phrase} cache qui l'a fait. Dis plutôt ce que tu as fait.",
    vagueList: "{phrase} est vague. Nomme ce qui compte, ou coupe.",
    vagueThing: "{phrase} est vague. Dis exactement quoi.",
    vagueCount: "{phrase} est vague. Donne le vrai chiffre.",
    tooLongWords:
      "Cette ligne fait {count} mots. Raccourcis-la à deux lignes pour qu'on la lise d'un coup d'œil.",
    tooLongChars:
      "Cette ligne fait {count} caractères. Raccourcis-la à deux lignes pour qu'on la lise d'un coup d'œil.",
    tooShort:
      "Cette ligne est trop courte pour montrer grand-chose. Ajoute ce que tu as fait et ce qui a changé.",
    duplicate:
      "Cette ligne en répète une autre. Garde-en une, ou fais dire quelque chose de nouveau à chacune.",
    stopMost: "La plupart des lignes ici finissent par un point. Ajoutes-en un ici aussi.",
    stopFirst: "Ta première ligne ici finit par un point. Ajoutes-en un ici aussi.",
    noneMost: "La plupart des lignes ici finissent sans point. Retire celui-ci pour harmoniser.",
    noneFirst: "Ta première ligne ici finit sans point. Retire celui-ci pour harmoniser.",
  },
  help: {
    duty: {
      why: "Les recruteurs cherchent ce que tu as fait et ce qui a changé, pas la fiche de poste.",
      before: "Responsable de la maintenance de la base de données",
      after:
        "Maintenu la base de données à 99,9 % de disponibilité grâce à des sauvegardes automatiques",
    },
    "no-result": {
      why: "Une ligne qui finit sur un résultat montre pourquoi ton travail a compté.",
      before: "Développé des API REST en Node.js",
      after: "Créé des API REST en Node.js qui ont réduit le temps de chargement de 3 s à 0,8 s",
    },
    "no-number": {
      why: "Un chiffre montre l'ampleur du résultat : combien, à quel point ou en combien de temps.",
      before: "Amélioré le parcours de paiement",
      after: "Amélioré le parcours de paiement, avec 12 % de commandes finalisées en plus",
    },
    "no-method": {
      why: "Dire comment tu as obtenu le résultat le rend crédible.",
      before: "Réduit de 30 % les coûts cloud",
      after:
        "Réduit de 30 % les coûts cloud en passant les traitements par lots sur des serveurs moins chers",
    },
    "weak-start": {
      why: "Le premier mot est lu en premier. Un verbe fort montre que c'est toi qui as fait le travail.",
      before: "Aidé à migrer le portail patients vers React",
      after: "Migré vers React le portail patients utilisé par 40 000 patients",
    },
    "first-person": {
      why: "Les lignes d'un CV se passent de « je » et de « nous ». C'est ton CV, on sait qui l'a fait.",
      before: "J'ai créé le système de facturation",
      after: "Créé le système de facturation utilisé par 40 clients",
    },
    tense: {
      why: "Les postes que tu as quittés s'écrivent au passé.",
      before: "Crée des outils internes pour l'équipe support",
      after: "Créé des outils internes qui ont fait gagner 5 heures par semaine au support",
    },
    "too-long": {
      why: "Les lignes longues sont survolées. Une ou deux lignes chacune, c'est plus facile à lire.",
      after: "Réduit de 40 % le temps de déploiement en passant les builds sur un cache partagé",
    },
    "too-short": {
      why: "Quelques mots ne suffisent pas à montrer ce que tu as fait et ce qui a changé.",
      before: "Corrigé des bugs",
      after: "Corrigé 120 bugs du paiement, avec 18 % de paiements échoués en moins",
    },
    passive: {
      why: "Dire ce que tu as fait rend ta part claire.",
      before: "La base de données a été migrée vers PostgreSQL",
      after: "Migré la base de données vers PostgreSQL en 3 semaines",
    },
    vague: {
      why: "Des mots comme « plusieurs » ou « divers » remplacent un vrai chiffre ou un vrai nom.",
      before: "Animé plusieurs webinaires",
      after: "Animé 14 webinaires partenaires qui ont généré 2 300 inscriptions",
    },
    "stock-phrase": {
      why: "Les formules que tous les CV contiennent sont ignorées. Un résultat le dit mieux.",
      before: "Rigoureux et force de proposition",
      after: "Dirigé une équipe de 4 qui a livré l'appli mobile 2 semaines en avance",
    },
    duplicate: { why: "Une ligne répétée prend la place d'un autre résultat." },
    punctuation: { why: "Des lignes qui finissent de la même façon font soigné." },
  },
  checks: {
    result: "Dit ce qui a changé",
    start: "Commence fort",
    voice: "Sans je ni nous",
    stock: "Sans formules toutes faites",
    length: "Bonne longueur",
    numbers: "A des chiffres",
    method: "Dit comment",
    tense: "Au passé",
    passive: "Dit qui l'a fait",
    vague: "Sans mots vagues",
    repeat: "Sans lignes répétées",
    stops: "Points finaux cohérents",
  },
  review: {
    groups: {
      duty: {
        title: {
          one: "{count} ligne ressemble à une fiche de poste",
          other: "{count} lignes ressemblent à une fiche de poste",
        },
        reason:
          "Les recruteurs cherchent ce que tu as fait et ce qui a changé, pas la tâche elle-même.",
      },
      "no-result": {
        title: {
          one: "{count} ligne ne dit pas ce qui a changé",
          other: "{count} lignes ne disent pas ce qui a changé",
        },
        reason:
          "Chaque ligne devrait finir sur un résultat : ce qui s'est amélioré, pour qui, et de combien si tu le sais.",
      },
      "weak-start": {
        title: {
          one: "{count} ligne commence mollement",
          other: "{count} lignes commencent mollement",
        },
        reason: "Commence par ce que tu as fait, comme Créé, Réduit, Dirigé ou Rédigé.",
      },
      "first-person": {
        title: {
          one: "{count} ligne utilise je ou nous",
          other: "{count} lignes utilisent je ou nous",
        },
        reason: "Les lignes d'un CV se passent de je, mon et nous.",
      },
      "stock-phrase": {
        title: {
          one: "{count} ligne utilise des formules toutes faites",
          other: "{count} lignes utilisent des formules toutes faites",
        },
        reason:
          "Les formules que tous les CV contiennent sont survolées. Montre plutôt le résultat.",
      },
      "too-long": {
        title: {
          one: "{count} ligne dépasse deux lignes",
          other: "{count} lignes dépassent deux lignes",
        },
        reason: "Les lignes longues sont sautées. Garde chacune sur une ou deux lignes.",
      },
      tense: {
        title: {
          one: "{count} ligne d'anciens postes est au présent",
          other: "{count} lignes d'anciens postes sont au présent",
        },
        reason: "Les postes que tu as quittés s'écrivent au passé : Créé, pas Crée.",
      },
      passive: {
        title: {
          one: "{count} ligne cache qui a fait le travail",
          other: "{count} lignes cachent qui a fait le travail",
        },
        reason: "Dis ce que tu as fait, pas ce qui a été fait.",
      },
      vague: {
        title: {
          one: "{count} ligne utilise des mots vagues",
          other: "{count} lignes utilisent des mots vagues",
        },
        reason: "Des mots comme plusieurs ou divers remplacent un vrai chiffre ou un vrai nom.",
      },
      duplicate: {
        title: {
          one: "{count} ligne en répète une autre",
          other: "{count} lignes en répètent une autre",
        },
        reason: "Garde-en une, ou fais dire quelque chose de nouveau à chacune.",
      },
      "too-short": {
        title: { one: "{count} ligne est trop courte", other: "{count} lignes sont trop courtes" },
        reason: "Quelques mots ne suffisent pas à montrer ce que tu as fait et ce qui a changé.",
      },
      "no-method": {
        title: {
          one: "{count} résultat ne dit pas comment",
          other: "{count} résultats ne disent pas comment",
        },
        reason: "Un résultat est plus convaincant quand tu dis comment tu l'as obtenu.",
      },
      "no-number": {
        title: {
          one: "{count} ligne gagnerait à avoir un chiffre",
          other: "{count} lignes gagneraient à avoir un chiffre",
        },
        reason:
          "Si tu le connais, un chiffre montre l'ampleur : combien, à quel point, en combien de temps.",
      },
      punctuation: {
        title: {
          one: "Les points finaux ne concordent pas sur {count} ligne",
          other: "Les points finaux ne concordent pas sur {count} lignes",
        },
        reason:
          "Les lignes d'un même poste ou projet sont plus soignées quand elles finissent toutes pareil : avec un point, ou sans.",
      },
    },
    summary: {
      place: "Profil",
      both: "Ton profil utilise des formules toutes faites et je",
      firstPerson: "Ton profil utilise je ou nous",
      stock: "Ton profil utilise des formules toutes faites",
      reason:
        "Le haut de la page est lu en premier, il doit sonner comme tes lignes : des faits, sans je.",
    },
    firstLook: {
      title: {
        one: "{count} poste n'a pas d'intitulé, d'entreprise ou de dates",
        other: "{count} postes n'ont pas d'intitulé, d'entreprise ou de dates",
      },
      reason:
        "Le premier regard d'un recruteur va vers tes intitulés de poste, tes entreprises et tes dates.",
      missing: "Sans {parts}.",
      parts: { title: "intitulé de poste", company: "entreprise", dates: "période" },
      at: "{title} chez {company}",
      aJob: "Un poste",
    },
    headline: {
      title: "Pas d'intitulé de poste sous ton nom",
      reason:
        "Mets en haut le poste que tu vises, pour que le lecteur sache à quel titre tu postules.",
    },
    skills: {
      title: {
        one: "{count} compétence n'apparaît que dans ta liste de compétences",
        other: "{count} compétences n'apparaissent que dans ta liste de compétences",
      },
      reason: {
        one: "{skills} : aucune ligne de poste ou de projet ne montre que tu l'as utilisée. Les recruteurs et les filtres font plus confiance à une compétence citée dans ce que tu as fait.",
        other:
          "{skills} : aucune ligne de poste ou de projet ne montre que tu les as utilisées. Les recruteurs et les filtres font plus confiance à une compétence citée dans ce que tu as fait.",
      },
      more: "{names} et {count} autres",
    },
  },
} satisfies Translation<Messages["lint"]>;
