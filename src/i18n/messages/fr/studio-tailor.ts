import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  cancel: "Annuler",
  stages: {
    reading: "Otto lit l’offre d’emploi.",
    comparing: "Otto la compare avec ton CV.",
    writing: "Otto écrit tes lignes adaptées.",
    still: "J’écris encore. Les longues offres prennent un peu plus de temps.",
  },
  otto: {
    intro: "Colle le lien d’une offre. Je te montre ce qu’elle demande et ce que tu as déjà.",
    working:
      "Lunettes sur le nez. Ça prend jusqu’à une minute. Tu peux quitter cette étape, je continue.",
    done: "Ton CV adapté est prêt. Ton original ne bouge pas.",
    cancelled:
      "Arrêté. Ça peut quand même compter comme 1 version adaptée, car j’avais déjà commencé.",
    screener: {
      noRequirements:
        "Je n’ai pas trouvé d’exigences claires dans cette offre. Une offre plus complète marche mieux.",
      niceOnly:
        "Cette offre n’a pas d’exigences obligatoires. Ton CV montre {shown} des {total} atouts souhaités.",
      oneProven:
        "Ton CV prouve la seule exigence obligatoire. Les filtres vérifient exactement ça.",
      allProven:
        "Ton CV prouve les {total} exigences obligatoires. Les filtres les vérifient une par une.",
      noneProven:
        "Je ne trouve pas encore de preuve des {total} exigences obligatoires. Passons-les en revue.",
      someProven: {
        one: "Ton CV prouve {proven} des {total} exigences obligatoires. Regardons celle qui reste.",
        other:
          "Ton CV prouve {proven} des {total} exigences obligatoires. Regardons les {count} autres.",
      },
    },
  },
  free: {
    otto: "Voici chaque compétence citée par cette offre, et où ton CV la montre.",
    usage:
      "Free montre les compétences citées par l’offre et où tu les montres. L’adaptation est incluse dans Pro.",
    title: "Adapter avec Pro va plus loin",
    note: "Otto lit l’offre pour son sens, pas seulement ses mots. Il place en premier tes meilleures lignes pour ce poste, écrit un résumé pour lui et t’aide à ajouter des lignes pour ce qui manque, à partir des faits que tu lui donnes. Tout va dans un CV adapté, donc ton original ne bouge pas.",
    already: "Déjà sur Pro ?",
    signIn: "Connecte-toi",
  },
  left: "Il te reste {left} versions adaptées sur {limit} {period}.",
  pastedPost: "L’offre que tu as collée",
  empty: "Ajoute d’abord un CV",
  base: {
    title: "Adaptation d’une copie de « {title} »",
    note: "Ce CV est déjà adapté, alors je pars de l’original dont il vient. Chaque offre a sa propre copie.",
    fallback: "ton CV original",
  },
  comparedWith: "Comparé avec",
  changePost: "Changer d’offre",
  startOver: "Recommencer avec une autre offre",
  stale: {
    freeTitle: "Cette vérification porte sur l’offre comparée avant",
    freeNote: "Compare à nouveau pour vérifier l’offre telle qu’elle est maintenant.",
    title: "Ces résultats portent sur l’offre envoyée avant",
    note: "Compare à nouveau pour les mettre à jour avec l’offre telle qu’elle est maintenant.",
  },
  savedJobFailed: "Impossible d’ouvrir cette offre enregistrée",
  errors: {
    signedOut: "Tu as été déconnecté. Reconnecte-toi pour continuer.",
    refused:
      "Je ne peux pas travailler avec cette offre. Essaie de coller seulement la description du poste.",
    badPost: "Cette offre n’est pas passée. Vérifie que c’est l’offre complète, puis réessaie.",
  },
  row: {
    status: {
      proven: { label: "Prouvé", chip: "Prouvé" },
      listed: { label: "Mentionné mais pas prouvé", chip: "Mentionné, pas prouvé" },
      missing: { label: "Absent", chip: "Absent" },
      declined: { label: "Tu as dit non", chip: "Tu as dit non" },
    },
    newLine: "Ta nouvelle ligne, pour le CV adapté",
    matchedByOtto: "trouvé par Otto",
    removeLine: "Retirer la ligne",
    showLine: "Voir la ligne",
    unproven:
      "Cette ligne va dans le CV adapté, mais elle ne cite pas {name}, donc un filtre ne la comptera pas.",
    showWhere: "Montre où tu l’as utilisé",
    yes: "Oui",
    no: "Non",
    staysOff: "Ça reste hors de ton CV.",
    changeAnswer: "Changer de réponse",
  },
  addLine: {
    where: "Où l’as-tu fait ?",
    what: "Qu’as-tu fait ?",
    whatHint: "Quelques mots suffisent. Otto n’ajoute rien que tu n’aies pas dit.",
    whatFirst: "Dis d’abord où et ce que tu as fait. Quelques mots suffisent.",
    placeholder: "Accompagné deux nouvelles recrues pendant leur premier mois",
    placeholderWith: "Mis en place nos serveurs de préproduction avec {name}",
    noTarget:
      "Ajoute d’abord un emploi ou un projet dans Corriger les lignes, puis reviens ajouter cette ligne.",
    write: "Écrire la ligne",
    useMine: "Utiliser mes mots",
    cancel: "Annuler",
    usesFix: "Écrire la ligne utilise 1 correction de ligne.",
    newLine: "Ta nouvelle ligne",
    newLineHint: "Va dans le CV adapté, sous {place}.",
    brackets: "Complète ou supprime d’abord ce qui est entre [crochets].",
    nameIt: "Cite {name} dans la ligne, pour qu’un filtre le trouve.",
    claimsMore:
      "Otto a écrit « {verb} », qui en dit plus que toi. Change-le si ce n’est pas juste.",
    droppedHelp:
      "Tu as dit que tu avais aidé ; cette ligne laisse croire que tu l’as fait seul. Remets-le si c’est plus juste.",
    add: "Ajouter cette ligne",
    back: "Retour",
  },
  results: {
    label: "Résultats de l’adaptation",
    gone: "Ce CV n’existe plus",
    goneNote: "Choisis-en un autre et réessaie.",
    bestFirst: "Tes meilleures lignes d’abord",
    bestFirstNote:
      "Les lignes qui prouvent une exigence obligatoire remontent en haut de leur emploi, là où les filtres et les recruteurs regardent en premier.",
    movedIn: {
      one: "Des lignes remontent dans {moved} emploi sur {count}",
      other: "Des lignes remontent dans {moved} emplois sur {count}",
    },
    tips: "Conseils pour cette offre",
    tipCount: { one: "{count} conseil", other: "{count} conseils" },
  },
  copy: {
    title: "Ton CV adapté",
    picked: "Choisi pour cette offre. Change ce que tu veux plus bas. Ton original ne bouge pas.",
    create: "Créer la version adaptée",
    ready: "Ton CV adapté est prêt",
    readyNote: "{title}. Ton original ne bouge pas.",
    open: "Ouvrir la version adaptée",
    another: "En créer une autre",
    barReady: "Ta copie pour cette offre est prête : {title}.",
  },
  changes: {
    lines: {
      one: "Ajoute {count} ligne que tu as confirmée",
      other: "Ajoute {count} lignes que tu as confirmées",
    },
    skills: {
      one: "Ajoute {count} compétence à ta section Compétences",
      other: "Ajoute {count} compétences à ta section Compétences",
    },
    reordered: {
      one: "Met tes meilleures lignes en premier dans {count} emploi",
      other: "Met tes meilleures lignes en premier dans {count} emplois",
    },
    summary: "Utilise le nouveau résumé",
    inline: {
      lines: {
        one: "ajoute {count} ligne que tu as confirmée",
        other: "ajoute {count} lignes que tu as confirmées",
      },
      skills: {
        one: "ajoute {count} compétence à ta section Compétences",
        other: "ajoute {count} compétences à ta section Compétences",
      },
      reordered: {
        one: "met tes meilleures lignes en premier dans {count} emploi",
        other: "met tes meilleures lignes en premier dans {count} emplois",
      },
      summary: "utilise le nouveau résumé",
    },
    sentence: "La copie {changes}. Ton original ne bouge pas.",
    none: "Aucun changement choisi. La copie garde tes lignes telles quelles, avec le nom de cette offre.",
  },
  lines: {
    title: "Tes lignes pour cette offre",
    shows: {
      one: "{count} ligne montre ce que demande cette offre",
      other: "{count} lignes montrent ce que demande cette offre",
    },
    weak: "{count} pourraient mieux le dire",
    unrelated: {
      one: "{count} autre ligne ne montre rien de ce qu’elle demande ; elle peut rester, plus bas.",
      other:
        "{count} autres lignes ne montrent rien de ce qu’elle demande ; elles peuvent rester, plus bas.",
    },
    must: "obligatoire",
    nice: "souhaité",
    newLine: "Ta nouvelle ligne, pour le CV adapté",
    couldBeBetter: "Pourrait être mieux :",
    showLine: "Voir la ligne",
    fewer: "Voir moins",
    all: "Voir les {count} lignes",
  },
  top: {
    title: "Le haut de ton CV",
    note: "Un recruteur lit ton titre et ton résumé avant toute ligne.",
    bothFit: "Ton titre et ton résumé collent à cette offre",
    summaryFits: "Ton résumé colle à cette offre",
    bothOff: "Ton titre et ton résumé pourraient mieux coller à cette offre",
    titleOff: "Ton titre pourrait mieux coller à cette offre",
    summaryOff: "Ton résumé pourrait mieux coller à cette offre",
    jobTitle: "Titre",
    summary: "Résumé",
    looksRight: " : c’est bon",
    couldBeBetter: " : pourrait être mieux",
    suggested: "Résumé suggéré",
    suggestedNote: "Écrit uniquement à partir de ce qui est déjà dans ton CV.",
    useSummary: "Utiliser ce résumé",
    replaces: "Remplace ton résumé actuel dans le CV adapté seulement.",
    fillsGap: "Ton CV n’a pas encore de résumé, celui-ci comble le manque.",
  },
  screener: {
    eyebrow: "Vue du filtre IA",
    none: "Pas d’exigences claires dans cette offre",
    noneNote:
      "Elle ne dit pas ce dont un candidat a besoin. Une offre plus complète, avec ses exigences, marche mieux.",
    title: "Les exigences, une par une",
    note: "Des outils comme HiredScore et Ashby vérifient chaque exigence séparément. Voici cette vérification, faite au grand jour. Ce n’est la note exacte d’aucun outil.",
    groups: { must: "Obligatoires", nice: "Souhaitées" },
  },
  overview: {
    title: "À corriger en premier pour cette offre",
    allShown: "Chaque exigence obligatoire apparaît dans une ligne sur ce que tu as fait.",
    showLine: "Voir la ligne",
    goTo: "Y aller",
    see: "Voir",
  },
  recent: {
    title: "Offres récentes",
    saved: "Enregistrée :",
    tailored: "Déjà adaptée :",
    failed: "Impossible d’ouvrir cette offre",
    failedNote: "Réessaie dans un instant.",
  },
  system: {
    uses: "Cette offre utilise {system}",
    howItReads: "comment il te lit",
    notes: { one: "{count} note sur {system}", other: "{count} notes sur {system}" },
    questions:
      "Questions de ce formulaire qui peuvent être réglées pour te refuser automatiquement",
    required: "Obligatoire",
    yesNo: "Oui ou non",
    choices: "{count} choix",
    answerTruthfully:
      "Je ne sais pas lesquelles cet employeur utilise. Réponds avec honnêteté, et toujours de la même façon.",
  },
  kit: {
    title: "Postuler à cette offre",
    meta: "Une lettre de motivation et des réponses aux questions du formulaire",
    note: "Écrit uniquement à partir de ton CV et de cette offre, avec des mots simples. Tu le copies là où il faut.",
    letterWritten: "Lettre de motivation écrite",
    answers: { one: "{count} réponse", other: "{count} réponses" },
  },
  letter: {
    title: "Lettre de motivation",
    words: "{count} mots",
    about:
      "Environ 200 mots : le poste, tes faits les plus proches et pourquoi cette offre. Uniquement à partir de ton CV.",
    check: "Vérifie-la avant de l’envoyer",
    copy: "Copier",
    download: "Télécharger le PDF",
    rewrite: "En écrire une nouvelle",
    write: "Écrire une lettre de motivation",
    pdfFailed: "Ton PDF n’est pas sorti",
    pdfFailedNote: "Réessaie, ou copie la lettre.",
  },
  answers: {
    title: "Répondre à une question de candidature",
    question: "La question",
    hint: "À partir de ton CV et de cette offre. Relis chaque phrase avant de la coller : Otto n’envoie jamais rien.",
    placeholder: "Pourquoi veux-tu travailler ici ?",
    whole:
      "Colle la question entière du formulaire, par exemple « Pourquoi veux-tu travailler ici ? »",
    draft: "Rédiger une réponse",
    remove: "Retirer cette réponse",
    copy: "Copier",
    words: "{count} mots",
  },
  reorder: {
    moveUp: "Nous remonterons ces lignes :",
    more: "Et {count} de plus.",
  },
  reasons: {
    places: {
      at: "{title} chez {company}",
      line: "{place}, ligne {number}",
      experience: "Expérience",
      project: "Projet",
      education: "Formation",
      jobTitle: "Intitulé de poste",
      certifications: "Certifications",
      summary: "Résumé",
      skills: "Compétences",
      skillsGroup: "Compétences : {label}",
      headline: "Titre",
    },
    problems: {
      duty: "ressemble à une fiche de poste",
      "no-result": "ne dit pas ce qui a changé",
      "weak-start": "commence faiblement",
      "stock-phrase": "s’appuie sur une formule toute faite",
      "first-person": "dit je ou nous",
      tense: "est au présent pour un poste que tu as quitté",
    },
    years: {
      one: " L’offre demande {asked}+ ans ; les dates de tes postes font environ {count} an.",
      other: " L’offre demande {asked}+ ans ; les dates de tes postes font environ {count} ans.",
    },
    spelled:
      " L’offre dit « {term} » et ta ligne le dit autrement. Certains systèmes ne cherchent que les mots exacts, donc écris aussi « {term} » une fois.",
    added: "Ta nouvelle ligne le prouve. Elle va dans le CV adapté.",
    onlyIn: "Seulement dans {where}. Montre-le aussi dans une ligne sur ce que tu as fait.",
    onlyInPlaces: {
      jobTitle: "un intitulé de poste",
      certifications: "tes certifications",
      education: "ta formation",
      summary: "ton résumé",
    },
    shownOutside: "Montré {where}, pas dans un emploi.",
    outsidePlaces: {
      project: "dans ton projet {name}",
      education: "dans ta formation",
      other: "dans {name}",
    },
    atWork: " Si tu l’as utilisé au travail, dis-le dans cet emploi.",
    shownWithProblem: "Montré chez {where}, mais cette ligne {problem}.",
    shownAt: "Montré dans une ligne chez {where}.",
    declined: "Tu as dit que tu ne l’as pas.",
    otherForm:
      "Ton CV dit « {written} » ; l’offre dit « {asked} ». Les recherches par mot-clé ne trouvent que la forme tapée, donc écris les deux une fois : « {both} ».",
    listed:
      "Seulement dans ton {list}. Aucune ligne d’emploi ne montre que tu l’utilises, et les filtres le cherchent dans ce que tu as fait.",
    lists: {
      headline: "titre",
      skills: "liste de compétences",
      group: "liste de compétences ({group})",
    },
    missingMust: "L’offre le demande, et rien dans ton CV ne le dit encore.",
    missingNice: "Un plus pour ce poste. Rien dans ton CV ne le dit encore.",
    lineNote: "Montre {names} ({kind}). {next}",
    lineKinds: { must: "une exigence obligatoire", nice: "une exigence souhaitée" },
    keepNearTop: "Garde-la vers le haut.",
    fixFirst: {
      missing: {
        one: "{count} exigence obligatoire n’est pas dans ton CV : {names}",
        other: "{count} exigences obligatoires ne sont pas dans ton CV : {names}",
      },
      missingReason: "Si tu l’as fait, dis où. Sinon, dis non, et rien n’est ajouté.",
      listed: {
        one: "{count} exigence obligatoire n’est que dans ta liste de compétences : {names}",
        other: "{count} exigences obligatoires ne sont que dans ta liste de compétences : {names}",
      },
      listedReason:
        "Les filtres la cherchent dans une ligne sur ce que tu as fait. Montre où tu l’as utilisée.",
      spelled: "L’offre dit « {asked} » ; ton CV dit « {written} »",
      spelledReason:
        "Les recherches par mot-clé ne trouvent que la forme tapée. Écris les deux une fois : « {both} ».",
      weak: {
        one: "{count} ligne qui montre une exigence obligatoire manque de force",
        other: "{count} lignes qui montrent des exigences obligatoires manquent de force",
      },
      title: "Ton titre ne nomme pas ce poste",
      noSummary: "Pas de résumé en haut",
      summary: "Ton résumé ne parle pas de ce poste",
    },
    headline: {
      must: "Exigences obligatoires prouvées : {proven} sur {total}",
      nice: "Souhaitées : {proven} sur {total}",
      join: " · ",
    },
    title: {
      headline: "Ton titre correspond à l’intitulé de l’offre, « {title} ».",
      latest: "Ton dernier intitulé de poste correspond à celui de l’offre, « {title} ».",
      missing:
        "L’intitulé de l’offre est « {title} ». S’il te correspond, mets-le sous ton nom. Les recruteurs cherchent par intitulé de poste.",
      differs:
        "L’intitulé de l’offre est « {title} » ; ton titre dit « {headline} ». Si le poste te correspond, reprends son intitulé dans ton titre ou ton résumé. Ne change jamais l’intitulé d’un ancien poste.",
    },
    summary: {
      missing:
        "Tu n’as pas de résumé. Deux lignes en haut qui nomment ce poste et ce qui s’en rapproche le plus aident quelqu’un qui survole.",
      names: "Ton résumé cite {what}.",
      theTitle: "l’intitulé du poste",
      differs: "Ton résumé ne cite ni ce poste ni ses exigences obligatoires.",
      suggest: " Tu montres {names} dans tes lignes ; dis-le aussi en haut.",
    },
    asks: {
      used: "As-tu déjà utilisé {term} ?",
      experience: "As-tu de l’expérience avec {phrase} ?",
    },
  },
  skip: {
    note: "Pas d’offre en tête ? Télécharge-le tel quel.",
    action: "Passer à Télécharger",
  },
} satisfies Translation<Messages["studioTailor"]>;
