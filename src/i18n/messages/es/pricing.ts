import type { Messages } from "..";
import type { Translation } from "../../types";

// The pricing page, plan cards and shared price words, in Spanish; plan names stay as they are.
export default {
  meta: {
    title: "Precios y planes: {free}, {pro} y {max}",
    description:
      "Revisa, corrige y descarga un currículum en PDF gratis. {pro}: {proPrice} al mes con adaptación, cartas de presentación y todos los formatos; {max}: {maxPrice}. {close}",
    trialClose: "Prueba {pro} {days} días por {trialPrice}.",
  },
  prices: {
    cancelAnytime: "Cancela cuando quieras.",
    intervalNames: { month: "Mensual", year: "Anual" },
    perInterval: { month: "al mes", year: "al año" },
    eachInterval: { month: "mes", year: "año" },
    priceLabel: { month: "{price}/mes", year: "{price}/año" },
    trialOffer: "{plan} {days} días",
    trialHeadline: "Prueba {offer}",
    trialSentence:
      "{price} por {days} días, luego {planPrice} {perInterval}. Cancela cuando quieras antes de que termine la prueba.",
    endsTrial: "Termina hoy tu prueba de {trialPlan} y empieza {plan} a {priceLabel}.",
    monthly: "{price} al mes. Cancela cuando quieras.",
    yearly: "{price} una vez al año, unos {perMonth} al mes. {savings}% menos que pagar mes a mes.",
    yearlyFlat: "{price} una vez al año.",
    perPeriod: { month: "al mes", trial: "durante la prueba" },
  },
  features: {
    fix: "correcciones de línea",
    tailor: "versiones adaptadas",
    letter:
      "cartas de presentación, mensajes de contacto, respuestas y preparación para entrevistas",
    import: "lecturas con IA de un currículum subido",
    draft: "borradores de Crear con Otto",
    github: "borradores de proyectos de GitHub",
  },
  credit: {
    line: "¿Se te acabó? Agrega crédito desde {min}: {buys}.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versiones adaptadas",
      letter: "cartas",
      fix: "correcciones de línea",
      import: "lecturas de currículum con IA",
      draft: "borradores de Crear con Otto",
      github: "borradores de proyectos de GitHub",
    },
    each: {
      tailor: "{price} por versión adaptada",
      letter: "{price} por carta",
      fix: "{price} por corrección de línea",
      import: "{price} por lectura de currículum con IA",
      draft: "{price} por borrador de Crear con Otto",
      github: "{price} por borrador de proyecto de GitHub",
    },
    cents: "{cents} centavos",
  },
  page: {
    title: "Gratis para lo básico.",
    titleEm: "Más cuando la búsqueda se intensifica.",
    intro:
      "Revisar, corregir y descargar es gratis. Pro suma la ayuda con IA de Otto, todos los empleos compatibles y el seguimiento de postulaciones.",
    otto: "Los planes cambian cuánto te ayudo cada mes, nunca lo que hago o no hago.",
    footnote:
      "Precios en dólares estadounidenses. Pueden aplicar impuestos. Los planes de pago se renuevan cada {periods} hasta que canceles.",
    billingQuestions: "Preguntas sobre facturación",
    closingStudio: "O revisa tu currículum gratis",
  },
  plans: {
    howOften: "Cada cuánto pagar",
    period: {
      month: { short: "/mes", spoken: "por mes" },
      year: { short: "/año", spoken: "por año" },
    },
    free: "gratis",
    discount: "{percent}% de descuento",
    yearlySavings: "Ahorra {percent}% frente al mensual",
    fairLimits:
      "Límites justos en cada función de IA, todos detallados en los <link>términos</link>.",
    referencePrice: "Precio de referencia ",
    manage: "Gestionar tu plan",
    freeCta: "Revisar mi currículum gratis",
    popular: "Más popular",
    trialEmail: "Te enviaremos un correo el día antes de que se renueve.",
    yearlyNote: "Unos {perMonth} al mes, en vez de {yearly} al año pagando mes a mes.",
    monthlyOnly: "Por ahora, solo con pago mensual.",
    wontStart: "{plan} no empezará, así que no pagarás nada más.",
    thenPrice: "Luego {priceLabel}, a menos que canceles.",
    setToEnd: "Programado para terminar, así que no se te volverá a cobrar.",
    yourPlan: "Tu plan",
    currentPlan: "Plan actual",
    currentTrial: "Plan actual · prueba hasta el {day}",
    includedIn: "Incluido en {plan}.",
    startNow: "Empezar {plan} ahora",
    upgradeTo: "Pasar a {plan}",
    get: "Obtener {plan}",
    notOnPeriod: "Aún no está disponible en tu período de facturación.",
  },
  copy: {
    free: {
      summary: "Revisa, corrige y descarga un currículum.",
      note: "Sin tarjeta",
      outcomes: {
        upload: "Sube un currículum y mira lo que lee el software de selección",
        fix: "Corrige cada línea a mano o con Otto",
        download: "Descarga un PDF limpio en {formats}",
        matches: "Tus {count} empleos más compatibles",
        track: "Sigue {applications}, con un recordatorio de seguimiento",
      },
    },
    pro: {
      summary: "La ayuda de Otto para una búsqueda intensa.",
      lead: "Todo lo de Free, y además:",
      note: "Cancela cuando quieras desde tu cuenta",
      ai: {
        tailor: "Otto adapta tu currículum a cada empleo",
        letters:
          "Cartas de presentación, mensajes de contacto y preparación para entrevistas de Otto",
      },
      tools: {
        formats: "Los {formats} formatos, hasta {resumes} currículums y descargas en Word",
        jobs: "Todos los empleos compatibles entre {open} vacantes, con filtros y empleos guardados",
        jobsNoCount: "Vacantes que encajan con tu currículum, con filtros y empleos guardados",
        track: "Sigue hasta {applications} postulaciones, con recordatorios de seguimiento",
        share: "Enlaces para compartir y un sitio de portafolio en los {designs} diseños",
      },
    },
    max: {
      summary: "Para una búsqueda larga o varios puestos.",
      lead: "Todo lo de Pro, con más:",
      note: "Cancela cuando quieras desde tu cuenta",
      more: {
        tailor: "versiones adaptadas",
        letter: "cartas de presentación, mensajes de contacto y preparación para entrevistas",
        fix: "correcciones de línea",
        import: "archivos subidos leídos por IA",
        drafts: "borradores a partir de tus notas y de GitHub",
      },
      ratio: {
        more: "Más {noun}",
        twice: "El doble de {noun}",
        times: "{times} veces más {noun}",
        overTwice: "Más del doble de {noun}",
        overTimes: "Más de {times} veces más {noun}",
      },
      keep: "Hasta {resumes} currículums y {applications} postulaciones en seguimiento",
    },
    resumes: { one: "{count} currículum", other: "{count} currículums" },
    applications: { one: "{count} postulación", other: "{count} postulaciones" },
    trackedApplications: {
      one: "{count} postulación en seguimiento",
      other: "{count} postulaciones en seguimiento",
    },
    limit: "{count} {label} {period}",
    quota: {
      free: "{resumes} · {fix} {fixLabel} {period} con Otto",
      paid: "{items} {period}",
      item: "{count} {label}",
      letters: "cartas y preparación",
    },
  },
  table: {
    title: "Cada límite, plan por plan",
    intro:
      "Los límites de Pro y Max se reinician cada mes, el mismo día del mes en que empezó tu plan. Las correcciones de línea de Free se reinician el día 1.",
    whatYouGet: "Lo que obtienes",
    included: "Incluido",
    notIncluded: "No incluido",
    groups: {
      ai: "Ayuda con IA de Otto, cada mes",
      resumes: "Currículums y descargas",
      jobs: "Empleos y postulaciones",
    },
    ai: {
      tailor: { label: "Versiones adaptadas", detail: "Tu currículum reescrito para un empleo" },
      letter: {
        label: "Cartas y preparación para entrevistas",
        detail:
          "Cartas de presentación, mensajes de contacto, respuestas y preparación, contados juntos",
      },
      fix: { label: "Correcciones de línea con Otto" },
      import: {
        label: "Archivos subidos leídos por IA",
        detail: "Pasado este límite, y en Free, los lee el lector básico",
      },
      draft: { label: "Primeros borradores a partir de tus notas" },
      github: { label: "Borradores de proyectos desde GitHub" },
    },
    rows: {
      recruiterView: "Vista del reclutador y edición a mano",
      resumes: "Currículums",
      resumesDetail: "Las versiones adaptadas cuentan como currículums",
      formats: "Formatos",
      allFormats: "Los {count}",
      pdf: "Descargas en PDF",
      word: "Descargas en Word (.docx)",
      share: "Enlaces para compartir",
      portfolio: "Sitio de portafolio",
      portfolioDetail: "{count} diseños, creados a partir de tu currículum",
      matches: "Empleos compatibles",
      allMatches: "Todos",
      closestMatches: "Los {count} más cercanos",
      filters: "Filtros y empleos guardados",
      tracked: "Postulaciones en seguimiento",
      reminders: "Recordatorios de seguimiento",
      hireFrom: "Desde dónde puede contratar cada empleo",
    },
  },
  faq: {
    trial: {
      question: "¿Cómo funciona la prueba de Pro?",
      answer:
        "Las cuentas nuevas pueden probar Pro durante {days} días, una vez por persona. Agregas una tarjeta al pagar y pagas {price} (más los impuestos que apliquen) cuando empieza la prueba. Cuando termina, Pro empieza a {priceLabel}. Cancela cuando quieras antes de que termine la prueba y no pagas nada más. Durante la prueba puedes crear y previsualizar un portafolio; se publica cuando empieza Pro.",
    },
    free: {
      question: "¿Qué sigue siendo gratis?",
      answer:
        "Subir archivos con el lector básico, la vista del reclutador, editar y corregir a mano, {fix} correcciones de línea al mes con Otto, {resumes}, los formatos Classic y Compact, las descargas en PDF, tus {matches} empleos más compatibles y {applications} con su recordatorio. Sin tarjeta y sin límite de tiempo. Más correcciones de línea y el resto de la ayuda con IA de Otto, los demás formatos, hasta {proResumes} currículums, las descargas en Word, la lista completa de empleos compatibles con filtros, el seguimiento de hasta {proApplications} postulaciones, los enlaces para compartir y la verificación del permiso de trabajo vienen con Pro. Si termina un plan de pago, todo lo que creaste se queda: puedes seguir abriéndolo, editándolo y descargándolo.",
    },
    payments: {
      question: "¿Quién gestiona los pagos?",
      answer:
        "{merchant}, nuestro comerciante registrado (merchant of record). Procesa tu pago en su propia página de pago, te envía los recibos y gestiona el impuesto sobre las ventas o el IVA, y en el estado de cuenta de tu tarjeta el cargo aparece a su nombre, empezando con {prefix}. Nunca vemos el número completo de tu tarjeta.",
    },
    tax: {
      question: "¿Pagaré impuestos aparte?",
      answer:
        "Según dónde vivas, se puede agregar el impuesto sobre las ventas o el IVA al pagar. Los precios están en dólares estadounidenses, y tu banco puede convertirlos a tu moneda.",
    },
    cancel: {
      question: "¿Cómo cancelo?",
      answer:
        "Desde la página de tu cuenta, cuando quieras. Conservas tu plan hasta el final del período que pagaste, y no se te volverá a cobrar.",
    },
    refund: {
      question: "¿Puedo obtener un reembolso?",
      answer:
        "Las solicitudes de reembolso las gestiona {merchant}, nuestro comerciante registrado, según sus <link>términos para compradores</link>. También puedes cancelar cuando quieras desde la página de tu cuenta y no se te volverá a cobrar. Consulta nuestra <link>política de reembolsos</link>.",
    },
    limits: {
      question: "¿Cuáles son los límites?",
      free: "Free tiene {fix} {fixLabel} al mes (la ayuda con el resumen profesional cuenta como una), que se reinician al inicio de cada mes, y ninguna otra ayuda con IA.",
      monthly:
        "Los límites de Pro y Max se reinician cada mes, cuando se renueva tu plan (en un plan anual, el día del mes en que empezó): {list}.",
      monthlyItem: "{label}: {pro} en Pro, {max} en Max",
      trial:
        "La prueba de Pro de {days} días tiene su propia asignación para toda la prueba: {list}.",
      trialItem: "{count} {label}",
      kept: "Currículums, contando las versiones adaptadas: {freeResumes} en Free, {proResumes} en Pro y en la prueba, {maxResumes} en Max. Postulaciones en seguimiento: {freeApplications} en Free, {proApplications} en Pro y en la prueba, {maxApplications} en Max.",
      uploads:
        "Subir archivos siempre funciona: en Free, o pasadas las lecturas con IA, los lee el lector básico.",
    },
    switch: {
      question: "¿Puedo cambiar entre Pro y Max?",
      answer:
        "Puedes pasar de Pro a Max en la página de tu cuenta, en el período de facturación que ya tienes. Tu suscripción cambia en el momento, así que nunca se te cobra dos veces: pagas de inmediato la diferencia por el resto del período. En la prueba de Pro, empezar Max termina la prueba y cobra de inmediato el precio completo de Max (más los impuestos que apliquen) a tu tarjeta registrada; el cargo de {price} de la prueba no se descuenta. Para pasar a Pro, o entre mensual y anual, cancela desde la página de tu cuenta y elige el nuevo plan cuando termine tu período actual. Pasar a Pro conserva todos tus currículums y postulaciones; si superas los límites de Pro, podrás agregar más cuando estés por debajo de ellos.",
    },
    cancelled: {
      question: "¿Qué pasa con mis currículums si cancelo?",
      answer:
        "Nada. Siguen siendo tuyos, y puedes seguir editándolos y descargándolos gratis. Un portafolio publicado queda fuera de línea hasta que vuelvas a Pro o Max; no se borra.",
    },
    credit: {
      question: "¿Y si se me acaba antes de que se renueve mi plan?",
      answer:
        "En {pro} o {max} puedes agregar crédito de {min} a {maxUsd} cada vez, en dólares enteros, más los impuestos que apliquen. {buys}: {prices}. El crédito se usa solo cuando se agota la asignación de ese mes para la función, o cuando se agota el presupuesto de IA, a los precios vigentes en el momento de usarlo. Es prepago y no es reembolsable una vez usado, nunca vence mientras exista tu cuenta, solo funciona en un plan de pago (no en Free ni en la prueba) y se elimina si borras tu cuenta. Un saldo puede llegar hasta {balance}.",
    },
  },
} satisfies Translation<Messages["pricing"]>;
