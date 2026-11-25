import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  results: {
    textReadable: {
      title: "Le texte est lisible",
      detail: "Le logiciel de recrutement peut extraire le texte de ce fichier.",
    },
    textMissing: {
      title: "Aucun texte lisible",
      detail:
        "Le logiciel de recrutement ne peut lire aucun texte dans ce fichier. C’est sans doute un scan ou une image.",
    },
    emailNotChecked: {
      title: "E-mail non vérifié",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu chercher d’adresse e-mail.",
    },
    emailFound: {
      title: "Adresse e-mail trouvée",
      detail: "On a trouvé {email}, donc les recruteurs peuvent te joindre.",
    },
    emailMissing: {
      title: "Aucune adresse e-mail",
      detail:
        "On n’a pas trouvé d’adresse e-mail dans le texte principal. Sans elle, les recruteurs ne peuvent pas te joindre.",
    },
    phoneNotChecked: {
      title: "Téléphone non vérifié",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu chercher de numéro de téléphone.",
    },
    phoneFound: { title: "Numéro de téléphone trouvé", detail: "On a trouvé {phone}." },
    phoneMissing: {
      title: "Aucun numéro de téléphone",
      detail:
        "On n’a pas trouvé de numéro de téléphone. Beaucoup de recruteurs appellent ou écrivent un SMS avant d’envoyer un e-mail.",
    },
    headerPdf: {
      title: "Rien de caché dans les en-têtes",
      detail:
        "Dans un PDF, l’en-tête fait partie de la page, donc le logiciel de recrutement le lit.",
    },
    headerClear: {
      title: "Rien de caché dans les en-têtes",
      detail: "Aucune de tes coordonnées n’est cachée dans un en-tête ou un pied de page.",
    },
    headerEmail: {
      title: "Coordonnées dans l’en-tête",
      detail:
        "Ton e-mail n’est que dans l’en-tête ou le pied de page. Beaucoup de systèmes les ignorent, donc ils ne le voient jamais.",
    },
    headerPhone: {
      title: "Coordonnées dans l’en-tête",
      detail:
        "Ton numéro de téléphone n’est que dans l’en-tête ou le pied de page. Beaucoup de systèmes les ignorent, donc ils ne le voient jamais.",
    },
    headerBoth: {
      title: "Coordonnées dans l’en-tête",
      detail:
        "Ton e-mail et ton numéro de téléphone ne sont que dans l’en-tête ou le pied de page. Beaucoup de systèmes les ignorent, donc ils ne les voient jamais.",
    },
    sectionsNotChecked: {
      title: "Sections non vérifiées",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu vérifier les titres de tes sections.",
    },
    sectionsProjectsOnly: {
      title: "Aucune section d’expérience",
      detail:
        "On a trouvé Projets mais pas de titre Expérience. C’est normal au début, mais les emplois vont sous Expérience.",
    },
    sectionsNoWork: {
      title: "Aucune section d’expérience",
      detail:
        "On n’a pas trouvé de titre comme « Expérience » ou « Expérience professionnelle ». Sans lui, beaucoup de systèmes ne distinguent pas tes emplois.",
    },
    sectionsNoSkillsOrEducation: {
      title: "Aucune section Compétences ni Formation",
      detail:
        "On n’a pas trouvé de titres Compétences ni Formation. Beaucoup de systèmes utilisent les deux pour te rapprocher des offres.",
    },
    sectionsNoSkills: {
      title: "Aucune section Compétences",
      detail:
        "On n’a pas trouvé de titre Compétences. Beaucoup de systèmes s’en servent pour te rapprocher des offres.",
    },
    sectionsNoEducation: {
      title: "Aucune section Formation",
      detail:
        "On n’a pas trouvé de titre Formation. Beaucoup de systèmes en attendent une, même courte.",
    },
    sectionsFound: { title: "Titres de section clairs", detail: "On a trouvé {sections}." },
    layoutNotChecked: {
      title: "Mise en page non vérifiée",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu vérifier la mise en page.",
    },
    singleColumn: {
      title: "Une seule colonne",
      detail: "Ton texte se lit de haut en bas, sur une colonne.",
    },
    columnsPdf: {
      title: "Mise en page sur deux colonnes",
      detail:
        "Ta page a des colonnes côte à côte. Certains systèmes lisent tout droit et les mélangent.",
    },
    columnsDocument: {
      title: "Mise en page sur deux colonnes",
      detail:
        "Ton document est construit en colonnes. Certains systèmes lisent tout droit et les mélangent.",
    },
    tablesPdf: {
      title: "Pas de souci de tableaux",
      detail:
        "Les tableaux ne gênent le logiciel de recrutement que dans les fichiers Word. Dans un PDF, c’est du texte normal, et la vérification de la mise en page les couvre.",
    },
    tablesNone: {
      title: "Pas de tableaux",
      detail: "Ton texte n’est pas dans des tableaux, que certains systèmes lisent mal.",
    },
    tablesFound: {
      title: "Tableaux trouvés",
      detail: {
        one: "Ton fichier contient {count} tableau. Certains systèmes lisent les cellules dans le désordre ou les sautent.",
        other:
          "Ton fichier contient {count} tableaux. Certains systèmes lisent les cellules dans le désordre ou les sautent.",
      },
    },
    textBoxesPdf: {
      title: "Pas de souci de zones de texte",
      detail:
        "Dans un PDF, les zones de texte deviennent du texte normal que le logiciel de recrutement peut lire.",
    },
    textBoxesNone: {
      title: "Pas de zones de texte",
      detail: "Tout ton texte est dans la page principale.",
    },
    textBoxesFound: {
      title: "Zones de texte trouvées",
      detail: {
        one: "Ton fichier contient {count} zone de texte. Beaucoup de systèmes ignorent complètement les zones de texte, donc ce texte risque de ne jamais être lu.",
        other:
          "Ton fichier contient {count} zones de texte. Beaucoup de systèmes ignorent complètement les zones de texte, donc ce texte risque de ne jamais être lu.",
      },
    },
    imagesNone: { title: "Pas d’images", detail: "Rien d’important n’est caché dans une image." },
    imagePages: {
      title: "Les pages sont des images",
      detail: "Tes pages sont des images. Le logiciel de recrutement ne voit pas ce qu’elles contiennent.",
    },
    imagesFound: {
      title: "Images trouvées",
      detail: {
        one: "On a trouvé {count} image. Les logos, photos et barres de compétences sont invisibles pour le logiciel de recrutement.",
        other:
          "On a trouvé {count} images. Les logos, photos et barres de compétences sont invisibles pour le logiciel de recrutement.",
      },
    },
    iconsNotChecked: {
      title: "Icônes non vérifiées",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu chercher de caractères d’icône.",
    },
    iconsNone: {
      title: "Pas de caractères d’icône",
      detail: "Aucun symbole qui s’afficherait comme du texte illisible.",
    },
    iconsFound: {
      title: "Caractères d’icône trouvés",
      detail: {
        one: "On a trouvé {count} caractère d’icône, comme un symbole de téléphone ou d’e-mail. Beaucoup de systèmes les affichent comme des carrés ou du charabia.",
        other:
          "On a trouvé {count} caractères d’icône, comme des symboles de téléphone ou d’e-mail. Beaucoup de systèmes les affichent comme des carrés ou du charabia.",
      },
    },
    datesNotChecked: {
      title: "Dates non vérifiées",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu vérifier tes dates.",
    },
    datesNone: {
      title: "Aucune date trouvée",
      detail:
        "On n’a pas trouvé de dates pour tes emplois. Beaucoup de systèmes s’en servent pour calculer tes années d’expérience.",
    },
    datesFound: {
      title: "Dates trouvées",
      detail:
        "On a trouvé des dates comme « {sample} », donc les systèmes peuvent calculer ton expérience.",
    },
    datesMixed: {
      title: "Formats de date mélangés",
      detail:
        "Tes dates mélangent les styles, comme « {main} » et « {other} ». Certains systèmes lisent mal les formats mélangés quand ils additionnent ton expérience.",
    },
    datesConsistent: {
      title: "Dates cohérentes",
      detail: "Les dates de tes emplois suivent toutes un seul style, comme « {sample} ».",
    },
    lengthNotChecked: {
      title: "Longueur non vérifiée",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu vérifier la longueur.",
    },
    lengthShort: {
      title: "Très peu de texte",
      detail: {
        one: "On n’a trouvé que {count} mot. Ça donne au logiciel de recrutement peu de chose à comparer avec une offre.",
        other:
          "On n’a trouvé que {count} mots. Ça donne au logiciel de recrutement peu de chose à comparer avec une offre.",
      },
    },
    lengthLong: {
      title: "Plus de deux pages",
      detail: {
        one: "Ton CV fait {count} page. Les recruteurs survolent, et beaucoup en attendent une ou deux.",
        other:
          "Ton CV fait {count} pages. Les recruteurs survolent, et beaucoup en attendent une ou deux.",
      },
    },
    lengthGood: {
      title: "Bonne longueur",
      detail:
        "{pages} et {words} : assez pour correspondre aux offres, assez court pour être survolé.",
    },
    bulletsNotChecked: {
      title: "Puces non vérifiées",
      detail: "Il n’y a pas de texte lisible, donc on n’a pas pu vérifier tes puces.",
    },
    bulletsParagraphs: {
      title: "Longs paragraphes dans tes emplois",
      detail:
        "Le détail de tes emplois est écrit en longs paragraphes. Des puces courtes se survolent et se comparent plus facilement.",
    },
    bulletsGood: {
      title: "Facile à survoler",
      detail: "Pas de longs paragraphes, donc tes emplois se parcourent vite.",
    },
  },
  fixes: {
    scan: "Importe un PDF exporté depuis Word ou Google Docs, pas un scan ni une photo.",
    moveEmail: "Sors ton e-mail de l’en-tête et mets-le dans le texte principal.",
    addEmail: "Ajoute ton adresse e-mail en texte simple, près du haut de la page.",
    movePhone: "Sors ton numéro de téléphone de l’en-tête et mets-le dans le texte principal.",
    addPhone: "Ajoute ton numéro de téléphone à côté de ton e-mail.",
    moveContact: "Mets tes coordonnées dans le corps de la page.",
    addExperience:
      "Si tu as eu des emplois ou des stages, liste-les sous un titre « Expérience ».",
    nameExperience: "Mets tes emplois sous un titre clair, comme « Expérience ».",
    addSkillsAndEducation: "Ajoute de courtes sections « Compétences » et « Formation ».",
    addSkills: "Ajoute une section « Compétences » avec les outils que tu utilises.",
    addEducation: "Ajoute une section « Formation », même d’une seule ligne.",
    oneColumn: "Passe à une mise en page sur une seule colonne.",
    noTables: "Remplace les tableaux par de simples lignes de texte.",
    noTextBoxes: "Sors le texte des zones de texte et mets-le dans la page principale.",
    noImages: "Retire les images, ou répète ce qui compte en texte simple.",
    noIcons: "Remplace les icônes par des mots comme « E-mail » et « Téléphone ».",
    addDates: "Ajoute des dates de début et de fin à chaque emploi, comme « janv. 2021 - mars 2023 ».",
    oneDateStyle: "Écris toutes les dates de la même façon, comme « {main} ».",
    addLines: "Ajoute quelques puces sur ce que tu as fait à chaque poste.",
    trim: "Raccourcis les postes anciens ou moins utiles pour tenir sur deux pages.",
    bullets: "Découpe chaque emploi en 3 à 5 puces courtes qui commencent par un verbe.",
  },
  units: {
    pages: { one: "{count} page", other: "{count} pages" },
    words: { one: "{count} mot", other: "{count} mots" },
  },
  sections: {
    summary: "Résumé",
    experience: "Expérience",
    projects: "Projets",
    education: "Formation",
    skills: "Compétences",
    certifications: "Certifications",
  },
} satisfies Translation<Messages["fileChecks"]>;
