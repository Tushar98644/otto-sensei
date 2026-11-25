import type { Messages } from "..";
import type { Translation } from "../../types";

// Privacy policy, terms, refund policy and acceptable use, in French; the English version governs.
export default {
  page: {
    contents: "Sommaire",
    lastUpdated: "Dernière mise à jour :",
    shortVersion: "En bref",
    englishGoverns:
      "Cette page est une traduction. En cas de différence avec la <link>version anglaise</link>, c'est la version anglaise qui s'applique.",
  },
  disclosure:
    "Notre processus de commande est assuré par notre revendeur en ligne {merchant}, marchand officiel (merchant of record) de toutes nos commandes. {merchant} gère le paiement, les reçus, la taxe sur les ventes ou la TVA, les remboursements et l'assistance à la facturation.",
  privacy: {
    meta: {
      title: "Politique de confidentialité : où ton CV est stocké",
      description:
        "Ce que {brand} collecte, où ton CV est stocké et qui d'autre le traite, en termes simples. Pas de publicité, pas de cookies de suivi, aucune vente de tes données.",
    },
    title: "Politique de confidentialité",
    intro:
      "{brand} t'aide à vérifier et à améliorer ton CV. Cette page explique ce que nous collectons, pourquoi, et qui d'autre y a accès.",
    summary: {
      noSelling:
        "Nous ne vendons pas tes données et ne les partageons pas à des fins publicitaires, et nous n'utilisons ni publicité ni cookies de suivi.",
      browser:
        "Tes CV sont enregistrés dans ton navigateur. Si tu te connectes, nous en gardons aussi une sauvegarde pour que tu puisses les ouvrir sur d'autres appareils.",
      ai: "Chaque fonction d'IA n'envoie que le texte dont elle a besoin, au moment où tu l'utilises. Nous demandons à OpenRouter de n'utiliser que des fournisseurs qui ne s'en servent pas pour entraîner leurs modèles.",
      payments:
        "Les paiements passent par {merchant}. Nous ne voyons jamais ton numéro de carte complet.",
      deleting:
        "Supprimer ton compte efface immédiatement les données de ton compte. Si tu as eu un essai ou payé, seule une empreinte à sens unique de ton adresse e-mail est conservée, pour que chaque personne n'ait droit à l'essai Pro qu'une seule fois.",
    },
    collect: {
      title: "Ce que nous collectons",
      items: {
        email:
          "<b>Ton adresse e-mail,</b> si tu te connectes, soit avec Google, soit avec un code que nous t'envoyons par e-mail. Nous l'utilisons pour te connecter et pour t'envoyer des avis importants concernant ton compte ou ta facturation. Il n'y a pas de mot de passe. Si tu utilises Google, Google transmet aussi ton nom et ta photo de profil à notre fournisseur de connexion ; nous ne les utilisons pas.",
        resumes:
          "<b>Tes CV.</b> Ils sont enregistrés dans le stockage local de ton navigateur, sur ton appareil. Si tu te connectes, nous en gardons aussi une copie de sauvegarde dans notre base de données pour que tu puisses les ouvrir sur d'autres appareils.",
        shareLinks:
          "<b>Les liens de partage.</b> Si tu partages un CV, nous gardons une copie de cette version (sans les lignes masquées ni les notes d'adaptation) pour que toute personne disposant du lien puisse la lire et la télécharger en PDF. Ton e-mail et ton téléphone ne s'affichent que si tu l'actives, et les moteurs de recherche sont priés d'ignorer la page, sauf si tu les y autorises. Nous comptons les vues : pour compter chaque lecteur une seule fois, nous gardons pendant environ deux jours un code brouillé, calculé à partir de son adresse réseau et de son navigateur (pas l'adresse elle-même). Désactiver le lien supprime la copie.",
        applications:
          "<b>Les candidatures que tu enregistres.</b> Si tu suis tes candidatures, nous stockons ce que tu saisis (entreprise, intitulé du poste, lien de l'offre, date, statut et notes) et le CV que tu as envoyé, pour que tu puisses voir ton propre taux d'entretien. Si tu crées un dossier de préparation aux entretiens pour l'une d'elles, nous l'enregistrons avec cette candidature. Personne d'autre n'y a accès.",
        jobEmails:
          "<b>Les e-mails de candidature que tu transfères à Otto.</b> Si tu actives le suivi par e-mail, tu choisis un identifiant pour une adresse privée, et les e-mails que ton filtre Gmail y transfère passent par Cloudflare, qui nous remet chacun d'eux sous forme de texte, avec le résultat de ses vérifications de signature. Nous le lisons avec des règles fixes, sans IA, et ne gardons que le domaine de l'expéditeur, l'objet, le type de mise à jour, l'entreprise, l'intitulé du poste, le lien de l'offre et la date d'entretien que nous y avons lus, ainsi que ce que nous avons modifié sur ton tableau ou te demandons de vérifier. Nous gardons aussi tes identifiants et l'adresse Gmail dont tu confirmes qu'elle y transfère tes e-mails. Le reste de l'e-mail, ses pièces jointes et ses en-têtes sont supprimés dès qu'il a été lu ; ni Cloudflare ni nous n'en gardons de copie. Ces données sont supprimées au bout de six mois ou quand tu supprimes ton compte, et figurent dans ton export de données. Un identifiant que tu changes ou désactives ne peut être pris par personne d'autre pendant 90 jours.",
        letters:
          "<b>Les lettres et messages que tu gardes.</b> Quand tu rédiges une lettre de motivation, une réponse de candidature ou un message de prise de contact depuis ton compte, nous l'enregistrons avec l'entreprise, l'intitulé du poste et le lien de l'offre concernés, ainsi que le titre du CV dont il est issu, pour que tu puisses le retrouver dans Lettres et messages. Les modifications que tu apportes à un message de prise de contact sont enregistrées au fil de ta saisie. Otto ne recherche personne, mais ce que tu tapes dans un message, comme le nom de la personne à qui tu écris, est enregistré avec lui. Quand tu en supprimes un, il est supprimé. Personne d'autre n'y a accès.",
        reminders:
          "<b>Les rappels.</b> Quand tu indiques avoir postulé à une offre, nous stockons une date de relance (7 jours plus tard, sauf si tu choisis un autre nombre). À cette date, nous ajoutons une notification à la cloche de ton tableau de bord ; Otto n'envoie pas de rappels par e-mail. Nous stockons la notification, si tu l'as lue, la date et tes réglages de rappel. Les notifications lues sont supprimées au bout de 90 jours, les non lues au bout d'un an.",
        matches:
          "<b>Les nouvelles offres compatibles.</b> Une fois par semaine, Otto cherche de nouvelles offres qui correspondent à ton CV et ajoute à la cloche une notification indiquant combien il y en a. Nous stockons la date de la dernière notification et celle de notre dernière recherche ; cette recherche utilise ton CV et ton profil professionnel comme le fait l'onglet Emplois, et exclut les offres que tu as enregistrées ou auxquelles tu as postulé. Otto n'envoie plus l'e-mail hebdomadaire d'offres, ni les e-mails de conseils ou de vues. Nous gardons les choix d'e-mails que tu as faits auparavant et la trace des conseils que nous t'avons envoyés et de leur date (jamais le texte de l'e-mail), mais ils n'ont plus aucun effet. Les e-mails envoyés auparavant contiennent toujours un lien de désinscription en un clic qui fonctionne.",
        careerLog:
          "<b>Ton journal de carrière.</b> Si tu en tiens un, nous stockons le texte que tu écris pour chaque mois (ce que tu as livré, les chiffres éventuels, ce que tu as appris ou dirigé, ou le fait que rien n'était nouveau) et tes réglages de point mensuel : le jour, ton fuseau horaire, et s'il est activé ou en pause. Si tu utilises le micro, l'enregistrement est converti en texte puis supprimé ; seul le texte est conservé. Avec le point mensuel activé, Otto ajoute une notification à la cloche et à l'Accueil le jour choisi et envoie un e-mail par mois, que tu peux désactiver en un clic. C'est gratuit avec tous les forfaits. Tu peux modifier ou supprimer n'importe quel mois ; le journal figure dans ton export de données et il est supprimé avec ton compte.",
        week: "<b>Ta semaine avec Otto.</b> Pour afficher ton récap hebdomadaire, nous gardons les jours où ton compte a ouvert l'application (la date uniquement, jamais l'heure ni la page) et une copie du récap de chaque semaine, qui inclut les noms d'entreprises et de postes issus de tes propres candidatures et offres enregistrées. Nous gardons les deux pendant environ 10 semaines. Les jours ne sont enregistrés que là où les événements d'utilisation sont autorisés : si ton navigateur envoie Do Not Track ou Global Privacy Control, nous ne les enregistrons pas, et le récap ne compte que ce que tu as enregistré dans Otto. Les deux figurent dans ton export de données et sont supprimés avec ton compte.",
        workProfile:
          "<b>Ton profil professionnel.</b> Si tu le remplis, nous stockons le pays où tu vis, ton fuseau horaire, les pays où tu peux travailler sans visa parrainé, si tu veux un emploi à temps plein ou des missions en contrat, et si tu ne veux que des postes en télétravail. Otto compare les offres d'emploi à ce profil dans ton navigateur, et sur notre serveur pour classer l'onglet Emplois. Personne d'autre n'y a accès.",
        writingStyle:
          "<b>Ton style d'écriture.</b> Si tu en définis un, nous stockons le ton, la longueur, l'orthographe et la formule de politesse que tu choisis, ainsi que les notes que tu écris pour Otto. Ils façonnent tes lettres de motivation, tes réponses de candidature et tes messages de prise de contact. Personne d'autre n'y a accès.",
        jobs: "<b>Les offres que tu compares et enregistres.</b> Pour classer les offres ouvertes pour toi, ton navigateur envoie les compétences, les intitulés de poste et les années d'expérience qu'il lit dans ton CV, jamais le CV lui-même ni tes coordonnées. Nous les utilisons pour cette seule requête, sans les stocker ni les envoyer à une IA. Si tu enregistres une offre, nous stockons laquelle et quand. Les offres elles-mêmes proviennent des pages carrières publiques et des flux d'offres publics des entreprises, chacune avec un lien vers l'annonce d'origine.",
        jobsNear:
          "<b>Offres près de toi et la carte.</b> Si tu cherches des offres près de ta position, ton navigateur te le demande d'abord, puis nous envoie ta position arrondie à environ 1 km pour cette seule recherche. Nous ne la gardons pas : elle n'est ni liée à ton compte, ni dans nos journaux, ni dans les listes enregistrées du jour. La ville que tu choisis pour chercher autour, et tes autres filtres, sont retenus dans ton navigateur seulement. Ce qu'une fiche d'offre dit de l'entreprise (combien d'offres elle a ouvertes, où se trouvent la plupart, si elle recrute en ce moment) vient des offres d'emploi publiques, pas de toi.",
        files:
          "<b>Les fichiers que tu importes.</b> Nous les lisons en mémoire pour en extraire le texte et lancer les vérifications. Nous ne stockons pas les fichiers.",
        usage:
          "<b>Les compteurs d'utilisation.</b> Pour les utilisateurs connectés, le nombre de corrections de ligne, de versions adaptées, de lettres de motivation et de réponses utilisées ce mois-ci (ou pendant ton essai), plus tout bonus obtenu grâce à une invitation, pour que les limites des forfaits fonctionnent.",
        billing:
          "<b>L'état de ton forfait et de ta facturation.</b> Si tu t'abonnes ou démarres un essai, nous stockons ton forfait et les détails d'abonnement que {merchant} nous envoie, par exemple s'il est actif, quand ton essai se termine et quand il se renouvelle. Nous ne voyons jamais ton numéro de carte complet.",
        trial:
          "<b>La trace des essais.</b> Pour que chaque personne n'ait droit à l'essai Pro qu'une seule fois, nous gardons une empreinte à sens unique (un hachage SHA-256) de l'adresse e-mail de toute personne ayant démarré un essai ou payé. Elle ne peut pas être reconvertie en adresse e-mail, et nous la gardons après la suppression de ton compte, uniquement pour vérifier si cette adresse a déjà bénéficié d'un essai.",
        feedback:
          "<b>Les retours que tu envoies.</b> Ta note, qu'il s'agisse d'un problème ou d'une idée, et la page depuis laquelle tu l'as envoyée. Si ta session est ouverte, elle est liée à ton compte.",
        invites:
          "<b>Les invitations.</b> Ton code d'invitation, quel compte s'est inscrit via le lien de qui, et les identifiants du cookie d'appareil (voir plus bas) des navigateurs utilisés, pour que personne ne puisse s'inviter soi-même. Les personnes qui invitent ne voient que des nombres, jamais qui s'est inscrit. Une fois que tu as un lien d'invitation, le lien « Made with Otto Sensei » en bas de tes liens de partage contient ton code d'invitation, pour que les personnes qui s'inscrivent depuis ce lien comptent comme tes invitations. Le code seul ne dit pas qui tu es.",
        abuse:
          "<b>Les compteurs anti-abus.</b> Pour empêcher les abus, nous comptons les requêtes par adresse IP, par appareil et par adresse e-mail sur de courtes périodes. Ces compteurs sont supprimés au bout d'environ deux jours.",
        logs: "<b>Les journaux techniques.</b> Nos serveurs enregistrent des événements comme les erreurs. Les journaux n'incluent jamais le texte de ton CV, et les adresses e-mail y sont masquées.",
        events:
          "<b>Les événements d'utilisation.</b> Les pages que les gens ouvrent et les étapes qu'ils franchissent, comme importer un CV, télécharger un PDF ou passer à un forfait supérieur, avec des comptes simples comme le nombre de vérifications échouées. Pour une page, il s'agit du type de page (jamais l'adresse d'un lien de partage ou d'un portfolio), du nom du site d'où tu viens, des éventuelles balises de campagne du lien, du type d'appareil (téléphone, tablette ou ordinateur), du temps passé sur la page et, pour certaines visites, de la vitesse de chargement de la page. Ils n'incluent jamais le texte de ton CV, les offres d'emploi, ton nom ni ton adresse e-mail. Si ta session est ouverte, ils sont liés à l'identifiant aléatoire de ton compte. Si ton navigateur envoie Do Not Track ou Global Privacy Control, nous n'en envoyons aucun.",
      },
    },
    ai: {
      title: "Comment Otto utilise l'IA",
      intro:
        "Otto utilise des modèles d'IA (par défaut GLM de Z.ai) via OpenRouter. Chaque fonction n'envoie que le texte dont elle a besoin, et seulement quand tu l'utilises :",
      items: {
        importing: "<b>Importer un CV :</b> le texte du fichier, pour le répartir en sections.",
        fixing:
          "<b>Corriger une ligne :</b> la ligne, l'intitulé du poste et l'entreprise associés, et tes réponses aux questions d'Otto.",
        summary:
          "<b>Rédiger ton résumé de profil :</b> ton CV sans tes coordonnées, ou seulement le résumé que tu as demandé à Otto de resserrer.",
        tailoring:
          "<b>Adaptation, lettres de motivation, messages de prise de contact et réponses de candidature :</b> ton CV, l'offre d'emploi, la question s'il s'agit d'une réponse, et ton style d'écriture si tu en as défini un (les coordonnées éventuelles dans tes notes étant remplacées par des marqueurs).",
        prep: "<b>Préparation aux entretiens :</b> ton CV et l'offre d'emploi.",
        build:
          "<b>« Créer avec Otto » :</b> le poste que tu vises et ce que tu as écrit sur chacun de tes postes, jamais ton nom.",
        github:
          "<b>Importer depuis GitHub :</b> la description, le README et le texte des pull requests des dépôts et pull requests que tu choisis.",
      },
      notes: {
        placeholders:
          "Avant que quoi que ce soit ne parte vers l'IA, Otto remplace ton nom, ton e-mail, ton numéro de téléphone et tes liens par des marqueurs, puis les remet en place ensuite. Il les repère grâce à leurs formats habituels, donc un format inhabituel peut passer au travers. OpenRouter transmet le texte au fournisseur du modèle et renvoie le résultat. Nous demandons à OpenRouter de n'utiliser que des fournisseurs qui ne s'entraînent pas sur ces données. Les fournisseurs peuvent les conserver pendant une durée limitée selon leurs propres politiques, par exemple pour détecter les abus.",
        safety:
          "<b>Contrôles de sécurité :</b> le texte qu'écrit Otto, ainsi que le texte des pages que tu publies (ton portfolio et tes liens de partage de CV), est vérifié par un modèle de sécurité via OpenRouter, avec la collecte de données désactivée, pour bloquer les contenus sexuels ou explicites.",
        noAi: "Les vérifications de la vue recruteur, l'éditeur et les téléchargements PDF n'utilisent pas l'IA. Les vérifications de lignes et les PDF sont générés directement dans ton navigateur.",
        inBrowser:
          "Un export de données LinkedIn ou un fichier JSON Resume que tu importes est lu dans ton navigateur et n'est jamais envoyé. La vérification d'éligibilité des offres d'emploi se fait aussi dans ton navigateur, sans IA.",
        voice:
          "<b>Dictée vocale :</b> quand tu appuies sur un bouton micro, ton navigateur n'écoute que tant qu'il est activé. Dans Chrome, Edge et Safari, le service vocal du navigateur lui-même (Google dans Chrome, Microsoft dans Edge, Apple dans Safari) transforme ta voix en texte, selon la politique de confidentialité de cette entreprise. Dans les autres navigateurs, ou quand ce service n'est pas disponible, le navigateur enregistre un extrait audio qui est envoyé à notre fournisseur de transcription via OpenRouter, avec la collecte de données désactivée. Nous ne stockons jamais l'audio, seulement le texte que tu gardes.",
        github:
          "« Importer depuis GitHub » ne lit que des données publiques de GitHub (tes dépôts et tes pull requests fusionnées) à partir du nom d'utilisateur que tu saisis, sans ta connexion GitHub. Rien n'est ajouté à ton CV tant que tu n'as pas confirmé. Nous ne stockons pas les données GitHub : un serveur les garde en mémoire pendant une heure au maximum, pour qu'un deuxième coup d'œil n'ait pas à réinterroger GitHub.",
      },
    },
    chrome: {
      title: "Otto pour Chrome",
      intro:
        "L'extension Chrome montre comment ton CV correspond à une offre d'emploi, sur la page où tu la lis. Voici comment elle fonctionne :",
      items: {
        reads:
          "<b>Ce qu'elle lit :</b> l'intitulé, l'entreprise, le lieu et le texte d'une offre d'emploi. Elle ne fonctionne que sur les offres d'emploi de LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday, SmartRecruiters et Workable, et sur toute autre page uniquement quand tu appuies sur son bouton dans la barre d'outils. Elle ne lit pas les autres pages ni ton historique de navigation, et n'envoie jamais de candidature à ta place.",
        fill: "<b>Remplir avec Otto (Pro) :</b> quand tu appuies dessus sur un formulaire de candidature Greenhouse, Lever, Ashby ou Workday, l'extension récupère depuis ton compte ton nom, ton e-mail, ton téléphone, ton lieu de résidence, tes liens, ton parcours professionnel, ta formation et tes réponses enregistrées, les insère dans ce formulaire et joint le PDF de ton CV ; elle ne les conserve pas. Elle ne répond jamais aux questions d'auto-identification ou de consentement et n'envoie jamais le formulaire. Rédiger avec Otto nous envoie la question concernée et l'offre d'emploi. Après l'envoi d'un formulaire qu'elle a rempli, elle ajoute la candidature à ton tableau avec le lien, l'intitulé et l'entreprise de l'offre.",
        device:
          "<b>La comparaison se fait sur ton appareil.</b> L'extension garde une copie de ce dont la comparaison a besoin dans l'espace de stockage de Chrome réservé aux extensions : le texte de tes CV sans ton nom, ton e-mail, ton téléphone et tes liens, ton profil professionnel, les lieux où tu cherches du travail et les offres que tu as enregistrées. Elle actualise cette copie toutes les quelques heures. Vérifier une offre ne nous envoie rien.",
        save: "<b>Enregistrer :</b> quand tu appuies sur Enregistrer, l'extension nous envoie le lien, l'intitulé, l'entreprise, le lieu et le texte de cette offre. Nous les gardons avec ton compte, pour que l'offre t'attende sur ton tableau et qu'Otto puisse encore lire l'annonce si elle est retirée.",
        tailor:
          "<b>Adapter et Lettre</b> ouvrent {brand} dans un nouvel onglet avec l'offre enregistrée, et fonctionnent comme les fonctions d'IA décrites plus haut.",
        connecting:
          "<b>Connexion :</b> l'extension détient une clé aléatoire pour ton compte. Nous n'en gardons qu'une empreinte à sens unique, avec sa date de création et de dernière utilisation. Elle cesse de fonctionner après 90 jours sans utilisation, quand tu appuies sur Déconnecter sur la page de ton compte ou dans l'extension, ou quand tu supprimes ton compte.",
      },
      outro: "L'extension n'affiche aucune publicité et n'envoie aucun événement d'utilisation.",
    },
    payments: {
      title: "Paiements",
      checkout:
        "{disclosure} Le paiement se fait sur le site de {merchant}, pas sur le nôtre. Là-bas, {merchant} collecte tes informations de paiement et ton adresse de facturation (y compris pour l'essai, afin que le forfait puisse démarrer à sa fin) selon sa propre <link>politique de confidentialité</link>.",
      items: {
        send: "<b>Ce que nous envoyons à {merchant} :</b> quand tu lances un paiement, l'adresse e-mail de ton compte, notre identifiant aléatoire pour ton compte et le forfait choisi, pour que le paiement soit lié à ton compte. Quand tu lances un paiement ou supprimes ton compte, nous recherchons aussi cette adresse e-mail chez {merchant}, pour qu'on ne te facture jamais un deuxième abonnement et que chacun soit bien annulé.",
        receive:
          "<b>Ce que {merchant} nous envoie :</b> le forfait et le statut de ton abonnement, sa période de facturation, la date de son renouvellement ou de la fin de ton essai, une éventuelle annulation en attente, et les identifiants que {merchant} utilise pour toi, ton abonnement et tes paiements. Ses notifications contiennent aussi le nom, l'e-mail et l'adresse de facturation de la commande, ainsi que le réseau de la carte et ses quatre derniers chiffres. Nous n'utilisons cet e-mail que pour rattacher un paiement à ton compte, et nous ne stockons aucune de ces informations. {merchant} ne nous envoie jamais ton numéro de carte complet.",
      },
    },
    cookies: {
      title: "Cookies et stockage local",
      intro: "Nous n'utilisons que ce dont l'application a besoin pour fonctionner :",
      items: {
        signIn:
          "<b>Les cookies de connexion</b> maintiennent ta session ouverte. Ils se renouvellent pendant que tu utilises l'application et sont supprimés quand tu te déconnectes.",
        device:
          "<b>Un cookie d'appareil</b> contient un identifiant aléatoire qui limite les imports et vérifications gratuits par appareil. Il n'est lié ni à ton nom ni à ton e-mail, et dure un an.",
        invite:
          "<b>Un cookie d'invitation</b> conserve le code d'invitation d'un ami pendant 30 jours après l'ouverture de son lien, pour que l'invitation compte même si tu t'inscris plus tard. Il est supprimé une fois l'invitation réglée.",
        language:
          "<b>Un cookie de langue</b> mémorise la langue que tu as choisie pour l'application. Il ne contient que ce choix et dure un an.",
        localStorage:
          "<b>Le stockage local</b> (qui n'est pas un cookie) garde sur ton appareil tes CV, ta progression et les visites guidées que tu as vues, jusqu'à ce que tu les supprimes ou effaces les données de ton navigateur.",
        checkout:
          "<b>Le paiement {merchant}</b> se fait sur son propre site, qui peut y déposer ses propres cookies pour traiter le paiement et prévenir la fraude, selon la <link>politique de confidentialité</link> de {merchant}. Notre site ne dépose aucun cookie de paiement.",
      },
      outro:
        "Nous n'utilisons ni publicité ni cookies de suivi. Pour les événements d'utilisation décrits plus haut, un identifiant aléatoire est conservé dans le stockage local pour que tes étapes puissent être comptées ensemble, d'une visite à l'autre. Il n'est lié ni à ton nom ni à ton e-mail, et effacer les données de ton navigateur le supprime.",
    },
    sharing: {
      title: "Avec qui nous partageons des données",
      intro:
        "Nous ne vendons pas tes données et ne les partageons pas à des fins publicitaires. Nous faisons appel uniquement à ces prestataires pour faire fonctionner {brand} :",
      items: {
        openRouter:
          "<b>OpenRouter</b> et le fournisseur de modèle d'IA vers lequel il redirige traitent le texte des CV pour les fonctions d'IA décrites plus haut.",
        merchant:
          "<b>{merchant}</b> traite les paiements en tant que marchand officiel et revendeur en ligne.",
        supabase:
          "<b>Supabase</b> héberge notre base de données et gère la connexion, y compris tes sessions de connexion.",
        resend:
          "<b>Resend</b> envoie nos codes de connexion et nos avis concernant ton compte, comme la fin d'un essai.",
        google: "<b>Google</b>, uniquement si tu choisis de te connecter avec ton compte Google.",
        github:
          "<b>GitHub</b> reçoit le nom d'utilisateur que tu recherches, uniquement si tu utilises Importer depuis GitHub.",
        vercel: "<b>Vercel</b> héberge l'application elle-même.",
        cloudflare:
          "<b>Cloudflare</b> reçoit les e-mails de candidature que tu transfères à ton adresse Otto et nous les transmet, uniquement si tu actives le suivi par e-mail.",
        sentry:
          "<b>Sentry</b> reçoit des rapports d'erreur quand quelque chose ne fonctionne plus, après suppression des adresses e-mail, des numéros de téléphone et du texte des CV.",
        posthog:
          "<b>PostHog</b> reçoit les événements d'utilisation décrits plus haut, pour que nous puissions voir quelles étapes aident et où les gens bloquent.",
        openFreeMap:
          "<b>OpenFreeMap</b> fournit les tuiles de la carte quand tu ouvres la carte des offres, donc il reçoit ton adresse IP et les zones que tu regardes, y compris la zone autour de toi si tu utilises « Aller à ma position ». Nous ne lui envoyons rien d'autre.",
      },
      outro:
        "Ces prestataires peuvent traiter des données en dehors de ton pays, y compris aux États-Unis. Nous pouvons aussi partager des informations si la loi l'exige.",
    },
    retention: {
      title: "Combien de temps nous gardons les données",
      items: {
        account:
          "Données du compte, sauvegardes de CV, candidatures enregistrées, préparations aux entretiens, profil professionnel et style d'écriture : jusqu'à ce que tu les supprimes ou supprimes ton compte.",
        shareLinks:
          "Liens de partage : jusqu'à ce que tu désactives le lien ou supprimes ton compte.",
        savedJobs:
          "Offres enregistrées : jusqu'à ce que tu les retires, ou 30 jours après la clôture de l'offre.",
        chromeJobs:
          "Offres enregistrées depuis Otto pour Chrome : jusqu'à ce que tu les retires ou supprimes ton compte.",
        chromeKey:
          "La clé de l'extension Chrome : jusqu'à ce que tu la déconnectes, ou 90 jours après sa dernière utilisation.",
        reminders:
          "Notifications de rappel : 90 jours une fois lues, un an si elles ne sont jamais lues.",
        recaps:
          "Les jours où tu as ouvert l'application et tes récaps hebdomadaires : environ 10 semaines, ou jusqu'à ce que tu supprimes ton compte.",
        codes:
          "Codes de connexion : ils ne fonctionnent qu'une fois et expirent au bout de 10 minutes.",
        feedback:
          "Retours et données d'invitation : jusqu'à la suppression de ton compte. Les retours envoyés hors connexion ne sont liés à aucun compte.",
        abuse: "Compteurs anti-abus : environ deux jours.",
        uploads: "Fichiers importés : pas conservés du tout.",
        emailChoices:
          "Tes choix d'e-mails et la trace des conseils que nous t'avons envoyés : jusqu'à ce que tu supprimes ton compte.",
        trialEnd:
          "Une copie de la date de fin de ton essai : 30 jours après la fin de l'essai, ou jusqu'à ce que tu désactives les conseils.",
        letters:
          "Lettres, réponses et messages de prise de contact que tu gardes : jusqu'à ce que tu les supprimes ou supprimes ton compte.",
      },
    },
    choices: {
      title: "Tes choix",
      items: {
        resumes:
          "Supprime n'importe quel CV dans le studio quand tu veux. Sa sauvegarde disparaît immédiatement ; la copie dans ce navigateur attend dans Supprimés récemment pendant 30 jours, ou jusqu'à ce que tu te déconnectes ou vides cette liste.",
        account:
          "Supprime ton compte depuis la <link>page de ton compte</link>. Cela supprime immédiatement ton e-mail, ta trace de connexion, tes sauvegardes de CV, tes candidatures enregistrées et leurs préparations, ton profil professionnel, ton style d'écriture, tes lettres et messages, tes offres enregistrées, la connexion de l'extension Chrome, tes liens de partage, tes rappels et tes choix d'e-mails, tes données d'invitation, tes retours et tes données d'utilisation, et te déconnecte sur tous tes appareils. Supprimer ton compte annule immédiatement ton forfait payant ou ton essai, et on ne te prélèvera plus rien. Seule l'empreinte d'essai mentionnée plus haut est conservée.",
        data: "Demande-nous une copie de tes données, ou leur correction ou suppression, en écrivant à <link>{email}</link>. Tu peux aussi déposer une plainte auprès de l'autorité de protection des données de ton pays.",
      },
    },
    children: {
      title: "Enfants",
      body: "{brand} n'est pas destiné aux moins de 16 ans, et nous ne collectons pas sciemment leurs données.",
    },
    changes: {
      title: "Modifications de cette politique",
      body: "Si nous modifions cette politique, nous mettrons à jour la date en haut de la page. Si une modification change la façon dont nous utilisons tes données, nous préviendrons par e-mail les personnes inscrites avant son entrée en vigueur.",
    },
    contact: {
      title: "Nous contacter",
      body: "Des questions sur la confidentialité ? Écris à <link>{email}</link>.",
    },
  },
  terms: {
    meta: {
      title: "Conditions d'utilisation : forfaits, limites et résiliation",
      description:
        "Les règles d'utilisation de {brand}, en termes simples : ton contenu reste à toi, ce que comprend et coûte chaque forfait, ses limites mensuelles et comment annuler.",
    },
    title: "Conditions d'utilisation",
    intro:
      "Ces conditions constituent l'accord entre toi et {brand} quand tu utilises ce site. En l'utilisant, tu les acceptes. Nous les avons volontairement voulues courtes et simples.",
    summary: {
      yours: "Tes CV et tout ce que tu écris ou importes restent à toi.",
      guidance:
        "Les vérifications et suggestions d'Otto sont des conseils, pas la garantie d'un entretien ou d'un emploi.",
      price:
        "Pro coûte {month} par mois ou {year} par an. Les nouveaux comptes peuvent l'essayer pendant {days} jours pour {trialPrice}, une fois par personne.",
      cancel:
        "Annule à tout moment depuis la page de ton compte, et tu gardes ton forfait jusqu'à la fin de la période payée.",
      kept: "Si un forfait payant prend fin, rien de ce que tu as créé n'est supprimé.",
    },
    who: {
      title: "Qui nous sommes",
      body: "{brand} est l'entreprise qui gère ce site et vend ses forfaits, et la partie avec laquelle tu conclus ces conditions. Tu peux nous joindre à <link>{email}</link>.",
    },
    service: {
      title: "Le service",
      asIs: "{brand} te permet de vérifier, modifier et adapter ton CV, et de le télécharger en PDF. Nous le fournissons tel quel. Nous faisons tout pour qu'il reste exact et en ligne, mais nous ne pouvons pas promettre qu'il sera toujours exempt d'erreurs ou disponible.",
      guidance:
        "Les vérifications et suggestions d'Otto sont des conseils, pas une garantie. Les logiciels de recrutement diffèrent d'un employeur à l'autre, et aucun outil ne peut te promettre un entretien ou un emploi. C'est toi qui décides de ce qui figure sur ton CV, alors lis chaque suggestion avant de la garder.",
    },
    account: {
      title: "Ton compte",
      body: "Tu te connectes avec un code envoyé à ton adresse e-mail. Protège bien ton compte e-mail, car toute personne qui peut le lire peut se connecter à ta place. Tu dois avoir au moins 16 ans pour utiliser {brand}.",
    },
    content: {
      title: "Ton contenu t'appartient",
      yours:
        "Tes CV et tout ce que tu écris ou importes restent à toi. Tu nous autorises à les stocker et à les traiter uniquement pour faire fonctionner le service pour toi, par exemple pour vérifier un fichier, sauvegarder tes CV ou envoyer du texte à notre fournisseur d'IA quand tu demandes de l'aide à Otto. Notre <link>politique de confidentialité</link> explique comment.",
      rights: "N'importe que du contenu que tu as le droit d'utiliser.",
    },
    misuse: {
      title: "Pas d'usage abusif",
      items: {
        limits:
          "N'essaie pas de casser, de surcharger ou de contourner le service ou ses limites, par exemple avec des scripts, des bots ou de multiples comptes.",
        copy: "Ne copie pas le service, ne le revends pas et n'en extrais pas les données par scraping.",
        harmful:
          "N'importe rien d'illégal ou de nuisible, ni les données privées de quelqu'un d'autre.",
        pretend: "Ne l'utilise pas pour te faire passer pour quelqu'un d'autre.",
      },
      outro: "Nous pouvons suspendre ou fermer les comptes qui enfreignent ces règles.",
    },
    ai: {
      title: "Les outils de rédaction par IA",
      intro:
        "Les outils d'IA (corrections de ligne, adaptation, résumés de profil, lettres de motivation, messages de prise de contact, réponses aux questions de candidature, préparation aux entretiens et Créer avec Otto) servent uniquement à rédiger des textes liés à la recherche d'emploi.",
      items: {
        explicit:
          "Ne les utilise pas pour créer du contenu sexuel, sexuellement explicite ou tout autre contenu NSFW (not safe for work, inapproprié au travail), de quelque nature que ce soit.",
        hateful:
          "Ne les utilise pas pour créer du contenu haineux, harcelant, violent, illégal ou trompeur.",
      },
      outro:
        "L'IA est configurée pour refuser ce type de demandes et exclure ce type de contenu. Des contrôles de sécurité automatiques bloquent aussi le contenu sexuel ou explicite dans ce qu'écrit Otto et sur les pages que tu publies. Nous pouvons supprimer le contenu qui enfreint cette règle et suspendre ou fermer le compte qui l'a demandé. Notre <link>politique d'utilisation acceptable</link> donne la liste complète.",
    },
    plans: {
      title: "Les forfaits et leurs limites",
      includes: {
        title: "Ce que comprend chaque forfait",
        free: "<b>Free :</b> le lecteur de base pour les imports, la vue recruteur, la modification à la main, {fixes} corrections de ligne par mois avec Otto (l'aide sur le résumé de profil compte pour une), {resumes}, les formats Classic et Compact, les téléchargements PDF, les {matches} offres les plus compatibles et {applications} avec son rappel.",
        paid: "<b>Pro et Max</b> ajoutent plus de corrections de ligne et le reste de l'aide IA d'Otto (adaptation, lettres, réponses, préparation aux entretiens, Créer avec Otto, brouillons GitHub et lecture des imports par IA), les autres formats, les téléchargements Word, toutes les offres compatibles avec filtres et offres enregistrées, les liens de partage, la vérification de l'autorisation de travail et les portfolios. {pro} et l'essai permettent de garder jusqu'à {proResumes} CV et de suivre jusqu'à {proApplications} candidatures ; {max} permet d'en garder jusqu'à {maxResumes} et d'en suivre jusqu'à {maxApplications}. Les versions adaptées comptent comme des CV.",
        ends: "<b>Si un forfait payant prend fin,</b> rien de ce que tu as créé n'est supprimé. Tu peux toujours l'ouvrir, le modifier et le télécharger, et les liens que tu as partagés restent en ligne, mais tu ne peux rien ajouter de plus tant que tu ne reprends pas un forfait supérieur. Passer à un forfait inférieur fonctionne de la même façon : les CV et candidatures au-delà de ses limites restent, et tu peux en ajouter d'autres dès que tu repasses sous ces limites.",
      },
      resumes: { one: "{count} CV", other: "{count} CV" },
      trackedApplications: {
        one: "{count} candidature suivie",
        other: "{count} candidatures suivies",
      },
      resets: {
        title: "Quand les limites se réinitialisent",
        intro:
          "Chaque forfait a une limite pour chaque action qu'Otto effectue avec l'IA, indiquée dans le tableau ci-dessous.",
        items: {
          free: "<b>Free :</b> les corrections de ligne se réinitialisent au début de chaque mois civil (UTC).",
          monthly:
            "<b>Forfaits mensuels :</b> les limites courent d'un renouvellement au suivant et se réinitialisent au renouvellement de ton forfait.",
          yearly:
            "<b>Forfaits annuels :</b> les mêmes limites par mois, réinitialisées le jour du mois où le forfait a commencé. Pendant un mois plus court, elles se réinitialisent son dernier jour : un forfait commencé le 31 se réinitialise le 30 d'un mois de 30 jours.",
          trial:
            "<b>L'essai Pro :</b> ses propres limites, plus basses, pour toute la durée de l'essai.",
          unused: "Les limites non utilisées ne sont pas reportées.",
          invites:
            "<b>Les bonus d'invitation</b> s'ajoutent au mois en cours ou à l'essai. Avec Free, les corrections de ligne supplémentaires comptent pour ce mois civil ; les versions adaptées supplémentaires comptent dès que tu démarres un essai ou passes à un forfait payant ce mois-là, et les bonus non utilisés te suivent quand tu le fais.",
        },
        next: "La page de ton compte indique la date de la prochaine réinitialisation de tes limites.",
      },
      table: {
        eachMonth: "Chaque mois",
        // No-break spaces: on phones the header may break only after the comma.
        trial: "Essai Pro, au total",
        none: "Aucun",
        features: {
          tailor: "Versions adaptées",
          letter:
            "Lettres de motivation, messages de prise de contact, réponses et préparation aux entretiens",
          fix: "Corrections de ligne",
          import: "Lectures par IA d'un CV importé",
          draft: "Brouillons « Créer avec Otto »",
          github: "Brouillons de projets GitHub",
        },
      },
      atLimit: {
        title: "Quand une limite est atteinte",
        pauses:
          "La fonction concernée est mise en pause jusqu'à la réinitialisation de tes limites (avec Free, au début du mois suivant ; avec un forfait mensuel, à ton prochain renouvellement ; avec un forfait annuel, au prochain jour de réinitialisation mensuelle ; pendant l'essai, jusqu'au démarrage de Pro), ou jusqu'à ce que tu passes à un forfait supérieur. Passer de Pro à Max entre deux renouvellements ne réinitialise aucune limite : ce que tu as utilisé ce mois-ci compte sur le nouveau forfait. Les imports ne s'arrêtent jamais : au-delà des lectures par IA, c'est le lecteur de base qui lit ton fichier. La modification, les vérifications de la vue recruteur et les téléchargements PDF n'ont aucune limite, quel que soit le forfait.",
        budget:
          "Chaque forfait payant a aussi un budget IA mensuel ({proTokens} de tokens avec {pro}, {maxTokens} avec {max}, {trialTokens} pendant l'essai) qui couvre une utilisation complète des limites ci-dessus et n'arrête que les usages automatisés ou abusifs.",
        halfMillion: "un demi-million",
      },
      voice: {
        title: "Dictée vocale",
        body: "La dictée vocale est gratuite et illimitée dans les navigateurs dotés d'une reconnaissance vocale intégrée (Chrome, Edge et Safari). Dans les autres navigateurs, comme Brave et Firefox, elle passe par notre service vocal : jusqu'à {freeClips} extraits par jour avec Free, {proClips} avec {pro} et pendant l'essai, et {maxClips} avec {max}, de 2 minutes maximum chacun.",
      },
    },
    payments: {
      title: "Paiements et résiliation",
      prices:
        "Pro coûte {proMonth} par mois ou {proYear} par an. Max coûte {maxMonth} par mois ou {maxYear} par an. Les prix sont en dollars américains, plus les éventuelles taxes de ton pays de résidence.",
      trial:
        "Les nouveaux comptes peuvent bénéficier d'un essai Pro de {days} jours pour {price}, une fois par personne. Tu ajoutes une carte au paiement, et le montant de {price} (plus les éventuelles taxes) est prélevé au début de l'essai. À la fin de l'essai, Pro démarre à {proMonth} par mois, sauf si tu annules avant. Pendant l'essai, un portfolio peut être créé et prévisualisé, mais il n'est mis en ligne qu'avec un forfait payant.",
      merchant: "{disclosure} Ses <link>conditions acheteur</link> s'appliquent aussi à l'achat.",
      renewal:
        "Un forfait payant se renouvelle à chaque période choisie jusqu'à ce que tu annules. Annule à tout moment depuis la <link>page de ton compte</link>, et tu le gardes jusqu'à la fin de la période payée. Tu peux passer de Pro à Max sur la période de facturation que tu as déjà : ton abonnement est modifié directement, donc on ne te facture jamais deux fois, et la différence pour le reste de la période est prélevée immédiatement. Pendant l'essai Pro, tu peux démarrer Max à la place : l'essai se termine aussitôt, le prix complet de Max pour la période choisie (plus les éventuelles taxes) est prélevé immédiatement sur ta carte enregistrée, et le montant de {price} payé pour l'essai n'est pas déduit. Pour passer à Pro, ou entre mensuel et annuel, annule et choisis le nouveau forfait à la fin de ta période en cours. Si tu repasses à Free, ton portfolio publié est mis hors ligne, et ses données sont conservées au cas où tu reviendrais.",
      credit:
        "Un forfait payant {pro} ou {max}, une fois l'éventuel essai terminé, peut ajouter du crédit prépayé, de {min} à {maxUsd} à la fois en dollars entiers, plus les éventuelles taxes. Ce crédit ne paie l'aide IA qu'une fois épuisé le quota mensuel de cette aide, ou le budget IA, aux prix affichés au moment de son utilisation. Le crédit est prépayé et n'est pas remboursable une fois utilisé. Il n'expire pas tant que ton compte existe, ne peut être utilisé qu'avec un forfait payant, et est supprimé quand ton compte est supprimé.",
      failed:
        "Si un paiement échoue au renouvellement de ton forfait ou à la fin de ton essai, tu gardes le forfait quelques jours pendant que le paiement est retenté. S'il échoue encore, ton compte passe à Free jusqu'à ce que tu mettes à jour ta carte depuis la page de ton compte et que le paiement aboutisse.",
      changes:
        "Les prix et les limites peuvent changer. Si le prix ou les limites de ton forfait changent, nous t'enverrons un e-mail avant que le changement ne s'applique à toi, pour que tu puisses annuler avant si tu préfères.",
      refunds:
        "Les demandes de remboursement sont traitées par {merchant} selon ses <link>conditions acheteur</link>. Notre <link>page sur les remboursements</link> explique comment faire une demande.",
    },
    ending: {
      title: "Mettre fin au service",
      body: "Tu peux arrêter d'utiliser {brand} et supprimer ton compte à tout moment. Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions, et nous te dirons pourquoi quand c'est possible. Nous pouvons aussi modifier ou arrêter certaines parties du service au fil du temps.",
    },
    liability: {
      title: "Limitation de notre responsabilité",
      body: "Dans la mesure permise par la loi, {brand} n'est pas responsable des pertes indirectes, comme une opportunité d'emploi manquée ou une perte de revenus. Notre responsabilité totale envers toi est limitée à ce que tu nous as payé au cours des 12 mois précédant la réclamation. Rien dans ces conditions ne limite les droits que te donne la législation sur la protection des consommateurs de ton pays de résidence.",
    },
    changes: {
      title: "Modifications de ces conditions",
      body: "Nous pouvons mettre à jour ces conditions. Dans ce cas, nous changerons la date en haut de la page et, pour les changements importants, nous préviendrons par e-mail les personnes inscrites avant leur entrée en vigueur. Continuer à utiliser {brand} après un changement signifie que tu acceptes les nouvelles conditions.",
    },
    contact: {
      title: "Nous contacter",
      body: "Des questions sur ces conditions ? Écris à <link>{email}</link>.",
    },
  },
  refunds: {
    meta: {
      title: "Politique de remboursement : annuler Pro et Max",
      description:
        "Les remboursements des forfaits Pro et Max sont traités par {merchant}, notre marchand officiel, selon ses conditions acheteur. Annule à tout moment et on ne te prélèvera plus rien.",
    },
    title: "Politique de remboursement",
    intro:
      "{merchant} est notre marchand officiel (merchant of record), et ton relevé bancaire affiche le prélèvement à son nom, commençant par <b>{prefix}</b>. Voici comment fonctionnent les paiements, les remboursements et la résiliation pour Pro et Max.",
    summary: {
      cancel:
        "Annule à tout moment depuis la page de ton compte. Tu gardes ton forfait jusqu'à la fin de la période payée.",
      trial:
        "L'essai Pro de {days} jours coûte {price}, somme prélevée à son démarrage. Annule avant sa fin et tu ne paieras rien de plus.",
      ask: "Pour demander un remboursement, contacte {merchant} via sa <link>page d'aide aux acheteurs</link>, ou <link>écris-nous</link> depuis l'adresse avec laquelle tu te connectes.",
    },
    manageBilling: "Gérer la facturation",
    pay: {
      title: "Qui tu paies",
      receipt:
        "Après chaque paiement, {merchant} t'envoie par e-mail un reçu avec un lien pour télécharger ta facture.",
    },
    refunds: {
      title: "Remboursements",
      body: "Les demandes de remboursement sont traitées par {merchant} selon ses <link>conditions acheteur</link>. Pour en faire une, contacte {merchant} via sa <link>page d'aide aux acheteurs</link>, ou écris-nous depuis l'adresse avec laquelle tu te connectes et nous transmettrons ta demande.",
    },
    cancel: {
      title: "Annule quand tu veux",
      anytime:
        "Annule depuis la <link>page de ton compte</link> quand tu veux. Tu gardes ton forfait jusqu'à la fin de la période payée, puis ton compte passe au forfait Free. Tes CV restent à toi dans tous les cas.",
      trial:
        "L'essai Pro de {days} jours coûte {price}, somme prélevée à son démarrage. Annule avant la fin de l'essai et tu ne paieras rien de plus ; sinon, ton premier paiement Pro est prélevé à sa fin. Si tu démarres Max pendant l'essai, le prix complet de Max est prélevé immédiatement et le montant de {price} payé pour l'essai n'est pas déduit.",
    },
    deleting: {
      title: "Supprimer ton compte",
      body: "Supprimer ton compte annule immédiatement ton forfait payant, et on ne te prélèvera plus rien. Il prend fin à ce moment-là, et non à la fin de la période payée.",
    },
    questions: {
      title: "Questions sur un prélèvement",
      email:
        "Écris à <link>{email}</link> depuis l'adresse avec laquelle tu te connectes. Pour un paiement en lui-même, tu peux aussi contacter {merchant} via sa <link>page d'aide aux acheteurs</link>.",
      rights:
        "Cette politique n'affecte pas les droits que te donne la législation sur la consommation de ton pays de résidence.",
    },
  },
  acceptableUse: {
    meta: {
      title: "Politique d'utilisation acceptable des outils de rédaction par IA",
      description:
        "Ce à quoi peuvent servir {brand} et ses outils de rédaction par IA : uniquement des textes professionnels liés à la recherche d'emploi. Aucun contenu explicite, haineux, illégal ou trompeur.",
    },
    title: "Politique d'utilisation acceptable",
    intro:
      "{brand} aide les gens dans leur recherche d'emploi : vérifier et améliorer leur CV, l'adapter à une offre, rédiger des lettres de motivation et des réponses aux questions de candidature, se préparer aux entretiens, trouver des offres et créer une page portfolio. Cette politique précise à quoi il peut et ne peut pas servir. Elle fait partie de nos <link>conditions d'utilisation</link>.",
    purpose: {
      title: "À quoi servent les outils d'IA",
      body: "Les outils de rédaction par IA rédigent et améliorent des textes de recherche d'emploi à partir de ton propre CV et des offres d'emploi que tu leur fournis. Utilise-les uniquement pour cela.",
    },
    forbidden: {
      title: "Ce qui est interdit",
      items: {
        sexual:
          "Le contenu sexuel, sexuellement explicite ou sexuellement suggestif, ou tout autre contenu NSFW (not safe for work, inapproprié au travail).",
        hateful: "Le contenu haineux, harcelant, menaçant ou violent.",
        illegal: "Le contenu illégal, ou qui aide quelqu'un à enfreindre la loi.",
        deceptive:
          "Le contenu trompeur : fausses qualifications, employeurs ou diplômes inventés, ou le fait de se faire passer pour quelqu'un d'autre.",
        privateData: "Les données privées de quelqu'un d'autre, importées sans son autorisation.",
        limits:
          "Le contournement des protections ou des limites du service, par exemple avec des scripts, des bots ou de multiples comptes.",
      },
    },
    enforcement: {
      title: "Comment nous la faisons respecter",
      body: "L'IA a pour consigne de ne rédiger que des textes professionnels liés à la recherche d'emploi et de refuser ou d'exclure tout ce que cette politique interdit. Des contrôles de sécurité automatiques bloquent aussi le contenu sexuel ou explicite dans ce qu'écrit Otto et sur les pages publiques (portfolios et liens de partage de CV). Nous pouvons supprimer le contenu qui enfreint cette politique, et suspendre ou fermer le compte qui l'a créé.",
    },
    models: {
      title: "L'IA derrière l'outil",
      body: "{brand} est un produit indépendant. Ses fonctions d'IA reposent sur des modèles d'IA tiers, accessibles via OpenRouter. Nous ne sommes ni affiliés aux entreprises qui créent ces modèles, ni soutenus par elles. Notre <link>politique de confidentialité</link> précise quel texte est envoyé et comment il est protégé.",
    },
    report: {
      title: "Signaler un problème",
      body: "Tu as vu quelque chose qui enfreint cette politique ? Écris à <link>{email}</link>. Nous répondons sous 3 jours ouvrés.",
    },
  },
} satisfies Translation<Messages["legal"]>;
