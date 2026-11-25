import type { Messages } from "..";
import type { Translation } from "../../types";

// The comparison pages around each product's facts, in German.
export default {
  title: "{brand} vs {name}",
  meta: {
    index: {
      title: "{brand} im Vergleich mit {count} anderen Lebenslauf-Tools",
      description:
        "Faire, belegte Vergleiche von {brand} mit {count} Lebenslauf-Tools wie Jobscan, Rezi, Zety, Teal und Canva: was jedes gut kann und was die Tarife enthalten.",
    },
    page: {
      title: "{name}-Alternative: {compare} verglichen",
      description:
        "{compare}: was jedes gut kann, was Gratis- und Bezahltarife enthalten und wo sie sich unterscheiden. Laut den Seiten der Produkte selbst.",
    },
  },
  crumb: "Vergleiche",
  index: {
    eyebrow: "Vergleich",
    title: "{brand} im Vergleich",
    intro:
      "{short} hört nicht beim Lebenslauf auf: Er begleitet dich weiter durch die Jobs, die Bewerbungen und die Interviews. So schneidet er im Vergleich ab, Tool für Tool.",
    facts:
      "Die Angaben zu jedem Produkt stammen von seiner eigenen Website, Stand <link>{month}</link>, und jede Seite verlinkt alle ihre Quellen.",
    listTitle: "{brand} vs die anderen",
    cta: "Teste {brand} mit deinem Lebenslauf",
  },
  pipeline: {
    title: "Mehr als ein Lebenslauf-Check",
    intro:
      "{brand} ist deine ganze Jobsuche in einem Konto, vom ersten Lebenslauf-Check bis zum Interview.",
    steps: {
      check: {
        title: "Prüfe deinen Lebenslauf",
        text: "Sieh, was Bewerbermanagementsysteme lesen, verbessere schwache Zeilen mit Otto und lade ein sauberes PDF herunter.",
      },
      jobs: {
        title: "Finde passende Jobs",
        text: "Offene Stellen von den eigenen Websites der Unternehmen, täglich gelesen und nach deinem Lebenslauf sortiert.",
      },
      tailor: {
        title: "Passe jede Bewerbung an",
        text: "Eine Kopie deines Lebenslaufs für jeden Job, dazu Anschreiben und Kontaktnachrichten.",
      },
      track: {
        title: "Verfolge sie aus deinem Postfach",
        text: "Bewerbungen auf einem Board, die sich anhand deiner Job-E-Mails von selbst weiterbewegen.",
      },
      prep: {
        title: "Bereite dich auf Interviews vor",
        text: "Wahrscheinliche Fragen und Geschichten aus deinem eigenen Lebenslauf, für jedes Interview.",
      },
      share: {
        title: "Teile ein Portfolio",
        text: "Eine Portfolio-Website aus deinem Lebenslauf, unter deinem eigenen Link.",
      },
    },
  },
  page: {
    eyebrow: "{name}-Alternative",
    intro:
      "{brand} ist deine ganze Jobsuche in einem Konto: ein Lebenslauf, den Bewerbermanagementsysteme lesen, passend dazu gerankte Jobs, Bewerbungen, die sich selbst verfolgen, und Vorbereitung auf jedes Interview.",
    tryTitle: "Teste es mit deinem Lebenslauf",
    matchCheck: "Kostenlosen Job-Abgleich starten",
    noSignIn: "Kostenlos, ohne Anmeldung.",
    reasonsTitle: "Gründe für {brand}",
    sideBySide: "{short} und {name} nebeneinander",
    tableCaption: "{brand} und {name} nebeneinander",
    fromSite:
      "Alles über {name} auf dieser Seite stammt von seiner eigenen Website, <link>{checked}</link>.",
    byCountry:
      "{name} zeigt jedem Land eigene Preise; alle Preise hier sind die, die es in Indien angezeigt hat.",
    pricesChange: "Preise und Tarife ändern sich, prüfe also die <link>Quellen</link>.",
    checkedOn: "geprüft am {date}",
    asListed: "wie im {month} angegeben",
    pickTitle: "Sieh, was {short} aus deinem Lebenslauf macht",
    pickText: "Ihn zu prüfen und mit einem Job abzugleichen ist kostenlos, ohne Karte.",
    sources: "Quellen",
    pricing: "Preise von {brand}",
    pricesNote: "Preise in US-Dollar. Es können Steuern anfallen.",
    trademark:
      "{name} ist eine Marke ihres Inhabers und wird hier nur genannt, um das Produkt zu benennen. Diese Seite ist nicht mit {name} entstanden und wird auch nicht von ihm unterstützt. Ist etwas veraltet? Schreib an <link>{email}</link>, und wir prüfen es.",
    moreTitle: "Weitere Vergleiche",
  },
} satisfies Translation<Messages["compare"]>;
