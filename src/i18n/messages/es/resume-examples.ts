import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume example pages around each example, in Spanish.
export default {
  meta: {
    index: {
      title: "{count} ejemplos de currículum para {year}, por empleo",
      description:
        "{count} ejemplos completos de currículum, de software y datos a ventas, marketing y primer empleo, cada uno con líneas más sólidas, habilidades y errores.",
    },
    long: "{headline} ({year}), habilidades y consejos",
    short: "{headline} ({year})",
  },
  headline: "{role}: ejemplo de currículum",
  crumb: "Ejemplos de currículum",
  index: {
    eyebrow: "Ejemplos de currículum",
    title: "Ejemplos de currículum",
    titleEm: "para {count} empleos.",
    intro:
      "Currículums completos para los empleos que más se buscan, en India y en el extranjero, desde ingeniero de software hasta recursos humanos y recién egresados. Cada uno muestra líneas más sólidas, las habilidades que conviene incluir y los errores que evitar.",
    listTitle: "Ejemplos",
    howTitle: "Cómo se hacen estos ejemplos",
    how: {
      madeUp: {
        title: "Personas inventadas, estructuras reales",
        text: "Cada nombre, empresa, universidad y cifra es inventado. Copia la estructura, el tipo de líneas y el orden de las secciones, y luego pon tus propios datos.",
      },
      lineCheck: {
        title: "Cada línea pasa la revisión de líneas de Otto",
        text: "Cada línea pasó por la misma revisión que el estudio aplica a las tuyas, que marca tareas, frases hechas, palabras vagas y líneas sin resultado.",
      },
      skills: {
        title: "Habilidades que Otto lee en las ofertas de empleo",
        text: "Las habilidades de cada página son las que la <link>verificación de compatibilidad</link> detecta en las ofertas de empleo, así que puedes probar tu propio currículum con una oferta real de la misma forma.",
      },
      realText: {
        title: "Texto real en un formato real",
        text: "Cada ejemplo se muestra en uno de los {count} formatos de la app como texto, no como imagen, así que lo que ves es lo que leería el software de selección.",
      },
      start: {
        title: "Empieza con cualquiera",
        text: "“Empezar con este ejemplo” abre una copia en el estudio como tu propio currículum. En {free}, usa tu único currículum; {pro} guarda hasta {proResumes} y {max} hasta {maxResumes}.",
      },
    },
    ctaTitle: "¿No hay un ejemplo para tu empleo?",
    ctaText:
      "Sube el currículum que tienes para ver lo que lee el software de selección, o compáralo con una oferta de empleo. Las dos cosas son gratis, sin tarjeta.",
  },
  example: {
    eyebrow: "Ejemplo de currículum",
    start: "Empezar con este ejemplo",
    startNote: "Se abre en el estudio como tu propio currículum. Gratis, sin tarjeta.",
    resumeTitle: "El currículum de ejemplo",
    formatFree: "Se muestra en el formato {name}, que se descarga gratis en PDF.",
    formatPro:
      "Se muestra en el formato {name}, que viene con {pro}. En {free} se descarga en {fallback}.",
    linesTitle: "Convierte tareas en resultados",
    linesIntro:
      "Tres líneas débiles, lo que dice de cada una la revisión de líneas de Otto y la línea de este ejemplo que lo resuelve.",
    before: "Antes",
    after: "Después",
    lineCheck: "revisión de líneas",
    skillsTitle: "Habilidades que busca el software de selección",
    skillsIntro:
      "Se muestran en inglés, tal como las escriben las ofertas de empleo en EE. UU. La <link>verificación de compatibilidad</link> de Otto lee cada una en las ofertas. Incluye las que tengas y nombra cada una dentro de una línea donde la usaste: una habilidad que solo aparece en tu lista de Habilidades cuenta como solo listada, no demostrada.",
    titlesLabel: "Títulos de puesto para buscar",
    titles:
      "{titles}. Al buscarte empleos, Otto los trata como el mismo tipo de empleo, así que busca cada uno.",
    tipsTitle: "Qué mostrar",
    mistakesTitle: "Errores que evitar",
    otto: "Otto, la nutria, señalando un currículum",
    closingTitle: "Haz tuyo este currículum.",
    closingText:
      "Se abre en el estudio como tu propio currículum. Cambia los datos por los tuyos, y Otto revisa cada línea a medida que avanzas.",
    blank: "O <link>empieza desde una página en blanco</link>. Gratis, sin tarjeta.",
    moreTitle: "Más ejemplos de currículum",
  },
} satisfies Translation<Messages["resumeExamples"]>;
