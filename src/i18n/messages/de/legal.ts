import type { Messages } from "..";
import type { Translation } from "../../types";

// Privacy policy, terms, refund policy and acceptable use, in German; the English version governs.
export default {
  page: {
    contents: "Inhalt",
    lastUpdated: "Zuletzt aktualisiert:",
    shortVersion: "Die Kurzfassung",
    englishGoverns:
      "Diese Seite ist eine Übersetzung. Weicht sie von der <link>englischen Fassung</link> ab, gilt die englische Fassung.",
  },
  disclosure:
    "Unser Bestellprozess wird von unserem Online-Wiederverkäufer {merchant} abgewickelt, dem Merchant of Record für alle unsere Bestellungen. {merchant} kümmert sich um Zahlung, Belege, Umsatz- oder Mehrwertsteuer, Erstattungen und Abrechnungssupport.",
  privacy: {
    meta: {
      title: "Datenschutzerklärung: wo dein Lebenslauf gespeichert wird",
      description:
        "Was {brand} erhebt, wo dein Lebenslauf gespeichert wird und wer ihn sonst verarbeitet, in einfachen Worten. Keine Werbung, keine Tracking-Cookies, kein Verkauf deiner Daten.",
    },
    title: "Datenschutzerklärung",
    intro:
      "{brand} hilft dir, deinen Lebenslauf zu prüfen und zu verbessern. Diese Seite erklärt, was wir erheben, warum und wer es sonst sieht.",
    summary: {
      noSelling:
        "Wir verkaufen deine Daten nicht und geben sie nicht für Werbung weiter, und wir nutzen weder Werbung noch Tracking-Cookies.",
      browser:
        "Deine Lebensläufe werden in deinem Browser gespeichert. Wenn du dich anmeldest, speichern wir zusätzlich ein Backup, damit du sie auf anderen Geräten öffnen kannst.",
      ai: "Jede KI-Funktion sendet nur den Text, den sie braucht, und nur, wenn du sie nutzt. Wir weisen OpenRouter an, nur Anbieter zu nutzen, die damit nicht trainieren.",
      payments: "Zahlungen laufen über {merchant}. Deine vollständige Kartennummer sehen wir nie.",
      deleting:
        "Wenn du dein Konto löschst, werden deine Kontodaten sofort entfernt. Wenn du eine Testphase hattest oder bezahlt hast, bleibt nur ein Einweg-Fingerabdruck deiner E-Mail, damit jede Person die Pro-Testphase nur einmal bekommt.",
    },
    collect: {
      title: "Was wir erheben",
      items: {
        email:
          "<b>Deine E-Mail-Adresse,</b> wenn du dich anmeldest, entweder mit Google oder mit einem Code, den wir dir per E-Mail schicken. Wir nutzen sie, um dich anzumelden und dir wichtige Hinweise zu deinem Konto oder deiner Abrechnung zu schicken. Es gibt keine Passwörter. Wenn du Google nutzt, teilt Google außerdem deinen Namen und dein Profilbild mit unserem Anmeldedienst; wir nutzen sie nicht.",
        resumes:
          "<b>Deine Lebensläufe.</b> Sie werden im lokalen Speicher deines Browsers auf deinem Gerät gespeichert. Wenn du dich anmeldest, speichern wir zusätzlich eine Sicherungskopie in unserer Datenbank, damit du sie auf anderen Geräten öffnen kannst.",
        shareLinks:
          "<b>Freigabelinks.</b> Wenn du einen Lebenslauf teilst, speichern wir eine Kopie dieser Version (ohne ausgeblendete Zeilen oder Anpassungsnotizen), damit alle mit dem Link sie lesen und als PDF herunterladen können. Deine E-Mail und Telefonnummer erscheinen nur, wenn du das einschaltest, und Suchmaschinen werden gebeten, die Seite zu überspringen, außer du erlaubst es ihnen. Wir zählen Aufrufe: Um jede lesende Person nur einmal zu zählen, speichern wir etwa zwei Tage lang einen verschleierten Code, der aus ihrer Netzwerkadresse und ihrem Browser gebildet wird (nicht die Adresse selbst). Wenn du den Link abschaltest, wird die Kopie gelöscht.",
        applications:
          "<b>Bewerbungen, die du einträgst.</b> Wenn du Bewerbungen verfolgst, speichern wir, was du eingibst (Unternehmen, Jobtitel, Job-Link, Datum, Status und Notizen) und welchen Lebenslauf du geschickt hast, damit du deine eigene Interviewquote sehen kannst. Wenn du für eine davon ein Vorbereitungspaket für ein Interview erstellst, speichern wir es mit dieser Bewerbung. Niemand sonst sieht das.",
        jobEmails:
          "<b>Jobmails, die du an Otto weiterleitest.</b> Wenn du das Tracking per E-Mail einschaltest, wählst du einen Adressnamen für eine private Adresse, und die E-Mails, die dein Gmail-Filter dorthin weiterleitet, laufen über Cloudflare, das jede davon als Text zusammen mit dem Ergebnis seiner Signaturprüfungen an uns übergibt. Wir lesen sie mit festen Regeln, nicht mit KI, und behalten nur die Domain des Absenders, den Betreff, welche Art von Update es war, das Unternehmen, den Jobtitel, den Job-Link und den Interviewtermin, die wir darin gelesen haben, und was wir auf deinem Board geändert haben oder dich prüfen lassen. Wir speichern außerdem deine Adressnamen und die Gmail-Adresse, von der du bestätigst, dass sie dorthin weiterleitet. Der Rest der E-Mail, ihre Anhänge und ihre Header werden verworfen, sobald sie gelesen ist; weder Cloudflare noch wir behalten eine Kopie. Diese Einträge werden nach sechs Monaten oder beim Löschen deines Kontos gelöscht und sind in deinem Datendownload enthalten. Ein Adressname, den du änderst oder abschaltest, bleibt 90 Tage lang für alle anderen gesperrt.",
        letters:
          "<b>Anschreiben und Nachrichten, die du behältst.</b> Wenn du angemeldet ein Anschreiben, eine Antwort auf eine Bewerbungsfrage oder eine Kontaktnachricht schreibst, speichern wir sie zusammen mit dem Unternehmen, dem Jobtitel und dem Job-Link, für die sie gedacht war, und dem Titel des Lebenslaufs, aus dem sie entstand, damit du sie unter „Anschreiben und Nachrichten“ wiederfindest. Änderungen an einer Kontaktnachricht werden beim Tippen gespeichert. Otto recherchiert keine Personen, aber was du in eine Nachricht tippst, etwa den Namen der Person, an die du schreibst, wird mit ihr gespeichert. Löschst du eine, wird sie gelöscht. Niemand sonst sieht sie.",
        reminders:
          "<b>Erinnerungen.</b> Wenn du einen Job als beworben markierst, speichern wir ein Datum zum Nachfassen (7 Tage später, außer du wählst eine andere Zahl). Wenn es so weit ist, fügen wir der Glocke auf deinem Dashboard eine Benachrichtigung hinzu; Otto verschickt keine Erinnerungen per E-Mail. Wir speichern die Benachrichtigung, ob du sie gelesen hast, das Datum und deine Erinnerungseinstellungen. Gelesene Benachrichtigungen werden nach 90 Tagen gelöscht, ungelesene nach einem Jahr.",
        matches:
          "<b>Neue passende Jobs.</b> Einmal pro Woche sucht Otto nach neuen Jobs, die zu deinem Lebenslauf passen, und fügt der Glocke eine Benachrichtigung hinzu, wie viele es sind. Wir speichern, wann die letzte Benachrichtigung rausging und wann wir zuletzt gesucht haben; dabei werden dein Lebenslauf und dein Arbeitsprofil so genutzt wie im Tab „Jobs“, und Jobs, die du gespeichert hast oder auf die du dich beworben hast, werden ausgelassen. Otto verschickt die wöchentliche Job-E-Mail, Tipp-E-Mails und E-Mails zu Aufrufen nicht mehr. Wir behalten die E-Mail-Einstellungen, die du früher getroffen hast, und den Eintrag, welche Tipps wir dir wann geschickt haben (nie den Text der E-Mail), aber sie bewirken nichts mehr. Früher verschickte E-Mails haben weiterhin einen funktionierenden Abmeldelink mit einem Klick.",
        careerLog:
          "<b>Dein Karrieretagebuch.</b> Wenn du eines führst, speichern wir den Text, den du für jeden Monat schreibst (was du abgeschlossen hast, Zahlen, was du gelernt oder geleitet hast oder dass nichts neu war), und deine Check-in-Einstellungen: den Tag, deine Zeitzone und ob es aktiv oder pausiert ist. Wenn du das Mikrofon nutzt, wird die Aufnahme in Text umgewandelt und verworfen; nur der Text bleibt. Mit aktiviertem Check-in fügt Otto an deinem Tag der Glocke und deiner Startseite eine Benachrichtigung hinzu und schickt eine E-Mail pro Monat, die du mit einem Klick abbestellen kannst. Es ist in jedem Tarif kostenlos. Du kannst jeden Monat bearbeiten oder löschen, es ist in deinem Datendownload enthalten, und es wird mit deinem Konto gelöscht.",
        week: "<b>Deine Woche mit Otto.</b> Für deinen Wochenrückblick speichern wir die Tage, an denen dein Konto die App geöffnet hat (nur das Datum, nie die Uhrzeit oder die Seite), und eine Kopie jedes Wochenrückblicks, die die Namen von Unternehmen und Jobs aus deinen eigenen Bewerbungen und gespeicherten Jobs enthält. Beides behalten wir etwa 10 Wochen. Tage werden nur erfasst, wo Nutzungsereignisse erlaubt sind: Wenn dein Browser Do Not Track oder Global Privacy Control sendet, erfassen wir sie nicht, und der Rückblick zählt nur, was du in Otto gespeichert hast. Beides ist in deinem Datendownload enthalten und wird mit deinem Konto gelöscht.",
        workProfile:
          "<b>Dein Arbeitsprofil.</b> Wenn du es ausfüllst, speichern wir das Land, in dem du lebst, deine Zeitzone, wo du ohne gesponsertes Visum arbeiten darfst, ob du eine Vollzeitstelle oder Arbeit auf Vertragsbasis suchst und ob du nur Remote-Jobs willst. Otto prüft Stellenanzeigen dagegen in deinem Browser und auf unserem Server, wenn er den Tab „Jobs“ sortiert. Niemand sonst sieht es.",
        writingStyle:
          "<b>Dein Schreibstil.</b> Wenn du einen festlegst, speichern wir den Ton, die Länge, die Schreibweise und die Grußformel, die du wählst, und alle Notizen, die du für Otto schreibst. Sie prägen deine Anschreiben, Antworten auf Bewerbungsfragen und Kontaktnachrichten. Niemand sonst sieht sie.",
        jobs: "<b>Jobs, die du abgleichst und speicherst.</b> Um offene Jobs für dich zu sortieren, sendet dein Browser die Fähigkeiten, Jobtitel und Berufsjahre, die er aus deinem Lebenslauf liest, nie den Lebenslauf selbst oder deine Kontaktdaten. Wir nutzen sie nur für diese eine Anfrage und speichern sie weder noch senden wir sie an eine KI. Wenn du einen Job speicherst, speichern wir, welchen und wann. Die Jobs selbst stammen von öffentlichen Karriereseiten und Job-Feeds der Unternehmen, jeweils mit Link zur Originalanzeige.",
        jobsNear:
          "<b>Jobs in deiner Nähe und die Karte.</b> Wenn du Jobs in der Nähe deines Standorts suchst, fragt dich dein Browser zuerst und schickt uns dann deine Position, auf etwa 1 km gerundet, nur für diese eine Suche. Wir speichern sie nicht: Sie wird weder bei deinem Konto noch in unseren Logs noch in den gespeicherten Listen des Tages abgelegt. Eine Stadt, die du für die Umkreissuche wählst, und deine anderen Filter merkt sich nur dein Browser. Was eine Jobkarte über das Unternehmen sagt (wie viele Jobs es offen hat, wo die meisten sind, ob es gerade einstellt), stammt aus den öffentlichen Stellenanzeigen, nicht von dir.",
        files:
          "<b>Dateien, die du hochlädst.</b> Wir lesen sie im Arbeitsspeicher, um den Text herauszuziehen und die Prüfungen durchzuführen. Wir speichern die Dateien nicht.",
        usage:
          "<b>Nutzungszähler.</b> Bei angemeldeten Nutzern, wie viele Zeilenkorrekturen, angepasste Versionen, Anschreiben und Antworten du diesen Monat (oder während deiner Testphase) genutzt hast, plus Extras, die dir eine Einladung eingebracht hat, damit die Tarif-Limits funktionieren.",
        billing:
          "<b>Tarif und Abrechnungsstatus.</b> Wenn du ein Abo abschließt oder eine Testphase startest, speichern wir deinen Tarif und die Abo-Details, die {merchant} uns schickt, etwa ob es aktiv ist, wann deine Testphase endet und wann es sich verlängert. Deine vollständige Kartennummer sehen wir nie.",
        trial:
          "<b>Testphasen-Eintrag.</b> Damit jede Person die Pro-Testphase nur einmal bekommt, speichern wir einen Einweg-Fingerabdruck (einen SHA-256-Hash) der E-Mail aller, die eine Testphase gestartet oder bezahlt haben. Er lässt sich nicht in deine E-Mail zurückverwandeln, und wir behalten ihn auch, nachdem du dein Konto gelöscht hast, nur um zu prüfen, ob diese E-Mail schon eine Testphase hatte.",
        feedback:
          "<b>Feedback, das du schickst.</b> Deine Nachricht, ob es ein Problem oder eine Idee ist, und die Seite, von der du sie geschickt hast. Wenn du angemeldet bist, ist sie mit deinem Konto verknüpft.",
        invites:
          "<b>Einladungen.</b> Dein Einladungscode, welches Konto über wessen Link beigetreten ist, und die Geräte-Cookie-IDs (siehe unten) der verwendeten Browser, damit sich niemand selbst einladen kann. Einladende sehen nur Zahlen, nie, wer beigetreten ist. Sobald du einen Einladungslink hast, enthält der Link „Made with Otto Sensei“ am Fuß deiner Freigabelinks deinen Einladungscode, sodass Leute, die sich darüber registrieren, als deine Einladungen zählen. Der Code allein verrät nicht, wer du bist.",
        abuse:
          "<b>Zähler gegen Missbrauch.</b> Um Missbrauch zu verhindern, zählen wir Anfragen pro IP-Adresse, Gerät und E-Mail-Adresse in kurzen Zeitfenstern. Diese Zähler werden nach etwa zwei Tagen gelöscht.",
        logs: "<b>Technische Logs.</b> Unsere Server protokollieren Ereignisse wie Fehler. Logs enthalten nie den Text deines Lebenslaufs, und E-Mail-Adressen darin sind maskiert.",
        events:
          "<b>Nutzungsereignisse.</b> Welche Seiten Leute öffnen und welche Schritte sie gehen, etwa einen Lebenslauf hochladen, ein PDF herunterladen oder upgraden, mit einfachen Zahlen wie der Anzahl fehlgeschlagener Prüfungen. Bei einer Seite sind das die Art der Seite (nie die Adresse eines Freigabelinks oder Portfolios), der Name der Website, die dich geschickt hat, Kampagnen-Tags im Link, ob du ein Smartphone, Tablet oder einen Computer nutzt, wie lange du auf der Seite warst und, bei manchen Besuchen, wie schnell die Seite geladen hat. Sie enthalten nie den Text deines Lebenslaufs, Stellenanzeigen, deinen Namen oder deine E-Mail-Adresse. Wenn du angemeldet bist, sind sie mit der zufälligen ID deines Kontos verknüpft. Wenn dein Browser Do Not Track oder Global Privacy Control sendet, senden wir überhaupt keine.",
      },
    },
    ai: {
      title: "Wie Otto KI nutzt",
      intro:
        "Otto nutzt KI-Modelle (standardmäßig GLM von Z.ai) über OpenRouter. Jede Funktion sendet nur den Text, den sie braucht, und nur, wenn du sie nutzt:",
      items: {
        importing:
          "<b>Import eines Lebenslaufs:</b> der Text der Datei, um ihn in Abschnitte zu gliedern.",
        fixing:
          "<b>Verbessern einer Zeile:</b> die Zeile, ihr Jobtitel und Unternehmen und deine Antworten auf Ottos Fragen.",
        summary:
          "<b>Schreiben deiner Zusammenfassung:</b> dein Lebenslauf ohne Kontaktdaten oder nur die Zusammenfassung, die Otto straffen soll.",
        tailoring:
          "<b>Anpassen, Anschreiben, Kontaktnachrichten und Antworten auf Bewerbungsfragen:</b> dein Lebenslauf, die Stellenanzeige, bei einer Antwort die Frage, und dein Schreibstil, falls du einen festgelegt hast (wobei Kontaktdaten in deinen Notizen durch Platzhalter ersetzt werden).",
        prep: "<b>Interviewvorbereitung:</b> dein Lebenslauf und die Stellenanzeige.",
        build:
          "<b>„Mit Otto erstellen“:</b> der Job, den du willst, und was du über jeden Job geschrieben hast, nie dein Name.",
        github:
          "<b>Import aus GitHub:</b> die Beschreibung, die README und der Pull-Request-Text der Repos und Pull Requests, die du auswählst.",
      },
      notes: {
        placeholders:
          "Bevor etwas davon an die KI geht, ersetzt Otto deinen Namen, deine E-Mail, Telefonnummer und Links durch Platzhalter und setzt sie danach wieder ein. Er erkennt sie an ihren üblichen Mustern, sodass ein ungewöhnliches Format durchrutschen kann. OpenRouter gibt den Text an den Anbieter des Modells weiter und schickt das Ergebnis zurück. Wir weisen OpenRouter an, nur Anbieter zu nutzen, die mit diesen Daten nicht trainieren. Anbieter können sie nach ihren eigenen Richtlinien für begrenzte Zeit speichern, zum Beispiel, um Missbrauch zu erkennen.",
        safety:
          "<b>Sicherheitsprüfungen:</b> Text, den Otto schreibt, und der Text von Seiten, die du veröffentlichst (dein Portfolio und geteilte Lebenslauf-Links), wird von einem Sicherheitsmodell über OpenRouter geprüft, mit deaktivierter Datenerfassung, um sexuelle oder explizite Inhalte zu blockieren.",
        noAi: "Die Recruiter-Prüfungen, der Editor und PDF-Downloads nutzen keine KI. Zeilenprüfungen und PDFs entstehen direkt in deinem Browser.",
        inBrowser:
          "Ein LinkedIn-Datenexport oder eine JSON-Resume-Datei, die du importierst, wird in deinem Browser gelesen und nie hochgeladen. Die Prüfung, ob du laut einer Stellenanzeige infrage kommst, läuft ebenfalls in deinem Browser, ohne KI.",
        voice:
          "<b>Spracheingabe:</b> Wenn du eine Mikrofontaste drückst, hört dein Browser nur zu, solange sie aktiv ist. In Chrome, Edge und Safari wandelt der eigene Sprachdienst des Browsers (Google in Chrome, Microsoft in Edge, Apple in Safari) deine Sprache in Text um, nach der Datenschutzerklärung des jeweiligen Unternehmens. In anderen Browsern oder wenn dieser Dienst nicht verfügbar ist, nimmt der Browser einen Clip auf, der über OpenRouter an unseren Sprache-zu-Text-Anbieter geht, mit deaktivierter Datenerfassung. Wir speichern nie das Audio, nur den Text, den du behältst.",
        github:
          "„Import aus GitHub“ liest nur öffentliche Daten von GitHub (deine Repos und zusammengeführten Pull Requests) anhand des Benutzernamens, den du eingibst, ohne dein GitHub-Login. Nichts wird deinem Lebenslauf hinzugefügt, bevor du bestätigst. Wir speichern die GitHub-Daten nicht: Ein Server hält sie bis zu einer Stunde im Arbeitsspeicher, damit ein zweiter Blick GitHub nicht erneut abfragt.",
      },
    },
    chrome: {
      title: "Otto für Chrome",
      intro:
        "Die Chrome-Erweiterung zeigt auf der Seite, auf der du eine Stellenanzeige liest, wie dein Lebenslauf zu ihr passt. So funktioniert sie:",
      items: {
        reads:
          "<b>Was sie liest:</b> Titel, Unternehmen, Ort und Text einer Stellenanzeige. Sie läuft nur auf Stellenanzeigen bei LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday, SmartRecruiters und Workable und auf anderen Seiten nur, wenn du ihre Schaltfläche in der Symbolleiste drückst. Sie liest keine anderen Seiten und nicht deinen Browserverlauf und verschickt nie eine Bewerbung für dich.",
        fill: "<b>„Mit Otto ausfüllen“ (Pro):</b> Wenn du es in einem Bewerbungsformular von Greenhouse, Lever, Ashby oder Workday drückst, holt die Erweiterung deinen Namen, deine E-Mail, Telefonnummer, deinen Ort, Links, Berufserfahrung, Ausbildung und gespeicherten Antworten aus deinem Konto, trägt sie in dieses Formular ein und hängt das PDF deines Lebenslaufs an; sie behält sie nicht. Sie beantwortet nie Fragen zur Selbstauskunft oder Einwilligung und schickt das Formular nie ab. „Mit Otto entwerfen“ sendet die jeweilige Frage und die Stellenanzeige an uns. Nachdem du ein Formular abgeschickt hast, das sie ausgefüllt hat, fügt sie die Bewerbung mit Link, Titel und Unternehmen des Jobs deinem Board hinzu.",
        device:
          "<b>Der Abgleich läuft auf deinem Gerät.</b> Die Erweiterung speichert eine Kopie dessen, was der Abgleich braucht, im Erweiterungsspeicher von Chrome: den Text deiner Lebensläufe ohne deinen Namen, deine E-Mail, Telefonnummer und Links, dein Arbeitsprofil, wo du Arbeit suchst und welche Jobs du gespeichert hast. Sie aktualisiert diese Kopie alle paar Stunden. Das Prüfen einer Anzeige sendet nichts an uns.",
        save: "<b>Speichern:</b> Wenn du auf „Speichern“ drückst, sendet die Erweiterung uns Link, Titel, Unternehmen, Ort und Anzeigentext dieses Jobs. Wir speichern sie mit deinem Konto, damit der Job auf deinem Board wartet und Otto die Anzeige noch lesen kann, falls sie entfernt wird.",
        tailor:
          "<b>„Anpassen“ und „Anschreiben“</b> öffnen {brand} in einem neuen Tab mit dieser gespeicherten Anzeige und funktionieren wie die oben genannten KI-Funktionen.",
        connecting:
          "<b>Verbinden:</b> Die Erweiterung hält einen zufälligen Schlüssel für dein Konto. Wir speichern davon nur einen Einweg-Fingerabdruck, zusammen mit dem Zeitpunkt seiner Erstellung und letzten Nutzung. Er funktioniert nicht mehr nach 90 Tagen ohne Nutzung, wenn du auf deiner Kontoseite oder in der Erweiterung auf „Trennen“ drückst oder wenn du dein Konto löschst.",
      },
      outro: "Die Erweiterung zeigt keine Werbung und sendet keine Nutzungsereignisse.",
    },
    payments: {
      title: "Zahlungen",
      checkout:
        "{disclosure} Der Bezahlvorgang findet auf der Website von {merchant} statt, nicht auf unserer. Dort erhebt {merchant} deine Zahlungsdaten und deine Rechnungsadresse (auch für die Testphase, damit der Tarif nach ihrem Ende starten kann) nach seiner eigenen <link>Datenschutzerklärung</link>.",
      items: {
        send: "<b>Was wir an {merchant} senden:</b> Wenn du einen Bezahlvorgang startest, deine Konto-E-Mail, unsere zufällige ID für dein Konto und den gewählten Tarif, damit die Zahlung mit deinem Konto verknüpft ist. Wenn du einen Bezahlvorgang startest oder dein Konto löschst, fragen wir diese E-Mail außerdem bei {merchant} ab, damit dir nie ein zweites Abo berechnet wird und jedes gekündigt wird.",
        receive:
          "<b>Was {merchant} uns sendet:</b> Tarif und Status deines Abos, seinen Abrechnungszeitraum, wann es sich verlängert oder deine Testphase endet, eine ausstehende Kündigung und die IDs, die {merchant} für dich, dein Abo und deine Zahlungen verwendet. Seine Benachrichtigungen enthalten außerdem Name, E-Mail und Rechnungsadresse der Bestellung sowie das Kartennetzwerk und die letzten vier Ziffern der Karte. Wir nutzen diese E-Mail nur, um eine Zahlung deinem Konto zuzuordnen, und wir speichern nichts davon. {merchant} sendet uns nie deine vollständige Kartennummer.",
      },
    },
    cookies: {
      title: "Cookies und lokaler Speicher",
      intro: "Wir nutzen nur, was die App zum Funktionieren braucht:",
      items: {
        signIn:
          "<b>Anmelde-Cookies</b> halten dich angemeldet. Sie erneuern sich, während du die App nutzt, und werden entfernt, wenn du dich abmeldest.",
        device:
          "<b>Ein Geräte-Cookie</b> enthält eine zufällige ID, die kostenlose Uploads und Prüfungen pro Gerät begrenzt. Es ist nicht mit deinem Namen oder deiner E-Mail verknüpft und gilt ein Jahr.",
        invite:
          "<b>Ein Einladungs-Cookie</b> speichert den Einladungscode einer befreundeten Person 30 Tage lang, nachdem du ihren Link geöffnet hast, damit die Einladung auch zählt, wenn du dich später registrierst. Es wird entfernt, sobald die Einladung abgeschlossen ist.",
        language:
          "<b>Ein Sprach-Cookie</b> merkt sich, welche Sprache du für die App gewählt hast. Es enthält nur diese Wahl und gilt ein Jahr.",
        localStorage:
          "<b>Der lokale Speicher</b> (kein Cookie) bewahrt deine Lebensläufe, deinen Fortschritt und welche Touren du gesehen hast auf deinem Gerät auf, bis du sie löschst oder deine Browserdaten löschst.",
        checkout:
          "<b>Der Bezahlvorgang von {merchant}</b> läuft auf dessen eigener Website, die dort eigene Cookies setzen kann, um die Zahlung abzuwickeln und Betrug zu verhindern, nach der <link>Datenschutzerklärung</link> von {merchant}. Unsere Website setzt keine Zahlungs-Cookies.",
      },
      outro:
        "Wir nutzen weder Werbung noch Tracking-Cookies. Für die oben genannten Nutzungsereignisse wird eine zufällige ID im lokalen Speicher abgelegt, damit deine Schritte über Besuche hinweg zusammen gezählt werden können. Sie ist nicht mit deinem Namen oder deiner E-Mail verknüpft, und das Löschen deiner Browserdaten entfernt sie.",
    },
    sharing: {
      title: "An wen wir Daten weitergeben",
      intro:
        "Wir verkaufen deine Daten nicht und geben sie nicht für Werbung weiter. Wir nutzen nur diese Anbieter, um {brand} zu betreiben:",
      items: {
        openRouter:
          "<b>OpenRouter</b> und der KI-Modellanbieter, an den es weiterleitet, verarbeiten Lebenslauftext für die oben genannten KI-Funktionen.",
        merchant:
          "<b>{merchant}</b> verarbeitet Zahlungen als unser Merchant of Record und Online-Wiederverkäufer.",
        supabase:
          "<b>Supabase</b> hostet unsere Datenbank und betreibt die Anmeldung, einschließlich deiner Anmeldesitzungen.",
        resend:
          "<b>Resend</b> stellt unsere Anmeldecodes und Hinweise zu deinem Konto zu, etwa zum Ende einer Testphase.",
        google: "<b>Google</b>, nur wenn du dich mit deinem Google-Konto anmeldest.",
        github:
          "<b>GitHub</b> erhält den Benutzernamen, den du nachschlägst, nur wenn du „Import aus GitHub“ nutzt.",
        vercel: "<b>Vercel</b> hostet die App selbst.",
        cloudflare:
          "<b>Cloudflare</b> empfängt die Jobmails, die du an deine Otto-Adresse weiterleitest, und gibt sie an uns weiter, nur wenn du das Tracking per E-Mail einschaltest.",
        sentry:
          "<b>Sentry</b> erhält Fehlerberichte, wenn etwas nicht funktioniert, wobei E-Mails, Telefonnummern und Lebenslauftext vorher entfernt werden.",
        posthog:
          "<b>PostHog</b> erhält die oben genannten Nutzungsereignisse, damit wir sehen, welche Schritte helfen und wo Leute hängen bleiben.",
        openFreeMap:
          "<b>OpenFreeMap</b> liefert die Kartenkacheln, wenn du die Jobkarte öffnest, und erhält dabei deine IP-Adresse und die Bereiche, die du ansiehst, auch den Bereich um dich herum, wenn du „Zu meinem Standort“ nutzt. Wir schicken ihm sonst nichts.",
      },
      outro:
        "Diese Anbieter können Daten außerhalb deines Landes verarbeiten, auch in den USA. Wir können Informationen außerdem weitergeben, wenn das Gesetz es verlangt.",
    },
    retention: {
      title: "Wie lange wir Daten aufbewahren",
      items: {
        account:
          "Kontodaten, Lebenslauf-Backups, eingetragene Bewerbungen, Interviewvorbereitung, dein Arbeitsprofil und dein Schreibstil: bis du sie oder dein Konto löschst.",
        shareLinks: "Freigabelinks: bis du den Link abschaltest oder dein Konto löschst.",
        savedJobs:
          "Gespeicherte Jobs: bis du sie entfernst oder 30 Tage, nachdem der Job geschlossen wurde.",
        chromeJobs:
          "Jobs, die mit Otto für Chrome gespeichert wurden: bis du sie entfernst oder dein Konto löschst.",
        chromeKey:
          "Der Schlüssel der Chrome-Erweiterung: bis du sie trennst oder 90 Tage nach seiner letzten Nutzung.",
        reminders:
          "Erinnerungsbenachrichtigungen: 90 Tage nach dem Lesen, ein Jahr, wenn sie nie gelesen werden.",
        recaps:
          "Die Tage, an denen du die App geöffnet hast, und deine Wochenrückblicke: etwa 10 Wochen oder bis du dein Konto löschst.",
        codes: "Anmeldecodes: Sie funktionieren einmal und laufen nach 10 Minuten ab.",
        feedback:
          "Feedback- und Einladungseinträge: bis dein Konto gelöscht wird. Feedback, das abgemeldet geschickt wurde, ist mit keinem Konto verknüpft.",
        abuse: "Zähler gegen Missbrauch: etwa zwei Tage.",
        uploads: "Hochgeladene Dateien: werden gar nicht aufbewahrt.",
        emailChoices:
          "Deine E-Mail-Einstellungen und der Eintrag, welche Tipps wir geschickt haben: bis du dein Konto löschst.",
        trialEnd:
          "Eine Kopie des Enddatums deiner Testphase: 30 Tage nach dem Ende der Testphase oder bis du Tipps abschaltest.",
        letters:
          "Anschreiben, Antworten und Kontaktnachrichten, die du behältst: bis du sie oder dein Konto löschst.",
      },
    },
    choices: {
      title: "Deine Wahlmöglichkeiten",
      items: {
        resumes:
          "Lösche jeden Lebenslauf im Studio, wann immer du willst. Sein Backup wird sofort entfernt; die Kopie in diesem Browser wartet 30 Tage unter „Zuletzt gelöscht“, oder bis du dich abmeldest oder den Ordner leerst.",
        account:
          "Lösche dein Konto auf deiner <link>Kontoseite</link>. Dadurch werden deine E-Mail, dein Anmeldeeintrag, deine Lebenslauf-Backups, eingetragene Bewerbungen und ihre Vorbereitung, dein Arbeitsprofil, dein Schreibstil, Anschreiben und Nachrichten, gespeicherte Jobs, die Verbindung der Chrome-Erweiterung, Freigabelinks, Erinnerungen und E-Mail-Einstellungen, Einladungseinträge, Feedback und Nutzungseinträge sofort entfernt, und du wirst auf allen Geräten abgemeldet. Das Löschen deines Kontos kündigt deinen bezahlten Tarif oder deine Testphase sofort, und dir wird nichts mehr berechnet. Nur der oben genannte Testphasen-Fingerabdruck bleibt.",
        data: "Bitte uns per E-Mail an <link>{email}</link> um eine Kopie deiner Daten oder darum, sie zu berichtigen oder zu löschen. Du kannst dich auch bei deiner örtlichen Datenschutzbehörde beschweren.",
      },
    },
    children: {
      title: "Kinder",
      body: "{brand} ist nicht für Personen unter 16 Jahren gedacht, und wir erheben wissentlich keine Daten von ihnen.",
    },
    changes: {
      title: "Änderungen dieser Erklärung",
      body: "Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben. Wenn eine Änderung betrifft, wie wir deine Daten nutzen, schicken wir angemeldeten Nutzern eine E-Mail, bevor sie wirksam wird.",
    },
    contact: {
      title: "Kontakt",
      body: "Fragen zum Datenschutz? Schreib an <link>{email}</link>.",
    },
  },
  terms: {
    meta: {
      title: "Nutzungsbedingungen: Tarife, Limits und Kündigung",
      description:
        "Die Regeln für die Nutzung von {brand}, in einfachen Worten: Deine Inhalte bleiben deine, was jeder Tarif enthält und kostet, seine monatlichen Limits und wie du kündigst.",
    },
    title: "Nutzungsbedingungen",
    intro:
      "Diese Bedingungen sind die Vereinbarung zwischen dir und {brand}, wenn du diese Website nutzt. Indem du sie nutzt, stimmst du ihnen zu. Wir haben sie bewusst kurz und einfach gehalten.",
    summary: {
      yours: "Deine Lebensläufe und alles, was du schreibst oder hochlädst, bleiben deine.",
      guidance:
        "Ottos Prüfungen und Vorschläge sind eine Orientierungshilfe, keine Garantie für ein Interview oder einen Job.",
      price:
        "Pro kostet {month} pro Monat oder {year} pro Jahr. Neue Konten können es {days} Tage lang für {trialPrice} testen, einmal pro Person.",
      cancel:
        "Kündige jederzeit auf deiner Kontoseite, und du behältst deinen Tarif bis zum Ende des bezahlten Zeitraums.",
      kept: "Wenn ein bezahlter Tarif endet, wird nichts gelöscht, was du erstellt hast.",
    },
    who: {
      title: "Wer wir sind",
      body: "{brand} ist das Unternehmen, das diese Website betreibt und ihre Tarife verkauft, und die Partei, mit der diese Bedingungen geschlossen werden. Du erreichst uns unter <link>{email}</link>.",
    },
    service: {
      title: "Der Dienst",
      asIs: "Mit {brand} kannst du deinen Lebenslauf prüfen, bearbeiten und anpassen und als PDF herunterladen. Wir stellen den Dienst so bereit, wie er ist. Wir arbeiten hart daran, ihn korrekt und online zu halten, können aber nicht versprechen, dass er immer fehlerfrei oder verfügbar ist.",
      guidance:
        "Ottos Prüfungen und Vorschläge sind eine Orientierungshilfe, keine Garantie. Bewerbermanagementsysteme unterscheiden sich von Arbeitgeber zu Arbeitgeber, und kein Tool kann dir ein Interview oder einen Job versprechen. Du entscheidest, was in deinem Lebenslauf steht, also lies jeden Vorschlag, bevor du ihn übernimmst.",
    },
    account: {
      title: "Dein Konto",
      body: "Du meldest dich mit einem Code an, der an deine E-Mail geschickt wird. Halte dein E-Mail-Konto sicher, denn wer es lesen kann, kann sich als du anmelden. Du musst mindestens 16 Jahre alt sein, um {brand} zu nutzen.",
    },
    content: {
      title: "Deine Inhalte gehören dir",
      yours:
        "Deine Lebensläufe und alles, was du schreibst oder hochlädst, bleiben deine. Du erlaubst uns, sie zu speichern und zu verarbeiten, nur um den Dienst für dich zu betreiben, zum Beispiel um eine Datei zu prüfen, deine Lebensläufe zu sichern oder Text an unseren KI-Anbieter zu senden, wenn du Otto um Hilfe bittest. Unsere <link>Datenschutzerklärung</link> erklärt, wie.",
      rights: "Lade nur Inhalte hoch, die du nutzen darfst.",
    },
    misuse: {
      title: "Kein Missbrauch",
      items: {
        limits:
          "Versuche nicht, den Dienst oder seine Limits zu knacken, zu überlasten oder zu umgehen, zum Beispiel mit Skripten, Bots oder vielen Konten.",
        copy: "Kopiere den Dienst nicht, verkaufe ihn nicht weiter und lies ihn nicht automatisiert aus.",
        harmful: "Lade nichts Illegales oder Schädliches und keine privaten Daten anderer hoch.",
        pretend: "Nutze ihn nicht, um dich als jemand anderes auszugeben.",
      },
      outro: "Wir können Konten sperren oder schließen, die gegen diese Regeln verstoßen.",
    },
    ai: {
      title: "Die KI-Schreibwerkzeuge",
      intro:
        "Die KI-Werkzeuge (Zeilenkorrekturen, Anpassen, Zusammenfassungen, Anschreiben, Kontaktnachrichten, Antworten auf Bewerbungsfragen, Interviewvorbereitung und „Mit Otto erstellen“) sind nur für Texte rund um die Jobsuche gedacht.",
      items: {
        explicit:
          "Nutze sie nicht, um sexuelle, sexuell explizite oder andere NSFW-Inhalte (nicht für die Arbeit geeignet) jeglicher Art zu erstellen.",
        hateful:
          "Nutze sie nicht, um hasserfüllte, belästigende, gewalttätige, illegale oder täuschende Inhalte zu erstellen.",
      },
      outro:
        "Die KI ist so eingerichtet, dass sie solche Anfragen ablehnt und solches Material weglässt. Automatische Sicherheitsprüfungen blockieren außerdem sexuelle oder explizite Inhalte in dem, was Otto schreibt, und auf Seiten, die du veröffentlichst. Wir können Inhalte entfernen, die gegen diese Regel verstoßen, und das Konto sperren oder schließen, das sie angefordert hat. Unsere <link>Richtlinie zur zulässigen Nutzung</link> enthält die vollständige Liste.",
    },
    plans: {
      title: "Tarife und ihre Limits",
      includes: {
        title: "Was jeder Tarif enthält",
        free: "<b>Free:</b> das einfache Einlesen von Uploads ohne KI, die Recruiter-Ansicht, Bearbeiten von Hand, {fixes} Zeilenkorrekturen pro Monat mit Otto (Hilfe bei der Zusammenfassung zählt als eine), {resumes}, die Formate Classic und Compact, PDF-Downloads, die {matches} passendsten Jobs und {applications} mit Erinnerung.",
        paid: "<b>Pro und Max</b> bringen mehr Zeilenkorrekturen und den Rest von Ottos KI-Hilfe (Anpassen, Anschreiben, Antworten, Interviewvorbereitung, „Mit Otto erstellen“, GitHub-Entwürfe und KI-Auswertung von Uploads), die anderen Formate, Word-Downloads, alle passenden Jobs mit Filtern und gespeicherten Jobs, Freigabelinks, die Prüfung der Arbeitserlaubnis und Portfolios. {pro} und die Testphase speichern bis zu {proResumes} Lebensläufe und verfolgen bis zu {proApplications} Bewerbungen; {max} speichert bis zu {maxResumes} und verfolgt bis zu {maxApplications}. Angepasste Versionen zählen als Lebensläufe.",
        ends: "<b>Wenn ein bezahlter Tarif endet,</b> wird nichts gelöscht, was du erstellt hast. Du kannst es weiter öffnen, bearbeiten und herunterladen, und geteilte Links bleiben online, aber du kannst nichts mehr hinzufügen, bis du wieder upgradest. Ein Wechsel zu einem kleineren Tarif funktioniert genauso: Lebensläufe und Bewerbungen über seinen Limits bleiben, und du kannst mehr hinzufügen, sobald du darunter bist.",
      },
      resumes: { one: "{count} Lebenslauf", other: "{count} Lebensläufe" },
      trackedApplications: {
        one: "{count} verfolgte Bewerbung",
        other: "{count} verfolgte Bewerbungen",
      },
      resets: {
        title: "Wann Limits zurückgesetzt werden",
        intro:
          "Jeder Tarif hat ein Limit für alles, was Otto mit KI macht, aufgeführt in der Tabelle unten.",
        items: {
          free: "<b>Free:</b> Zeilenkorrekturen werden zu Beginn jedes Kalendermonats (UTC) zurückgesetzt.",
          monthly:
            "<b>Monatliche Tarife:</b> Die Limits gelten von einer Verlängerung bis zur nächsten und werden zurückgesetzt, wenn sich dein Tarif verlängert.",
          yearly:
            "<b>Jährliche Tarife:</b> dieselben Limits pro Monat, zurückgesetzt an dem Tag im Monat, an dem der Tarif begonnen hat. In einem kürzeren Monat werden sie an dessen letztem Tag zurückgesetzt: Ein Tarif, der am 31. begonnen hat, wird in einem Monat mit 30 Tagen am 30. zurückgesetzt.",
          trial: "<b>Die Pro-Testphase:</b> eigene, kleinere Limits für die ganze Testphase.",
          unused: "Nicht genutzte Limits werden nicht übertragen.",
          invites:
            "<b>Einladungs-Extras</b> kommen zum aktuellen Monat oder zur Testphase hinzu. Bei Free zählen die zusätzlichen Zeilenkorrekturen in diesem Kalendermonat; die zusätzlichen angepassten Versionen zählen, sobald du in diesem Monat eine Testphase startest oder upgradest, und Extras, die du noch nicht genutzt hast, nimmst du dann mit.",
        },
        next: "Deine Kontoseite zeigt das Datum, an dem deine Limits als Nächstes zurückgesetzt werden.",
      },
      table: {
        eachMonth: "Pro Monat",
        trial: "Pro-Testphase, insgesamt",
        none: "Keine",
        features: {
          tailor: "Angepasste Versionen",
          letter: "Anschreiben, Kontaktnachrichten, Antworten und Interviewvorbereitung",
          fix: "Zeilenkorrekturen",
          import: "KI-Auswertungen hochgeladener Lebensläufe",
          draft: "Entwürfe mit „Mit Otto erstellen“",
          github: "GitHub-Projektentwürfe",
        },
      },
      atLimit: {
        title: "Bei Erreichen eines Limits",
        pauses:
          "Diese Funktion pausiert, bis deine Limits zurückgesetzt werden (bei Free zu Beginn des nächsten Monats, bei einem monatlichen Tarif bei deiner nächsten Verlängerung, bei einem jährlichen Tarif am nächsten monatlichen Rücksetzungstag, in der Testphase bis Pro startet) oder bis du zu einem größeren Tarif wechselst. Ein Wechsel von Pro zu Max zwischen zwei Verlängerungen setzt kein Limit zurück: Was du diesen Monat genutzt hast, zählt im neuen Tarif. Uploads stoppen nie: Nach den KI-Auswertungen wird deine Datei stattdessen ohne KI eingelesen. Bearbeiten, Recruiter-Prüfungen und PDF-Downloads haben in keinem Tarif ein Limit.",
        budget:
          "Jeder bezahlte Tarif hat außerdem ein monatliches KI-Budget ({proTokens} Tokens bei {pro}, {maxTokens} bei {max}, {trialTokens} in der Testphase), das die volle Nutzung der oben genannten Limits abdeckt und nur automatisierte oder missbräuchliche Nutzung stoppt.",
        halfMillion: "eine halbe Million",
      },
      voice: {
        title: "Spracheingabe",
        body: "Spracheingabe ist kostenlos und unbegrenzt in Browsern mit eingebauter Spracherkennung (Chrome, Edge und Safari). In anderen Browsern wie Brave und Firefox nutzt sie unseren Sprachdienst: bis zu {freeClips} Clips pro Tag bei Free, {proClips} bei {pro} und in der Testphase und {maxClips} bei {max}, jeweils bis zu 2 Minuten lang.",
      },
    },
    payments: {
      title: "Zahlungen und Kündigung",
      prices:
        "Pro kostet {proMonth} pro Monat oder {proYear} pro Jahr. Max kostet {maxMonth} pro Monat oder {maxYear} pro Jahr. Die Preise sind in US-Dollar, zuzüglich etwaiger Steuern an deinem Wohnort.",
      trial:
        "Neue Konten können eine {days}-tägige Pro-Testphase für {price} bekommen, einmal pro Person. Du hinterlegst beim Bezahlen eine Karte, und die {price} (zuzüglich etwaiger Steuern) werden belastet, wenn die Testphase beginnt. Wenn die Testphase endet, startet Pro für {proMonth} pro Monat, außer du kündigst vorher. Während der Testphase kann ein Portfolio erstellt und in der Vorschau angesehen werden, öffentlich wird es aber nur mit einem bezahlten Tarif.",
      merchant:
        "{disclosure} Für den Kauf gelten außerdem die <link>Käuferbedingungen</link> des Anbieters.",
      renewal:
        "Ein bezahlter Tarif verlängert sich nach jedem gewählten Zeitraum, bis du kündigst. Kündige jederzeit auf deiner <link>Kontoseite</link>, und du behältst ihn bis zum Ende des bezahlten Zeitraums. Du kannst von Pro auf Max wechseln, im Abrechnungszeitraum, den du schon hast: Dein Abo wird direkt umgestellt, du zahlst also nie doppelt, und die Differenz für den Rest des Zeitraums wird sofort belastet. Während der Pro-Testphase kannst du stattdessen Max starten: Die Testphase endet sofort, der volle Max-Preis für den gewählten Zeitraum (zuzüglich etwaiger Steuern) wird sofort deiner hinterlegten Karte belastet, und die Testgebühr von {price} wird nicht abgezogen. Um zu Pro oder zwischen monatlich und jährlich zu wechseln, kündige und wähle den neuen Tarif, sobald dein aktueller Zeitraum endet. Wenn du zu Free wechselst, geht dein veröffentlichtes Portfolio offline, und seine Daten werden aufbewahrt, falls du zurückkommst.",
      credit:
        "Ein bezahlter {pro}- oder {max}-Tarif nach einer etwaigen Testphase kann vorausbezahltes Guthaben aufladen, von {min} bis {maxUsd} auf einmal in ganzen Dollar, zuzüglich etwaiger Steuern. Es bezahlt KI-Hilfe erst, wenn das Monatskontingent für diese Hilfe oder das KI-Budget aufgebraucht ist, zu den Preisen, die zum Zeitpunkt der Nutzung angezeigt werden. Guthaben ist vorausbezahlt und nach der Nutzung nicht erstattungsfähig. Es verfällt nicht, solange dein Konto besteht, kann nur mit einem bezahlten Tarif genutzt werden und wird entfernt, wenn dein Konto gelöscht wird.",
      failed:
        "Wenn eine Zahlung bei der Verlängerung deines Tarifs oder am Ende deiner Testphase fehlschlägt, behältst du den Tarif noch ein paar Tage, während die Zahlung erneut versucht wird. Schlägt sie weiterhin fehl, wechselt dein Konto zu Free, bis du deine Karte auf deiner Kontoseite aktualisierst und die Zahlung durchgeht.",
      changes:
        "Preise und Limits können sich ändern. Wenn sich der Preis oder die Limits deines Tarifs ändern, schicken wir dir eine E-Mail, bevor die Änderung für dich gilt, damit du vorher kündigen kannst, wenn du möchtest.",
      refunds:
        "Erstattungsanfragen bearbeitet {merchant} nach seinen <link>Käuferbedingungen</link>. Unsere <link>Erstattungsseite</link> erklärt, wie du sie stellst.",
    },
    ending: {
      title: "Beendigung",
      body: "Du kannst jederzeit aufhören, {brand} zu nutzen, und dein Konto löschen. Wir können ein Konto sperren oder schließen, das gegen diese Bedingungen verstößt, und sagen dir den Grund, wenn wir können. Wir können außerdem Teile des Dienstes im Laufe der Zeit ändern oder einstellen.",
    },
    liability: {
      title: "Beschränkung unserer Haftung",
      body: "Soweit gesetzlich zulässig, haftet {brand} nicht für indirekte Verluste, etwa eine verpasste Jobchance oder entgangenes Einkommen. Unsere Gesamthaftung dir gegenüber ist auf den Betrag begrenzt, den du uns in den 12 Monaten vor dem Anspruch gezahlt hast. Nichts in diesen Bedingungen schränkt Rechte ein, die du nach den Verbraucherschutzgesetzen an deinem Wohnort hast.",
    },
    changes: {
      title: "Änderungen dieser Bedingungen",
      body: "Wir können diese Bedingungen aktualisieren. Wenn wir das tun, ändern wir das Datum oben, und bei wichtigen Änderungen schicken wir angemeldeten Nutzern eine E-Mail, bevor sie wirksam werden. Wenn du {brand} nach einer Änderung nutzt, akzeptierst du die neuen Bedingungen.",
    },
    contact: {
      title: "Kontakt",
      body: "Fragen zu diesen Bedingungen? Schreib an <link>{email}</link>.",
    },
  },
  refunds: {
    meta: {
      title: "Erstattungsrichtlinie: Pro und Max kündigen",
      description:
        "Erstattungen für die Tarife Pro und Max bearbeitet {merchant}, unser Merchant of Record, nach seinen Käuferbedingungen. Kündige jederzeit, und dir wird nichts mehr berechnet.",
    },
    title: "Erstattungsrichtlinie",
    intro:
      "{merchant} ist unser Merchant of Record, und auf deiner Kartenabrechnung erscheint die Belastung unter dessen Namen, beginnend mit <b>{prefix}</b>. So funktionieren Zahlungen, Erstattungen und Kündigungen bei Pro und Max.",
    summary: {
      cancel:
        "Kündige jederzeit auf deiner Kontoseite. Du behältst deinen Tarif bis zum Ende des bezahlten Zeitraums.",
      trial:
        "Die {days}-tägige Pro-Testphase kostet {price}, belastet bei ihrem Start. Kündige vor ihrem Ende, und du zahlst nichts mehr.",
      ask: "Um eine Erstattung zu beantragen, kontaktiere {merchant} über seine <link>Hilfeseite für Käufer</link> oder <link>schreib uns eine E-Mail</link> von der Adresse, mit der du dich anmeldest.",
    },
    manageBilling: "Abrechnung verwalten",
    pay: {
      title: "Wen du bezahlst",
      receipt:
        "Nach jeder Zahlung schickt dir {merchant} per E-Mail einen Beleg mit einem Link zum Herunterladen deiner Rechnung.",
    },
    refunds: {
      title: "Erstattungen",
      body: "Erstattungsanfragen bearbeitet {merchant} nach seinen <link>Käuferbedingungen</link>. Um eine zu stellen, kontaktiere {merchant} über seine <link>Hilfeseite für Käufer</link> oder schreib uns eine E-Mail von der Adresse, mit der du dich anmeldest, und wir leiten deine Anfrage weiter.",
    },
    cancel: {
      title: "Jederzeit kündbar",
      anytime:
        "Kündige auf deiner <link>Kontoseite</link>, wann immer du willst. Du behältst deinen Tarif bis zum Ende des bezahlten Zeitraums, danach wechselt dein Konto zum Tarif Free. Deine Lebensläufe bleiben in jedem Fall deine.",
      trial:
        "Die {days}-tägige Pro-Testphase kostet {price}, belastet bei ihrem Start. Kündige vor Ende der Testphase, und du zahlst nichts mehr; andernfalls wird deine erste Pro-Zahlung bei ihrem Ende eingezogen. Wenn du während der Testphase Max startest, wird sofort der volle Max-Preis belastet, und die Testgebühr von {price} wird nicht abgezogen.",
    },
    deleting: {
      title: "Dein Konto löschen",
      body: "Das Löschen deines Kontos kündigt deinen bezahlten Tarif sofort, und dir wird nichts mehr berechnet. Er endet in diesem Moment statt am Ende des bezahlten Zeitraums.",
    },
    questions: {
      title: "Fragen zu einer Belastung",
      email:
        "Schreib an <link>{email}</link> von der Adresse, mit der du dich anmeldest. Bei Fragen zu einer Zahlung selbst kannst du dich auch über die <link>Hilfeseite für Käufer</link> an {merchant} wenden.",
      rights:
        "Diese Richtlinie berührt keine Rechte, die du nach den Verbrauchergesetzen an deinem Wohnort hast.",
    },
  },
  acceptableUse: {
    meta: {
      title: "Richtlinie zur zulässigen Nutzung der KI-Schreibwerkzeuge",
      description:
        "Wofür {brand} und seine KI-Schreibwerkzeuge genutzt werden dürfen: nur für berufliche Texte zur Jobsuche. Keine expliziten, hasserfüllten, illegalen oder täuschenden Inhalte.",
    },
    title: "Richtlinie zur zulässigen Nutzung",
    intro:
      "{brand} hilft Menschen bei ihrer Jobsuche: Lebensläufe prüfen und verbessern, sie an einen Job anpassen, Anschreiben und Antworten auf Bewerbungsfragen schreiben, sich auf Interviews vorbereiten, Jobs finden und eine Portfolio-Seite erstellen. Diese Richtlinie sagt, wofür es genutzt werden darf und wofür nicht. Sie ist Teil unserer <link>Nutzungsbedingungen</link>.",
    purpose: {
      title: "Wofür die KI-Werkzeuge da sind",
      body: "Die KI-Schreibwerkzeuge schreiben und verbessern Texte zur Jobsuche aus deinem eigenen Lebenslauf und den Stellenanzeigen, die du ihnen gibst. Nutze sie nur dafür.",
    },
    forbidden: {
      title: "Nicht erlaubt",
      items: {
        sexual:
          "Sexuelle, sexuell explizite oder sexuell anzügliche Inhalte oder andere NSFW-Inhalte (nicht für die Arbeit geeignet).",
        hateful: "Hasserfüllte, belästigende, bedrohliche oder gewalttätige Inhalte.",
        illegal: "Illegale Inhalte oder Inhalte, die jemandem helfen, das Gesetz zu brechen.",
        deceptive:
          "Täuschende Inhalte: gefälschte Qualifikationen, erfundene Arbeitgeber oder Abschlüsse oder sich als jemand anderes auszugeben.",
        privateData: "Private Daten anderer, die ohne deren Erlaubnis hochgeladen werden.",
        limits:
          "Die Schutzmaßnahmen oder Limits des Dienstes zu umgehen, zum Beispiel mit Skripten, Bots oder vielen Konten.",
      },
    },
    enforcement: {
      title: "Wie wir sie durchsetzen",
      body: "Die KI ist angewiesen, nur berufliche Texte zur Jobsuche zu schreiben und alles abzulehnen oder wegzulassen, was diese Richtlinie verbietet. Automatische Sicherheitsprüfungen blockieren außerdem sexuelle oder explizite Inhalte in dem, was Otto schreibt, und auf öffentlichen Seiten (Portfolios und geteilten Lebenslauf-Links). Wir können Inhalte entfernen, die gegen diese Richtlinie verstoßen, und das Konto sperren oder schließen, das sie erstellt hat.",
    },
    models: {
      title: "Die KI dahinter",
      body: "{brand} ist ein unabhängiges Produkt. Seine KI-Funktionen laufen auf KI-Modellen von Drittanbietern, erreicht über OpenRouter. Wir sind weder mit den Unternehmen verbunden, die diese Modelle herstellen, noch werden wir von ihnen empfohlen. Unsere <link>Datenschutzerklärung</link> sagt, welcher Text gesendet wird und wie er geschützt ist.",
    },
    report: {
      title: "Ein Problem melden",
      body: "Du hast etwas gesehen, das gegen diese Richtlinie verstößt? Schreib an <link>{email}</link>. Wir antworten innerhalb von 3 Werktagen.",
    },
  },
} satisfies Translation<Messages["legal"]>;
