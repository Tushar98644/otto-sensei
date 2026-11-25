import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  cancel: "Cancelar",
  stages: {
    reading: "Otto está leyendo la oferta de empleo.",
    comparing: "Otto la está comparando con tu currículum.",
    writing: "Otto está escribiendo tus líneas adaptadas.",
    still: "Sigo escribiendo. Las ofertas largas tardan un poco más.",
  },
  otto: {
    intro: "Pega el enlace de una oferta. Te muestro qué pide y qué ya tienes.",
    working: "Lentes puestos. Esto tarda hasta un minuto. Puedes salir de este paso, yo sigo.",
    done: "Tu currículum adaptado está listo. El original no cambia.",
    cancelled: "Me detuve. Puede contar como 1 versión adaptada, porque ya había empezado.",
    screener: {
      noRequirements:
        "No encontré requisitos claros en esta oferta. Una oferta más completa funciona mejor.",
      niceOnly:
        "Esta oferta no tiene requisitos obligatorios. Tu currículum muestra {shown} de {total} deseables.",
      oneProven:
        "Tu currículum demuestra el único requisito obligatorio. Los filtros revisan justo eso.",
      allProven:
        "Tu currículum demuestra los {total} requisitos obligatorios. Los filtros los revisan uno por uno.",
      noneProven: "Aún no encuentro pruebas de los {total} requisitos obligatorios. Revisémoslos.",
      someProven: {
        one: "Tu currículum demuestra {proven} de {total} requisitos obligatorios. Veamos el que falta.",
        other:
          "Tu currículum demuestra {proven} de {total} requisitos obligatorios. Veamos los otros {count}.",
      },
    },
  },
  free: {
    otto: "Aquí está cada habilidad que pide esta oferta y dónde la muestra tu currículum.",
    usage:
      "Free muestra qué habilidades pide la oferta y dónde las muestras. Adaptar viene con Pro.",
    title: "Adaptar con Pro va más allá",
    note: "Otto lee la oferta por su sentido, no solo por las palabras. Pone primero tus mejores líneas para este empleo, escribe un resumen para él y te ayuda a agregar líneas para lo que falta, con datos que tú le das. Todo va en un currículum adaptado, así que el original no cambia.",
    already: "¿Ya tienes Pro?",
    signIn: "Inicia sesión",
  },
  left: "Te quedan {left} de {limit} versiones adaptadas {period}.",
  pastedPost: "La oferta que pegaste",
  empty: "Primero agrega un currículum",
  base: {
    title: "Adaptando una copia de “{title}”",
    note: "Este currículum ya está adaptado, así que trabajaré con el original del que salió. Cada empleo tiene su propia copia.",
    fallback: "tu currículum original",
  },
  comparedWith: "Comparado con",
  changePost: "Cambiar la oferta",
  startOver: "Empezar de nuevo con otro empleo",
  stale: {
    freeTitle: "Esta revisión es de la oferta que comparaste antes",
    freeNote: "Vuelve a comparar para revisar la oferta como está ahora.",
    title: "Estos resultados son de la oferta que enviaste antes",
    note: "Vuelve a comparar para actualizarlos con la oferta como está ahora.",
  },
  savedJobFailed: "No se pudo abrir esa oferta guardada",
  errors: {
    signedOut: "Se cerró tu sesión. Vuelve a iniciarla para seguir.",
    refused: "No puedo trabajar con esa oferta. Prueba pegar solo la descripción del puesto.",
    badPost: "Esa oferta no se envió bien. Revisa que sea la oferta completa e inténtalo de nuevo.",
  },
  row: {
    status: {
      proven: { label: "Demostrado", chip: "Demostrado" },
      listed: { label: "Mencionado pero no demostrado", chip: "Mencionado, sin prueba" },
      missing: { label: "No aparece", chip: "No aparece" },
      declined: { label: "Dijiste que no", chip: "Dijiste que no" },
    },
    newLine: "Tu línea nueva, para el currículum adaptado",
    matchedByOtto: "encontrado por Otto",
    removeLine: "Quitar la línea",
    showLine: "Ver la línea",
    unproven:
      "Esta línea va al currículum adaptado, pero no menciona {name}, así que un filtro no la contará.",
    showWhere: "Muestra dónde lo usaste",
    yes: "Sí",
    no: "No",
    staysOff: "No aparecerá en tu currículum.",
    changeAnswer: "Cambiar la respuesta",
  },
  addLine: {
    where: "¿Dónde lo hiciste?",
    what: "¿Qué hiciste?",
    whatHint: "Bastan unas palabras. Otto no agrega nada que no hayas dicho.",
    whatFirst: "Primero di dónde y qué hiciste. Bastan unas palabras.",
    placeholder: "Acompañé a dos personas nuevas en su primer mes",
    placeholderWith: "Configuré nuestros servidores de staging con {name}",
    noTarget:
      "Primero agrega un trabajo o un proyecto en Corregir líneas y luego vuelve para agregar esta línea.",
    write: "Escribir la línea",
    useMine: "Usar mis palabras",
    cancel: "Cancelar",
    usesFix: "Escribir la línea usa 1 corrección de línea.",
    newLine: "Tu línea nueva",
    newLineHint: "Va al currículum adaptado, en {place}.",
    brackets: "Primero completa o borra lo que está entre [corchetes].",
    nameIt: "Menciona {name} en la línea para que un filtro pueda encontrarlo.",
    claimsMore: "Otto escribió “{verb}”, que dice más de lo que tú dijiste. Cámbialo si no es así.",
    droppedHelp:
      "Dijiste que ayudaste; esta línea suena como si lo hubieras hecho solo. Vuelve a agregarlo si es más justo.",
    add: "Agregar esta línea",
    back: "Atrás",
  },
  results: {
    label: "Resultados de la adaptación",
    gone: "Ese currículum ya no está",
    goneNote: "Elige otro e inténtalo de nuevo.",
    bestFirst: "Tus mejores líneas primero",
    bestFirstNote:
      "Las líneas que demuestran un requisito obligatorio suben al inicio de su trabajo, donde miran primero los filtros y los reclutadores.",
    movedIn: {
      one: "Las líneas suben en {moved} de {count} trabajo",
      other: "Las líneas suben en {moved} de {count} trabajos",
    },
    tips: "Consejos para este empleo",
    tipCount: { one: "{count} consejo", other: "{count} consejos" },
  },
  copy: {
    title: "Tu currículum adaptado",
    picked: "Elegido para este empleo. Cambia lo que quieras abajo. El original no cambia.",
    create: "Crear versión adaptada",
    ready: "Tu currículum adaptado está listo",
    readyNote: "{title}. El original no cambia.",
    open: "Abrir la versión adaptada",
    another: "Crear otra",
    barReady: "Tu copia para este empleo está lista: {title}.",
  },
  changes: {
    lines: {
      one: "Agrega {count} línea que confirmaste",
      other: "Agrega {count} líneas que confirmaste",
    },
    skills: {
      one: "Agrega {count} habilidad a tu sección de Habilidades",
      other: "Agrega {count} habilidades a tu sección de Habilidades",
    },
    reordered: {
      one: "Pone tus mejores líneas primero en {count} trabajo",
      other: "Pone tus mejores líneas primero en {count} trabajos",
    },
    summary: "Usa el resumen nuevo",
    inline: {
      lines: {
        one: "agrega {count} línea que confirmaste",
        other: "agrega {count} líneas que confirmaste",
      },
      skills: {
        one: "agrega {count} habilidad a tu sección de Habilidades",
        other: "agrega {count} habilidades a tu sección de Habilidades",
      },
      reordered: {
        one: "pone tus mejores líneas primero en {count} trabajo",
        other: "pone tus mejores líneas primero en {count} trabajos",
      },
      summary: "usa el resumen nuevo",
    },
    sentence: "La copia {changes}. El original no cambia.",
    none: "No elegiste cambios. La copia mantiene tus líneas como están, con el nombre de este empleo.",
  },
  lines: {
    title: "Tus líneas para este empleo",
    shows: {
      one: "{count} línea muestra lo que pide esta oferta",
      other: "{count} líneas muestran lo que pide esta oferta",
    },
    weak: "{count} podrían decirlo mejor",
    unrelated: {
      one: "{count} línea más no muestra nada de lo que pide; puede quedarse, más abajo.",
      other: "{count} líneas más no muestran nada de lo que pide; pueden quedarse, más abajo.",
    },
    must: "obligatorio",
    nice: "deseable",
    newLine: "Tu línea nueva, para el currículum adaptado",
    couldBeBetter: "Podría mejorar:",
    showLine: "Ver la línea",
    fewer: "Ver menos",
    all: "Ver las {count} líneas",
  },
  top: {
    title: "La parte de arriba de tu currículum",
    note: "Un reclutador lee tu título y tu resumen antes que cualquier línea.",
    bothFit: "Tu título y tu resumen encajan con este empleo",
    summaryFits: "Tu resumen encaja con este empleo",
    bothOff: "Tu título y tu resumen podrían encajar mejor con este empleo",
    titleOff: "Tu título podría encajar mejor con este empleo",
    summaryOff: "Tu resumen podría encajar mejor con este empleo",
    jobTitle: "Título profesional",
    summary: "Resumen",
    looksRight: ": se ve bien",
    couldBeBetter: ": podría mejorar",
    suggested: "Resumen sugerido",
    suggestedNote: "Escrito solo con lo que ya está en tu currículum.",
    useSummary: "Usar este resumen",
    replaces: "Reemplaza tu resumen actual solo en el currículum adaptado.",
    fillsGap: "Tu currículum todavía no tiene resumen, así que este llena el hueco.",
  },
  screener: {
    eyebrow: "Vista del filtro con IA",
    none: "Esta oferta no tiene requisitos claros",
    noneNote:
      "No dice qué necesita un candidato. Funciona mejor una oferta más completa, con sus requisitos.",
    title: "Los requisitos, uno por uno",
    note: "Herramientas como HiredScore y Ashby revisan cada requisito por separado. Esta es esa revisión, hecha a la vista. No es la calificación exacta de ninguna herramienta.",
    groups: { must: "Obligatorios", nice: "Deseables" },
  },
  overview: {
    title: "Corrige esto primero para este empleo",
    allShown: "Cada requisito obligatorio aparece en una línea sobre lo que hiciste.",
    showLine: "Ver la línea",
    goTo: "Ir ahí",
    see: "Verlo",
  },
  recent: {
    title: "Empleos recientes",
    saved: "Guardado:",
    tailored: "Adaptado antes:",
    failed: "No se pudo abrir ese empleo",
    failedNote: "Inténtalo de nuevo en un momento.",
  },
  system: {
    uses: "Este empleo usa {system}",
    howItReads: "cómo te lee",
    notes: { one: "{count} nota sobre {system}", other: "{count} notas sobre {system}" },
    questions:
      "Preguntas de este formulario que pueden configurarse para rechazarte automáticamente",
    required: "Obligatoria",
    yesNo: "Sí o no",
    choices: "{count} opciones",
    answerTruthfully:
      "No sé cuáles usa esta empresa. Respóndelas con la verdad y siempre de la misma manera.",
  },
  kit: {
    title: "Postúlate a este empleo",
    meta: "Una carta de presentación y respuestas a las preguntas del formulario",
    note: "Escrito solo con tu currículum y esta oferta, en palabras simples. Tú lo copias donde va.",
    letterWritten: "Carta de presentación escrita",
    answers: { one: "{count} respuesta", other: "{count} respuestas" },
  },
  letter: {
    title: "Carta de presentación",
    words: "{count} palabras",
    about:
      "Unas 200 palabras: el puesto, tus datos más cercanos y por qué este empleo. Solo con tu currículum.",
    check: "Revísala antes de enviarla",
    copy: "Copiar",
    download: "Descargar PDF",
    rewrite: "Escribir una nueva",
    write: "Escribir una carta de presentación",
    pdfFailed: "Tu PDF no salió",
    pdfFailedNote: "Inténtalo de nuevo o copia la carta.",
  },
  answers: {
    title: "Responder una pregunta de la postulación",
    question: "La pregunta",
    hint: "Con tu currículum y este empleo. Revisa cada oración antes de pegarla: Otto nunca envía nada.",
    placeholder: "¿Por qué quieres trabajar aquí?",
    whole: "Pega la pregunta completa del formulario, como “¿Por qué quieres trabajar aquí?”",
    draft: "Redactar una respuesta",
    remove: "Quitar esta respuesta",
    copy: "Copiar",
    words: "{count} palabras",
  },
  reorder: {
    moveUp: "Subiremos estas líneas:",
    more: "Y {count} más.",
  },
  reasons: {
    places: {
      at: "{title} en {company}",
      line: "{place}, línea {number}",
      experience: "Experiencia",
      project: "Proyecto",
      education: "Educación",
      jobTitle: "Puesto",
      certifications: "Certificaciones",
      summary: "Resumen",
      skills: "Habilidades",
      skillsGroup: "Habilidades: {label}",
      headline: "Título profesional",
    },
    problems: {
      duty: "suena a descripción del puesto",
      "no-result": "no dice qué cambió",
      "weak-start": "empieza débil",
      "stock-phrase": "usa una frase hecha",
      "first-person": "dice yo o nosotros",
      tense: "está en presente para un trabajo que ya dejaste",
    },
    years: {
      one: " La oferta pide {asked}+ años; las fechas de tus trabajos suman cerca de {count} año.",
      other:
        " La oferta pide {asked}+ años; las fechas de tus trabajos suman cerca de {count} años.",
    },
    spelled:
      " La oferta dice “{term}” y tu línea lo dice de otra forma. Algunos sistemas solo buscan las palabras exactas, así que usa “{term}” una vez también.",
    added: "Tu línea nueva lo demuestra. Va en el currículum adaptado.",
    onlyIn: "Solo en {where}. Muéstralo también en una línea sobre lo que hiciste.",
    onlyInPlaces: {
      jobTitle: "un puesto",
      certifications: "tus certificaciones",
      education: "tu educación",
      summary: "tu resumen",
    },
    shownOutside: "Aparece {where}, no en un trabajo.",
    outsidePlaces: {
      project: "en tu proyecto {name}",
      education: "en tu educación",
      other: "en {name}",
    },
    atWork: " Si lo usaste en el trabajo, dilo en ese trabajo.",
    shownWithProblem: "Aparece en {where}, pero esa línea {problem}.",
    shownAt: "Aparece en una línea en {where}.",
    declined: "Dijiste que no lo tienes.",
    otherForm:
      "Tu currículum dice “{written}”; la oferta dice “{asked}”. Las búsquedas por palabra clave solo encuentran la forma escrita, así que escribe las dos una vez: “{both}”.",
    listed:
      "Solo en tu {list}. Ninguna línea de trabajo muestra que lo usaste, y los filtros lo buscan en lo que hiciste.",
    lists: {
      headline: "título profesional",
      skills: "lista de habilidades",
      group: "lista de habilidades ({group})",
    },
    missingMust: "La oferta lo pide, y nada en tu currículum lo dice todavía.",
    missingNice: "Suma puntos para este empleo. Nada en tu currículum lo dice todavía.",
    lineNote: "Muestra {names} ({kind}). {next}",
    lineKinds: { must: "un requisito obligatorio", nice: "un requisito deseable" },
    keepNearTop: "Déjala cerca de arriba.",
    fixFirst: {
      missing: {
        one: "Falta {count} requisito obligatorio en tu currículum: {names}",
        other: "Faltan {count} requisitos obligatorios en tu currículum: {names}",
      },
      missingReason: "Si lo hiciste, di dónde. Si no, di que no, y no se agrega nada.",
      listed: {
        one: "{count} requisito obligatorio solo está en tu lista de habilidades: {names}",
        other: "{count} requisitos obligatorios solo están en tu lista de habilidades: {names}",
      },
      listedReason: "Los filtros lo buscan en una línea sobre lo que hiciste. Muestra dónde lo usaste.",
      spelled: "La oferta dice “{asked}”; tu currículum dice “{written}”",
      spelledReason:
        "Las búsquedas por palabra clave solo encuentran la forma escrita. Escribe las dos una vez: “{both}”.",
      weak: {
        one: "{count} línea que muestra un requisito obligatorio se lee débil",
        other: "{count} líneas que muestran requisitos obligatorios se leen débiles",
      },
      title: "Tu título profesional no nombra este empleo",
      noSummary: "No hay resumen arriba",
      summary: "Tu resumen no habla de este empleo",
    },
    headline: {
      must: "Requisitos obligatorios demostrados: {proven} de {total}",
      nice: "Deseables: {proven} de {total}",
      join: " · ",
    },
    title: {
      headline: "Tu título profesional coincide con el puesto de la oferta, “{title}”.",
      latest: "Tu último puesto coincide con el puesto de la oferta, “{title}”.",
      missing:
        "El puesto de la oferta es “{title}”. Si encaja contigo, ponlo debajo de tu nombre. Los reclutadores buscan por puesto.",
      differs:
        "El puesto de la oferta es “{title}”; tu título profesional dice “{headline}”. Si el empleo encaja contigo, usa ese puesto en tu título o tu resumen. Nunca cambies el puesto de un trabajo anterior.",
    },
    summary: {
      missing:
        "No tienes resumen. Dos líneas arriba que nombren este empleo y lo que más se le parece ayudan a quien lee por encima.",
      names: "Tu resumen nombra {what}.",
      theTitle: "el puesto",
      differs: "Tu resumen no nombra este empleo ni sus requisitos obligatorios.",
      suggest: " Muestras {names} en tus líneas; dilo también arriba.",
    },
    targets: { aJob: "Un trabajo", project: "Proyecto: {name}", untitled: "sin nombre" },
    asks: {
      used: "¿Has usado {term}?",
      experience: "¿Tienes experiencia con {phrase}?",
    },
  },
  skip: {
    note: "¿No tienes un empleo en mente? Descárgalo como está.",
    action: "Saltar a Descargar",
  },
} satisfies Translation<Messages["studioTailor"]>;
