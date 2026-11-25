import type { CompareTranslation, CompareValues } from "../../compare";

// Comparisons of Otto Sensei with other resume tools, in Spanish.
export default function compare(v: CompareValues): CompareTranslation {
  const OTTO = {
    what: {
      answer: "Toda la búsqueda de empleo",
      detail: `Revisa y crea tu currículum, y luego encuentra vacantes abiertas ordenadas según él. Pro suma una copia adaptada, una carta de presentación y mensajes de contacto para cada empleo, hasta ${v.proApplications} postulaciones que se actualizan con tu correo, preparación para entrevistas y un sitio de portafolio.`,
    },
    score: {
      answer: "Sin puntuación inventada",
      detail:
        "Cada revisión da el visto bueno o nombra el problema y cómo corregirlo, con palabras simples.",
    },
    free: {
      answer: `${v.plural({ one: "{count} currículum", other: "{count} currículums" }, v.freeResumes)}, sin tarjeta`,
      detail: `Revísalo, corrígelo y descárgalo en PDF en ${v.freeFormats}, con ${v.fixes} correcciones de línea al mes de Otto, tus ${v.freeJobMatches} empleos más compatibles y ${v.plural({ one: "{count} postulación con seguimiento", other: "{count} postulaciones con seguimiento" }, v.freeApplications)}.`,
    },
    paid: {
      answer: `Pro: ${v.proMonthly} al mes`,
      detail: `Max: ${v.maxMonthly} al mes, para más ayuda con IA, más currículums y más postulaciones con seguimiento. Cancela cuando quieras.`,
    },
    downloads: {
      answer: "PDF gratis, sin límite",
      detail: `En ${v.freeFormats}. Todos los formatos y las descargas en Word (.docx) vienen con Pro.`,
    },
    formats: {
      answer: `${v.templateCount} formatos, ${v.freeTemplateCount} gratis`,
      detail: `Cada uno copia un diseño de currículum muy usado: ${v.freeFormats} en Free, todos en Pro.`,
    },
    jobs: {
      answer: "Según tu currículum",
      detail: `Vacantes abiertas de las páginas de empleo de las empresas y de bolsas públicas, leídas cada día. Free muestra tus ${v.freeJobMatches} más compatibles; Pro muestra todas las coincidencias.`,
    },
    systems: {
      answer: `Detecta ${v.systemCount} sistemas de selección`,
      detail:
        "A partir del enlace de un empleo, con notas con fuente sobre cómo trata cada uno las postulaciones.",
    },
  };

  const NO_SCORE = {
    title: "Sin puntuación inventada",
    text: "No existe una puntuación ATS estándar: cada sistema de selección clasifica a los candidatos a su manera, y ninguno te muestra un número. Por eso Otto no se inventa una. Cada revisión da el visto bueno o nombra el problema y cómo corregirlo.",
  };

  const FREE_PDFS = {
    title: "Las descargas en PDF son gratis",
    text: "Revisar, editar y descargar un currículum en PDF no cuesta nada, sin límite de descargas.",
  };

  const EMPLOYER_JOBS = {
    title: "Empleos de los propios sitios de los empleadores",
    text: "Otto lee cada día las páginas de empleo de las empresas y las bolsas públicas, y ordena los empleos según tu currículum. Cada uno enlaza a la oferta original.",
  };

  const SOURCED_NOTES = {
    title: "Notas con fuente sobre sistemas de selección",
    text: `Cada una de las notas de Otto sobre ${v.systemCount} sistemas de selección enlaza a la página de donde viene.`,
  };

  const READ_BACK = {
    title: "Formatos probados leyéndolos de nuevo",
    text: "Cada formato es una columna de texto real, y cada PDF se prueba leyéndolo de nuevo.",
  };

  return {
    jobscan: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Un escáner de currículum",
            detail:
              "Compara tu currículum con una oferta de empleo y da una tasa de coincidencia, además de un creador de currículum, un seguimiento de empleos, empleos compatibles, optimización de LinkedIn, un generador de cartas de presentación, postulación automática y práctica de entrevistas con IA.",
          },
        },
        {
          label: "Puntuación",
          otto: OTTO.score,
          them: {
            answer: "Una tasa de coincidencia",
            detail:
              "Una por cada escaneo, con un objetivo de al menos 75%. Se basa primero en las habilidades técnicas, y luego en el nivel de estudios (solo cuando la oferta pide un posgrado), el título del puesto, las habilidades blandas y otras palabras clave.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "Escaneos gratis cada mes",
            detail:
              "Escaneos de currículum cada mes (cinco, según el blog de Jobscan), el creador de currículum y una prueba de Premium de 7 días.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Premium, mensual o trimestral",
            detail: "Jobscan publica sus precios en su página de planes.",
          },
        },
        {
          label: "Empleos",
          otto: OTTO.jobs,
          them: {
            answer: "Coincidencias y postulación automática",
            detail:
              "Empleos compatibles con tu currículum. Con la postulación automática, revisas cada postulación antes de que se envíe.",
          },
        },
        {
          label: "Sistemas de selección",
          otto: OTTO.systems,
          them: {
            answer: "Detecta sistemas conocidos",
            detail:
              "Nombra el sistema de seguimiento de candidatos de una oferta de empleo cuando reconoce el sistema de la empresa.",
          },
        },
      ],
      differences: [NO_SCORE],
      extras: [FREE_PDFS, EMPLOYER_JOBS, SOURCED_NOTES],
      sources: [
        { label: "Página de inicio de Jobscan" },
        { label: "Tutorial de Jobscan" },
        { label: `Blog de Jobscan, “Jobscan vs Rezi” (${v.date("2026-06-18")})` },
        { label: `Blog de Jobscan, “Jobscan vs Huntr” (${v.date("2026-08-07")})` },
      ],
    },
    rezi: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Un creador de currículum con IA",
            detail:
              "Con un agente de currículum con IA, un revisor de currículum y escáner de palabras clave, un generador de cartas de presentación, práctica de entrevistas con IA y búsqueda de empleo.",
          },
        },
        {
          label: "Puntuación",
          otto: OTTO.score,
          them: {
            answer: "El Rezi Score",
            detail:
              "Revisa tu currículum según 23 métricas clave, sección por sección. Limitado en Free, completo en Pro.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "1 currículum, 3 PDF",
            detail:
              "Más 1 entrevista con IA. El Rezi Score y la orientación a palabras clave con IA son limitados.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: `Pro: ${v.reziPro} al mes`,
            detail: `Con currículums, descargas en PDF y entrevistas con IA ilimitados, y una revisión experta al mes. Lifetime: ${v.usd(149)} en un solo pago, con las funciones de Pro pero sin la revisión mensual.`,
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: { answer: "3 PDF en Free", detail: "Ilimitadas en Pro." },
        },
        { label: "Empleos", otto: OTTO.jobs, them: { answer: "Un buscador de empleo" } },
      ],
      differences: [
        NO_SCORE,
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} El plan Free de Rezi incluye 3 descargas en PDF.`,
        },
        {
          title: "Un precio mensual más bajo",
          text: `Otto Pro cuesta ${v.proMonthly} al mes; Rezi Pro cuesta ${v.reziPro} al mes.`,
        },
      ],
      extras: [EMPLOYER_JOBS],
      sources: [{ label: "Página de precios de Rezi" }, { label: "Página de inicio de Rezi" }],
    },
    kickresume: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Creador de currículums y cartas",
            detail:
              "Con un redactor con IA, un revisor de currículum ATS, un creador de sitios web personales, una bolsa de empleo y apps para iOS y Android.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "4 plantillas básicas de currículum",
            detail:
              "Más 4 plantillas de carta de presentación, 1 plantilla básica de sitio web y descargas ilimitadas. El redactor con IA y el revisor de currículum no están incluidos.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Premium, con precio por país",
            detail: `${v.usd(9)} por un mes, ${v.usd(18)} por tres o ${v.usd(48)} por un año. Suma más de 40 plantillas, el redactor con IA, el revisor de currículum ATS, la importación desde LinkedIn y PDF, y las apps móviles.`,
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: { answer: "Ilimitadas en todos los planes" },
        },
        {
          label: "Plantillas",
          otto: OTTO.formats,
          them: {
            answer: "Más de 40 en Premium",
            detail: "4 en Free. Premium suma más colores y fuentes.",
          },
        },
      ],
      differences: [
        {
          title: "Revisión de currículum en Free",
          text: "La vista del reclutador gratuita de Otto muestra el texto que el software de selección extrae de tu archivo, con un motivo claro para cada problema. El revisor de currículum ATS de Kickresume viene con Premium.",
        },
        {
          title: "Ayuda con IA en Free",
          text: `Free incluye ${v.fixes} correcciones de línea al mes con Otto. El redactor con IA de Kickresume viene con Premium.`,
        },
      ],
      extras: [READ_BACK, EMPLOYER_JOBS],
      sources: [
        { label: "Página de precios de Kickresume" },
        { label: "Página de inicio de Kickresume" },
      ],
    },
    "resume-io": {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Creador de currículums y cartas",
            detail:
              "Con un redactor con IA, un evaluador ATS, una bolsa de empleo, conexión con reclutadores, postulación automática a cargo de su equipo, práctica de entrevistas, un analizador de salarios y cursos.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "1 currículum, descargas en TXT",
            detail:
              "Un currículum y una carta de presentación, descargas solo en TXT, y opciones limitadas para compartir y de estadísticas.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Planes semanales o anuales",
            detail:
              "Con precio por país, con currículums, cartas de presentación y descargas en PDF ilimitados. Las tarjetas de los planes dicen pago único; sus preguntas frecuentes dicen que una prueba de 7 días se convierte en una membresía mensual si no cancelas.",
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: {
            answer: "Solo TXT en Free",
            detail:
              "Las descargas en PDF vienen con un plan de pago, y sus plantillas se descargan en Word o PDF.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} El plan gratis de Resume.io solo descarga en TXT.`,
        },
        {
          title: "Cobro por mes",
          text: "Otto Pro se cobra cada mes o cada año, y lo cancelas desde tu cuenta. Resume.io vende un plan de una semana o de un año.",
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Página de precios de Resume.io" },
        { label: "Página de inicio de Resume.io" },
      ],
    },
    enhancv: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Un creador de currículum con IA",
            detail:
              "Con sugerencias de contenido, una revisión ATS y comentarios sobre el currículum, adaptación con puntuación de compatibilidad, traducción, un generador de cartas de presentación, ayuda para entrevistas, una bolsa de empleo y un seguimiento de empleos.",
          },
        },
        {
          label: "Puntuación",
          otto: OTTO.score,
          them: {
            answer: "Una puntuación ATS",
            detail:
              "Sus comentarios sobre el currículum dan una puntuación ATS, y la adaptación muestra una puntuación de compatibilidad con una oferta de empleo.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "Gratis por 7 días",
            detail:
              "Todas las plantillas y herramientas de diseño, secciones básicas, hasta 12 elementos por sección y la marca de Enhancv.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Pro, con precio por país",
            detail:
              "Se cobra cada mes, cada 3 meses o cada 6 meses. Suma hasta 300 currículums y cartas de presentación, sugerencias de contenido, la revisión ATS, secciones Pro y sin marca.",
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: {
            answer: "PDF, no Word",
            detail: "Sus preguntas frecuentes dicen que los currículums se descargan en PDF.",
          },
        },
      ],
      differences: [
        {
          title: "Un plan gratis sin fecha de fin",
          text: "El plan Free de Otto no tiene límite de tiempo. El plan Free de Enhancv es válido por 7 días.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [
        { label: "Página de precios de Enhancv" },
        { label: "Página de inicio de Enhancv" },
      ],
    },
    novoresume: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Creador de currículums y cartas",
            detail:
              "Con plantillas diseñadas, un revisor ATS que puntúa tu archivo, herramientas de escritura con IA y un creador de cartas de presentación en Pro.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "1 currículum, 1 página",
            detail:
              "8 plantillas, 30 temas de color, 2 créditos de IA al mes y el revisor ATS. No vence, y el PDF lleva la marca de Novoresume.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Pro, con precio por país",
            detail:
              "Mensual, trimestral o anual hasta que canceles, o un Pass de un mes que se cobra una sola vez. Pro suma hasta 144 documentos de 25 páginas, todas las plantillas, el creador de cartas de presentación y 40 créditos de IA al mes.",
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: {
            answer: "PDF con marca en Free",
            detail:
              "Pro quita la marca. Una descarga que te pide mejorar el plan funciona una vez que cambias las funciones Pro por otras gratis.",
          },
        },
      ],
      differences: [
        {
          title: "PDF gratis sin marca",
          text: "Otto no pone ninguna marca en los PDF que descargas gratis. Los PDF gratis de Novoresume llevan su marca.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [
        { label: "Página de precios de Novoresume" },
        { label: "Página de inicio de Novoresume" },
      ],
    },
    zety: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: { answer: "Un creador de currículum en línea" },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: { answer: "Un plan gratis", detail: "Descargas solo en TXT." },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: `${v.usd(1.95)} por 14 días`,
            detail: `La prueba se renueva a ${v.usd(25.95)} cada 4 semanas. O paga ${v.usd(71.4)} por adelantado por un año (${v.usd(5.95)} al mes). Garantía de reembolso de 14 días.`,
          },
        },
        {
          label: "Descargas",
          otto: OTTO.downloads,
          them: {
            answer: "Solo TXT en Free",
            detail: "Las descargas en PDF y Word requieren un plan de pago.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} El plan gratis de Zety solo descarga en TXT.`,
        },
        {
          title: "Un precio más bajo mes a mes",
          text: `Otto Pro cuesta ${v.proMonthly} al mes, con cobro mensual. La prueba de ${v.usd(1.95)} de Zety se renueva a ${v.usd(25.95)} cada 4 semanas.`,
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [{ label: "Página de precios de Zety" }],
    },
    teal: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Una app de currículum",
            detail: "Con un plan gratis y un plan de pago, Teal+.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: { answer: "Sí, un plan gratis" },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: `Teal+: ${v.usd(13)} por semana`,
            detail: `O ${v.usd(29)} cada 30 días, o ${v.usd(79)} cada 90 días.`,
          },
        },
      ],
      differences: [
        {
          title: "Un precio mensual más bajo",
          text: `Otto Pro cuesta ${v.proMonthly} al mes. Teal+ cuesta ${v.usd(29)} cada 30 días.`,
        },
      ],
      extras: [FREE_PDFS, NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Centro de ayuda de Teal, “Teal vs Teal+”" },
        { label: "Blog de Teal, “Best resume apps”" },
      ],
    },
    canva: {
      rows: [
        {
          label: "Qué es",
          otto: OTTO.what,
          them: {
            answer: "Una herramienta de diseño general",
            detail:
              "Los currículums son una de las cosas que puedes hacer con ella; no está hecha solo para eso.",
          },
        },
        {
          label: "Plan gratis",
          otto: OTTO.free,
          them: {
            answer: "Gratis, con plantillas",
            detail: "Su plan gratis incluye plantillas gratis.",
          },
        },
        {
          label: "Planes de pago",
          otto: OTTO.paid,
          them: {
            answer: "Canva Pro, según el país",
            detail:
              "Los precios varían según el país, así que revisa la página de precios de Canva para ver el tuyo.",
          },
        },
      ],
      differences: [
        {
          title: "Hecho para quienes buscan empleo",
          text: "Otto está hecho solo para currículums y postulaciones: muestra el texto que el software de selección lee de tu archivo y nombra cada problema. Canva es una herramienta de diseño general.",
        },
      ],
      extras: [READ_BACK, FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Página de precios de Canva Pro" }],
    },
  };
}
