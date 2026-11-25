import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  tip: {
    position: "{position} de {total}",
    skip: "Saltar consejos",
    back: "Atrás",
    next: "Siguiente",
    done: "Entendido",
  },
  studio: {
    "read-text": {
      title: "Lo que lee el software de selección",
      body: "Así lee tu archivo el software de selección. Lo que falta aquí también les falta a los reclutadores.",
    },
    "fix-with-otto": {
      title: "Corrige una línea con Otto",
      body: "Las etiquetas marcan las líneas que hay que mejorar. Te pido los datos y la reescribo. Nunca invento números.",
    },
    tailor: {
      title: "Adapta a un empleo",
      body: "Pega el enlace de una oferta. Te muestro qué pide y te ayudo a agregar lo que de verdad tienes.",
    },
    download: {
      title: "Descarga gratis",
      body: "Tu PDF es gratis, siempre. Después lo reviso otra vez para mostrarte qué cambió.",
    },
  },
  dashboard: {
    setup: {
      title: "Lo siguiente",
      none: "Lo que sigue, de lo más importante a lo menos. Cada fila desaparece cuando la terminas.",
      steps: {
        one: "Lo que sigue, de lo más importante a lo menos. Tu {count} paso de configuración se marca solo.",
        other:
          "Lo que sigue, de lo más importante a lo menos. Tus {count} pasos de configuración se marcan solos.",
      },
    },
    actions: {
      title: "Empieza aquí",
      body: "Revisa un archivo, adapta un currículum a un empleo o prueba un formato nuevo.",
    },
    library: {
      title: "Tus currículums",
      body: "Aquí están todos tus currículums y copias adaptadas. Busca por nombre o empresa.",
    },
    jobs: {
      title: "Empleos para ti",
      body: "Empleos abiertos de las bolsas de las empresas, ordenados según cuánto encajan con tu currículum.",
    },
    applications: {
      title: "Postulaciones",
      body: "Registra cada empleo al que te postulas en un tablero. Su carta y su preparación quedan vinculadas.",
    },
    interview: {
      title: "Preparación para entrevistas",
      body: "Para cada entrevista: preguntas probables, historias de tus propias líneas y preguntas para hacer.",
    },
    portfolio: {
      title: "Portafolio",
      body: "Convierte tu currículum en un sitio de portafolio, alojado para ti en tu propio enlace.",
    },
    "win-rate": {
      title: "Lo que funciona",
      body: "Registra los empleos a los que te postulas. Te muestro qué currículum te consigue entrevistas.",
    },
  },
} satisfies Translation<Messages["onboarding"]>;
