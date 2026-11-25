import type { Messages } from "..";
import type { Translation } from "../../types";

// The comparison pages around each product's facts, in Spanish.
export default {
  title: "{brand} vs {name}",
  meta: {
    index: {
      title: "{brand} frente a otras {count} herramientas de currículum",
      description:
        "Comparaciones justas y con fuentes de {brand} con {count} herramientas de CV, como Jobscan, Rezi, Zety, Teal y Canva: puntos fuertes y qué incluye cada plan.",
    },
    page: {
      title: "Alternativa a {name}: compara {compare}",
      description:
        "{compare}: qué hace bien cada uno, qué incluyen los planes gratis y de pago, y en qué se diferencian. Según las páginas de cada producto.",
    },
  },
  crumb: "Comparativas",
  index: {
    eyebrow: "Comparativas",
    title: "Cómo se compara {brand}",
    intro:
      "{short} no se queda en el currículum: sigue con los empleos, las postulaciones y las entrevistas. Así se compara, herramienta por herramienta.",
    facts:
      "Los datos de cada producto vienen de su propio sitio web, tal como estaban en <link>{month}</link>, y cada página enlaza a todas sus fuentes.",
    listTitle: "{brand} frente a los demás",
    cta: "Prueba {brand} con tu currículum",
  },
  pipeline: {
    title: "Más que un revisor de currículum",
    intro:
      "{brand} es toda tu búsqueda de empleo en una sola cuenta, desde la primera revisión del currículum hasta la entrevista.",
    steps: {
      check: {
        title: "Revisa tu currículum",
        text: "Mira lo que lee el software de selección, corrige líneas débiles con Otto y descarga un PDF limpio.",
      },
      jobs: {
        title: "Encuentra empleos a tu medida",
        text: "Vacantes abiertas de los propios sitios de las empresas, leídas cada día y ordenadas según tu currículum.",
      },
      tailor: {
        title: "Adapta cada postulación",
        text: "Una copia de tu currículum para cada empleo, más cartas de presentación y mensajes de contacto.",
      },
      track: {
        title: "Síguelas desde tu bandeja de entrada",
        text: "Tus postulaciones en un tablero, que se mueven solas con tus correos de empleo.",
      },
      prep: {
        title: "Prepara tus entrevistas",
        text: "Preguntas probables e historias a partir de tu propio currículum, para cada entrevista.",
      },
      share: {
        title: "Comparte un portafolio",
        text: "Un sitio de portafolio creado a partir de tu currículum, en tu propio enlace.",
      },
    },
  },
  page: {
    eyebrow: "Alternativa a {name}",
    intro:
      "{brand} es toda tu búsqueda de empleo en una sola cuenta: un currículum que el software de selección puede leer, empleos ordenados según él, postulaciones que se siguen solas y preparación para cada entrevista.",
    tryTitle: "Pruébalo con tu currículum",
    matchCheck: "Haz gratis la verificación de compatibilidad",
    noSignIn: "Gratis, sin iniciar sesión.",
    reasonsTitle: "Por qué elegir {brand}",
    sideBySide: "{short} y {name}, cara a cara",
    tableCaption: "{brand} y {name}, cara a cara",
    fromSite:
      "Todo lo que se dice aquí sobre {name} viene de su propio sitio web, <link>{checked}</link>.",
    byCountry:
      "{name} muestra a cada país sus propios precios; los que aparecen aquí son los que mostraba en India.",
    pricesChange: "Los precios y los planes cambian, así que revisa las <link>fuentes</link>.",
    checkedOn: "consultado el {date}",
    asListed: "según figuraba en {month}",
    pickTitle: "Mira qué opina {short} de tu currículum",
    pickText: "Revisarlo y compararlo con un empleo es gratis, sin tarjeta.",
    sources: "Fuentes",
    pricing: "Precios de {brand}",
    pricesNote: "Precios en dólares estadounidenses. Pueden aplicar impuestos.",
    trademark:
      "{name} es una marca de su titular, nombrada aquí solo para identificar su producto. Esta página no está hecha con {name} ni cuenta con su respaldo. ¿Viste algo desactualizado? Escribe a <link>{email}</link> y lo revisaremos.",
    moreTitle: "Más comparativas",
  },
} satisfies Translation<Messages["compare"]>;
