import type { Messages } from "..";
import type { Translation } from "../../types";

// The job match page around the tool, in Spanish; the post's cue words stay English because the check reads English posts.
export default {
  meta: {
    title: "Compara tu currículum con una oferta de empleo, gratis",
    description:
      "Pega tu currículum y una oferta o su enlace: mira qué habilidades y herramientas menciona, cuáles muestra tu currículum y cuáles faltan. Gratis, sin iniciar sesión.",
  },
  toolName: "Verificación de compatibilidad de {brand}",
  eyebrow: "Gratis, sin iniciar sesión",
  title: "¿Tu currículum",
  titleEm: "encaja con este empleo?",
  intro:
    "Mira qué habilidades menciona la oferta, dónde las muestra tu currículum y qué falta. Recuentos, no una puntuación inventada.",
  faqTitle: "Qué hace la verificación",
  faq: {
    looksFor: {
      question: "¿Qué busca la verificación?",
      answer:
        "Las habilidades, herramientas, licencias e idiomas que menciona la oferta, de entre unos {known} que Otto conoce, como Python, Figma, Salesforce, BLS o español fluido. Busca cada uno en tu currículum y te muestra la línea en la que está.",
    },
    mustHaves: {
      question: "¿Cómo distingue lo imprescindible de lo deseable?",
      answer:
        "Por los propios títulos y palabras de la oferta. Una habilidad bajo “Requirements” o “What you'll need”, o junto a “required” o “must”, es imprescindible. Una bajo “Nice to have”, o junto a “a plus” o “preferred”, es deseable. Cuando una oferta no lo dice, Otto no adivina.",
    },
    noScore: {
      question: "¿Por qué no hay una puntuación de compatibilidad?",
      answer:
        "Un porcentaje afirmaría más de lo que sabe una revisión de palabras. El software de selección y los reclutadores ponderan las cosas cada uno a su manera, así que Otto te muestra los recuentos y las líneas, y te deja a ti el juicio.",
    },
    meaning: {
      question: "¿Qué no revisa?",
      answer:
        "El significado. Compara las palabras de la oferta, así que “dirigí un equipo de cinco” no contará como “liderazgo”. Tampoco puede juzgar años de experiencia, títulos ni qué tan bueno fue tu trabajo, así que cita esos requisitos de la oferta para que los revises tú. Los reclutadores de verdad leen todo eso.",
    },
    listed: {
      question: "¿Qué significa “Solo listada”?",
      answer:
        "La habilidad está en una lista, como tu sección de habilidades o tu titular, pero ninguna línea sobre tu trabajo dice dónde la usaste. Los reclutadores buscan eso, así que “Reconstruí el servicio de facturación en Go” dice más que “Go” en una lista.",
    },
    stored: {
      question: "¿Se guarda mi currículum?",
      answer:
        "No. El texto pegado se revisa en tu navegador y nunca sale de él. Un archivo subido va a nuestro servidor para que se lea su texto, como lo lee el software de selección, y luego se descarta. El enlace de una oferta también va a nuestro servidor, que abre la oferta y devuelve su texto. No necesitas una cuenta.",
    },
    tailoring: {
      question: "¿En qué se diferencia de la adaptación?",
      answer:
        "Esta verificación muestra lo que ya está. La adaptación en Pro va más allá: Otto lee la oferta por su significado, pone primero tus mejores líneas para el empleo, escribe un resumen para él y te ayuda a agregar líneas para lo que falta, a partir de datos que le das, en una copia adaptada. Mira <link>lo que incluye Pro</link>.",
    },
  },
  closing: {
    otto: "Otto, la nutria, leyendo un currículum",
    title: "Mira lo que ve el software.",
    cta: "Revisar mi currículum",
    note: "Revisar y descargar PDF es gratis. Pro y Max suman más ayuda de Otto.",
  },
} satisfies Translation<Messages["jobMatch"]>;
