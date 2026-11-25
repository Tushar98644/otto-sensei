import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: { title: "Cuenta" },
  heading: "Tu cuenta",
  skeleton: {
    loading: "Cargando tu cuenta…",
    stillLoading: "¿Sigue cargando?",
    reload: "Recarga la página",
  },
  tryAgain: "Intentar de nuevo",
  checkConnection: "Revisa tu conexión y vuelve a intentarlo.",
  saveFailed: "No se pudo guardar",
  copied: "Copiado",
  copyLink: "Copiar enlace",
  view: {
    loadFailed: "No se pudo cargar tu cuenta",
    settingUp: "Preparando tu plan {plan}",
    settingUpNew: "Preparando tu nuevo plan",
    checkout: "Llevándote al pago de {plan}",
    signIn: "Iniciar sesión",
  },
  arrival: {
    thanks: "¡Gracias por mejorar tu plan!",
    thanksDetail: "Tu nuevo plan puede tardar un minuto en aparecer.",
    cancelled: "Pago cancelado",
    nothingCharged: "No se cobró nada.",
    credit: "¡Gracias! Tu crédito está en camino.",
    creditDetail: "Puede tardar un minuto en aparecer aquí.",
    goBack: "Volver",
    testMode: "Modo de prueba: volviste a Free.",
  },
  tabs: {
    label: "Cuenta",
    plan: "Plan y facturación",
    preferences: "Preferencias",
    profile: "Perfil",
  },
  plan: {
    eyebrow: "Tu plan",
    srTitle: "Tu plan: ",
    pills: {
      current: "Plan actual",
      failed: "Pago fallido",
      ends: "Termina el {day}",
      trialLeft: "Prueba · {left}",
      trial: "Prueba",
      active: "Activo",
      setToEnd: "Programado para terminar",
    },
    endsToday: "termina hoy",
    daysLeft: { one: "queda {count} día", other: "quedan {count} días" },
    per: { month: "/mes", year: "/año" },
    nothingMore: "Nada más que pagar",
    from: "desde el {day}",
    until: "hasta el {day}",
    renews: "se renueva el {day}",
    heldTitle: "Tu último pago no se procesó",
    heldDetail: "Por ahora estás en Free. Actualiza tu tarjeta para recuperar tu plan.",
    held: "{title}. {detail}",
    tracked: {
      one: "una postulación con seguimiento",
      other: "{count} postulaciones con seguimiento",
    },
    free: "Free incluye {fixes} correcciones de línea al mes, además de la vista del reclutador, la edición, las descargas en PDF, algunas coincidencias de empleo y {tracked}.",
    tryPro: "{base} Prueba {pro}: {trial}",
    trialSentence: {
      month:
        "{price} por {days} días, luego {plan} al mes. Cancela cuando quieras antes de que termine la prueba.",
      year: "{price} por {days} días, luego {plan} al año. Cancela cuando quieras antes de que termine la prueba.",
    },
    trialEnding: "Tu prueba termina el {day} y {name} no empezará, así que no pagarás nada más.",
    trialStarts: {
      month:
        "Pagaste {trial} por la prueba. El {day}, {name} empieza a {price} al mes. Te avisamos el día anterior.",
      year: "Pagaste {trial} por la prueba. El {day}, {name} empieza a {price} al año. Te avisamos el día anterior.",
    },
    endsOn:
      "Tu plan termina el {day} y tu cuenta pasa a Free en ese momento. No se te volverá a cobrar.",
    setToEnd:
      "Tu plan está programado para terminar y tu cuenta pasará a Free en ese momento. No se te volverá a cobrar.",
    renewsOn: {
      month:
        "Tu plan se renueva el {day} a {price} al mes. Cancela cuando quieras antes de esa fecha.",
      year: "Tu plan se renueva el {day} a {price} al año. Cancela cuando quieras antes de esa fecha.",
    },
    renewsEach: {
      month: "Tu plan se renueva cada mes a {price} al mes. Cancela cuando quieras.",
      year: "Tu plan se renueva cada año a {price} al año. Cancela cuando quieras.",
    },
    yearly: "Paga por año: {price} al año.",
    yearlySaves: "Paga por año: {price} al año, un {savings} % menos que mensual.",
    how: {
      trial:
        "Un plan no puede pasar de mensual a anual a mitad de período. Cancela tu prueba y, cuando termine, elige el plan anual en la página de precios.",
      trialBefore:
        "Un plan no puede pasar de mensual a anual a mitad de período. Cancela tu prueba antes del {day} y, cuando termine, elige el plan anual en la página de precios.",
      paid: "Un plan no puede pasar de mensual a anual a mitad de período. Cancela el plan mensual y, cuando termine, elige el anual en la página de precios.",
      paidBefore:
        "Un plan no puede pasar de mensual a anual a mitad de período. Cancela el plan mensual antes del {day} y, cuando termine, elige el anual en la página de precios.",
    },
    max: {
      triple:
        "¿Necesitas más? {max} tiene al menos el triple de cada límite de {pro}, por {price} al mes.",
      double:
        "¿Necesitas más? {max} tiene al menos el doble de cada límite de {pro}, por {price} al mes.",
      more: "¿Necesitas más? {max} supera cada límite de {pro}, por {price} al mes.",
    },
    updateCard: "Actualizar tarjeta",
    howToSwitch: "Cómo cambiar",
    testMode: "Modo de prueba",
    testModeLine: "Cancelar o actualizar tu tarjeta te devuelve a Free.",
    compare: "Comparar planes",
    tryFor: "Prueba {plan} por {price}",
    upgradeTo: "Mejorar a {plan}",
    resumeTrial: "Reanudar la prueba",
    resumePlan: "Reanudar el plan",
    change: "Cambiar de plan",
    cancelTrial: "Cancelar la prueba",
    cancelPlan: "Cancelar el plan",
  },
  usage: {
    title: "Uso",
    meters: {
      tailor: "Versiones adaptadas",
      letter: "Cartas, respuestas y preparación",
      fix: "Correcciones de línea",
      import: "Lecturas de currículum con IA",
      draft: "Borradores con Otto",
      github: "Borradores de proyectos de GitHub",
    },
    trialEnds: "Esta prueba · termina el {day}",
    trial: "Esta prueba",
    monthResets: "Este mes · se reinicia el {day}",
    month: "Este mes",
    allUsed: "Todo usado por ahora.",
    allUsedTrial: "Todo usado. Tendrás más cuando termine la prueba, el {day}.",
    allUsedOn: "Todo usado. Tendrás más el {day}.",
    used: "{used} de {limit} usados",
    of: "de {limit}",
    proOnly:
      "Las adaptaciones, las cartas, las lecturas de currículum con IA y los portafolios vienen con {pro}.",
    hideRest: "Ocultar los demás límites",
    showRest: "Mostrar todos los límites",
    basicReader:
      "Las cargas siguen funcionando después de las lecturas con IA, con el lector básico.",
  },
  credit: {
    title: "Crédito",
    neverExpires: "No vence",
    about: {
      one: "aproximadamente {count} versión adaptada",
      other: "aproximadamente {count} versiones adaptadas",
    },
    none: "Aún no tienes crédito",
    usable: "Solo se usa cuando se agota lo incluido en tu plan este mes.",
    waits:
      "El crédito funciona en {pro} y {max}, una vez que termine cualquier prueba. Tu saldo espera hasta entonces.",
    add: "Agregar crédito",
    buys: "{price} = {list}",
    or: "{list} o {last}",
    from: "{buys}. Desde {min}, en dólares enteros.",
    maxHint:
      "Agregaste {added} de crédito este mes. {max} cuesta {extra} más que {pro} e incluye {more} versiones adaptadas al mes, frente a las {less} de {pro}.",
    hideHistory: "Ocultar el historial de crédito",
    showHistory: "Mostrar el historial de crédito",
    historyFailed: "No se pudo cargar tu historial de crédito",
    nothing: "Aún no hay nada.",
    added: "Crédito agregado",
    takenBack: "Crédito retirado tras un reembolso",
    aiHelp: "Ayuda de IA",
    labels: {
      tailor: { one: "{count} versión adaptada", other: "{count} versiones adaptadas" },
      letter: { one: "{count} carta", other: "{count} cartas" },
      fix: { one: "{count} corrección de línea", other: "{count} correcciones de línea" },
      import: {
        one: "{count} lectura de currículum con IA",
        other: "{count} lecturas de currículum con IA",
      },
      draft: { one: "{count} borrador con Otto", other: "{count} borradores con Otto" },
      github: {
        one: "{count} borrador de proyecto de GitHub",
        other: "{count} borradores de proyectos de GitHub",
      },
    },
  },
  payment: {
    title: "Método de pago",
    ending: "{brand} terminada en {last4}",
    expires: "Vence {date}",
    lastCard: "La tarjeta de tu último pago",
    keptBy: "Dodo Payments guarda tu tarjeta.",
    merchant:
      "Facturado por Dodo Payments, nuestro comerciante registrado. Los cargos aparecen como DODOPAY en tu estado de cuenta.",
  },
  history: {
    title: "Historial de facturación",
    loadFailed: "No se pudieron cargar tus pagos",
    none: "Aún no hay pagos.",
    date: "Fecha",
    item: "Concepto",
    amount: "Monto",
    status: "Estado",
    invoice: "Factura",
    plusTax: "más impuestos, si aplican",
    invoiceFailed: "No se pudo descargar esa factura",
    download: "Descargar la factura de {item}, {date}",
    statuses: {
      paid: "Pagado",
      processing: "En proceso",
      failed: "Fallido",
      refunded: "Reembolsado",
      upcoming: "Próximo",
    },
  },
  status: {
    pickUp: "Seguir donde lo dejaste",
    dashboard: "Ir a tu panel",
    stillShowing: "¿Sigue apareciendo {plan}?",
    checkAgain: "Volver a comprobar",
    slowFree:
      "Los pagos pueden tardar unos minutos en llegarnos. Vuelve a comprobar en un rato o escribe a <link>{email}</link>.",
    slowPaid:
      "Los pagos pueden tardar unos minutos en llegarnos, así que vuelve a comprobar en un rato. Si rechazaron tu tarjeta, sigues en {plan}: actualiza tu tarjeta abajo y vuelve a intentarlo, o escribe a <link>{email}</link>.",
    finishing: "Terminando la mejora de tu plan",
    finishingDetail:
      "Tu nuevo plan puede tardar un minuto en aparecer. Esta página vuelve a comprobar sola.",
  },
  preferences: {
    writingStyle: "Estilo de escritura",
    writingStyleIntro:
      "Tono, extensión, ortografía y despedida para todo lo que Otto escribe por ti.",
    jobSearch: "Búsqueda de empleo",
    jobSearchIntro:
      "Dónde puedes trabajar y qué estás buscando, para que Empleos muestre primero las ofertas adecuadas.",
    reminders: "Recordatorios",
    remindersIntro:
      "Recordatorios para hacer seguimiento de los empleos a los que postulas, en la campanita; tus entrevistas en tu calendario, y tu diario de carrera mensual.",
  },
  style: {
    loadFailed: "No se pudo cargar tu estilo de escritura",
    intro:
      "Se usa en tus cartas de presentación, respuestas de postulación y mensajes de contacto. Otto lo sigue, pero tu historial laboral sigue saliendo solo de tu currículum, y Otto nunca inventa nada.",
    tone: "Tono",
    length: "Extensión",
    spelling: "Ortografía",
    tones: {
      natural: { label: "Natural", hint: "Sencillo y amable, como escribe una persona cuidadosa." },
      warm: { label: "Cálido", hint: "Amable y cercano, sin dejar de ser profesional." },
      direct: { label: "Directo", hint: "Frases cortas, al grano." },
      formal: { label: "Formal", hint: "Pulido y tradicional, sin contracciones." },
    },
    lengths: {
      standard: { label: "Estándar", hint: "Unas 200 palabras por carta, 120 por mensaje." },
      shorter: { label: "Más corto", hint: "Unas 140 palabras por carta, 80 por mensaje." },
    },
    spellings: {
      us: { label: "Inglés de EE. UU.", hint: "organize, color, résumé" },
      uk: { label: "Inglés británico", hint: "organise, colour, CV" },
    },
    signOff: "Despedida",
    signOffHint: "Cierra tus cartas de presentación y tus mensajes.",
    signOffPlaceholder: "Saludos cordiales",
    notes: "Notas para Otto",
    notesHint:
      "Cualquier otra cosa que deba tener en cuenta, como “Menciona que puedo mudarme” o “Mantenlo modesto, sin superlativos”.",
    notesLeft: "Te quedan {count} caracteres en tus notas.",
    saveFailed: "No se pudo guardar tu estilo de escritura",
    reset: "Restablecer",
    saving: "Guardando…",
    saved: "Guardado",
    asYouGo: "Los cambios se guardan solos.",
  },
  work: {
    title: "Dónde puedes trabajar",
    intro:
      "Dónde vives, tu zona horaria y tus necesidades de visa. Empleos marca las ofertas que dicen que no pueden contratarte y puede ocultarlas. Solo tú puedes ver esto.",
    loadFailed: "No se pudo cargar tu perfil laboral",
  },
  lookingFor: {
    title: "Lo que buscas",
    intro:
      "El puesto, el nivel y el lugar que Empleos pone primero. Se deduce de tu currículum hasta que elijas.",
    loadFailed: "No se pudo cargar lo que buscas",
    change: "Toca una parte para cambiarla. Se guarda solo.",
    pick: "Toca una parte para elegir un puesto y un nivel. Se guarda solo.",
  },
  reminders: {
    calendar: "Calendario",
    saved: "Ahora los recordatorios llegan {days} días después de postular.",
    title: "Recordatorios de seguimiento",
    intro:
      "Cuando marcas un empleo como postulado, Otto programa un recordatorio de seguimiento y lo muestra en la campanita de tu panel, con Listo y Posponer {days} días. El día antes de una entrevista y esa misma mañana, Otto también te lo recuerda ahí, y a la mañana siguiente te pregunta cómo te fue. Las nuevas coincidencias y las visitas a tus enlaces también aparecen ahí.",
    loadFailed: "No se pudo cargar tu configuración de recordatorios",
    after: "Recordarme hacer seguimiento después de",
    counted: "Se cuenta desde el día en que postulaste.",
    days: "{count} días",
  },
  careerLog: {
    title: "Diario de carrera",
    intro:
      "Una nota de un minuto cada mes sobre lo que lograste, para que tu próximo currículum se escriba solo. Gratis en todos los planes, aunque dejes de pagar.",
    checkinsOn: "Los repasos mensuales están activados.",
    checkinsOff: "Los repasos mensuales están desactivados.",
    emailsOn: "Los correos de repaso están activados.",
    emailsOff: "Los correos de repaso están desactivados.",
    resumed: "Los repasos están activados de nuevo.",
    paused: "Los repasos están en pausa.",
    daySaved: "Se guardó el día del repaso.",
    monthly: "Repaso mensual",
    monthlyHint:
      "Tres preguntas rápidas una vez al mes, en la campanita y en Inicio. Desactivado hasta que lo actives.",
    askOn: "Preguntarme el",
    next: "Próximo: {day}.",
    onceAMonth: "Una vez al mes.",
    week: "Semana del mes",
    weekday: "Día de la semana",
    weeks: {
      first: "Primer",
      second: "Segundo",
      third: "Tercer",
      fourth: "Cuarto",
      last: "Último",
    },
    pause: "Pausa",
    pausedUntil: "En pausa hasta el {day}.",
    busy: "¿Mes ocupado? Sáltate uno o tres repasos.",
    pausedOption: "En pausa hasta el {day}",
    resumeNow: "Reanudar ahora",
    notPaused: "Sin pausa",
    pauseMonth: "Pausar un mes",
    pauseThree: "Pausar 3 meses",
    email: "Correo de repaso",
    emailHint:
      "Un correo corto ese día, nunca más de uno al mes. La campanita e Inicio te preguntan de todos modos.",
    open: "Abrir tu diario de carrera",
    loadFailed: "No se pudo cargar la configuración de tu diario de carrera",
    on: "Activado",
    off: "Desactivado",
  },
  profile: {
    title: "Correo e inicio de sesión",
    google:
      "Inicias sesión con Google o con un código de 6 dígitos enviado a este correo. Sin contraseña.",
    code: "Inicias sesión con un código de 6 dígitos enviado a este correo. Sin contraseña.",
    signOut: "Cerrar sesión",
    signOutFailed: "No se pudo cerrar tu sesión",
    signedOut: "Cerraste sesión.",
  },
  invite: {
    title: "Invita a tus amigos",
    intro:
      "Cuando un amigo se registra con tu enlace y revisa un currículum, cada uno recibe {fix} correcciones de línea y {tailor} versiones adaptadas más ese mes.",
    loadFailed: "No se pudo cargar tu enlace de invitación",
    shareText:
      "Uso {brand} para ver lo que el software de selección lee en mi currículum. Regístrate con mi enlace y revisa el tuyo, y los dos recibimos {fix} correcciones de línea más.",
    copyFailed: "No se pudo copiar el enlace",
    copyYourself: "Selecciónalo y cópialo tú.",
    yourLink: "Tu enlace de invitación",
    share: "Compartir",
    linkCopied: "Enlace de invitación copiado.",
    progress: "Amigos que te dieron extras",
    progressValue: "{done} de {total}",
    nobody: "Nadie se ha unido con tu enlace todavía.",
    joined: {
      one: "Se unió {count} amigo; currículums revisados: {checked}.",
      other: "Se unieron {count} amigos; currículums revisados: {checked}.",
    },
    full: "Ya son los {max} amigos que te dan extras. Los nuevos amigos igual reciben los suyos.",
    upTo: "Extras por hasta {max} amigos.",
    extrasTrial:
      "Durante tu prueba tienes {fix} correcciones de línea y {tailor} versiones adaptadas más gracias a tus invitaciones.",
    extrasMonth:
      "Este mes tienes {fix} correcciones de línea y {tailor} versiones adaptadas más gracias a tus invitaciones.",
    free: "En Free, cada amigo suma {fix} correcciones de línea a las {limit} de ese mes. Las adaptaciones vienen con Pro, así que las {tailor} versiones adaptadas esperan: empieza una prueba o mejora tu plan ese mes y cada extra que no hayas usado se va contigo.",
    trial:
      "Los extras se suman a los límites de tu prueba, y los que no uses pasan a tu primer mes pagado.",
    paid: "Los extras se suman a los límites de tu plan {plan}.",
  },
  data: {
    title: "Tus datos",
    intro:
      "Un archivo ZIP con los currículums guardados en tu cuenta, tus cartas, respuestas y mensajes, y los empleos que sigues.",
    download: "Descargar mis datos",
    failed: "No se pudieron descargar tus datos",
  },
  deleteAccount: {
    title: "Eliminar cuenta",
    intro: "Elimina tu cuenta y todo lo guardado en ella. No se puede deshacer.",
    alsoCancels: "Esto también cancela tu plan.",
    downloadFirst: "Descarga tus datos antes si quieres conservarlos.",
    failed: "No se pudo eliminar tu cuenta",
    dialogTitle: "¿Eliminar tu cuenta?",
    dialogIntro:
      "Esto elimina tu cuenta, los currículums respaldados en ella y tu historial de uso. No se puede deshacer.",
    cancel: "Cancelar",
    cancelsPlan: "Esto también cancela tu plan",
    endsNow: "Tu plan de pago termina de inmediato y no se te volverá a cobrar.",
    credit: "Tu crédito de {credit} se elimina con ella y no se podrá volver a usar.",
    browser: "Los currículums guardados en este navegador también se borran.",
    word: "ELIMINAR",
    type: "Escribe <b>{word}</b> para confirmar",
  },
  extension: {
    title: "Extensión de Chrome",
    connected:
      "Conectada desde el {date}. Compara las ofertas de empleo con tu currículum en la misma página y las guarda en tu tablero.",
    connectedIn:
      "Conectada en {count} navegadores desde el {date}. Compara las ofertas de empleo con tu currículum en la misma página y las guarda en tu tablero.",
    pitch:
      "Mira cómo encaja tu currículum con cualquier oferta de empleo, guarda empleos en tu tablero y completa postulaciones en un clic.",
    disconnected: "Otto para Chrome está desconectado",
    everyBrowser: "En todos los navegadores donde estaba.",
    disconnectFailed: "No se pudo desconectar",
    disconnect: "Desconectar",
    soon: "Muy pronto",
    soonStore: "Muy pronto en Chrome Web Store.",
    add: "Agregar a Chrome",
    connect: {
      meta: "Conecta Otto para Chrome",
      title: "Conecta Otto para Chrome",
      doneTitle: "Otto ya está en tu búsqueda de empleo",
      intro:
        "Un toque vincula la extensión a tu cuenta, para que la insignia compare las ofertas con tu currículum.",
      doneIntro:
        "Abre cualquier oferta de empleo. La insignia de Otto te muestra cómo encaja tu currículum, y si puedes aceptar el empleo, antes de que leas una palabra.",
      checkingAccount: "Revisando tu cuenta",
      looking: "Buscando la extensión",
      connecting: "Conectando",
      missing: "Otto para Chrome todavía no está en este navegador",
      added: "Ya la agregué",
      missingStore:
        "Agrega la extensión a Chrome y vuelve a esta pestaña. Si acabas de agregarla, recarga esta página.",
      missingSoon:
        "Otto para Chrome llega muy pronto a Chrome Web Store. Si ya la tienes, recarga esta página.",
      failed: "No se pudo conectar",
      tryAgain: "Intentar de nuevo",
      connectedAs: "Conectado como {email}",
      tryPost:
        "Prueba con una oferta en {sites} o {last}. En cualquier otro sitio, presiona mi botón en la barra de herramientas.",
      board: "Abrir tu tablero",
      close: "Cerrar esta pestaña",
    },
  },
  reminder: {
    meta: "Recordatorio",
    title: "Recordatorios",
    missing: "A ese enlace le falta una parte. Abre tus postulaciones.",
    done: {
      message: "¿Ya hiciste el seguimiento? Márcalo como listo y dejo de recordártelo.",
      label: "Marcar como listo",
    },
    snooze: {
      message:
        "¿Todavía no es momento de hacer seguimiento? Te lo recuerdo de nuevo en {days} días.",
      label: "Posponer {days} días",
    },
    unsubscribe: {
      message:
        "¿Desactivar los correos de recordatorio? Tus recordatorios siguen en la campanita de tu panel.",
      label: "Desactivar los correos de recordatorio",
    },
    snoozeCompany:
      "¿Todavía no es momento de hacer seguimiento con {company}? Te lo recuerdo de nuevo en {days} días.",
    doneRole:
      "¿Ya hiciste el seguimiento con {company} sobre el empleo de {role}? Márcalo como listo y dejo de recordártelo.",
    doneCompany:
      "¿Ya hiciste el seguimiento con {company}? Márcalo como listo y dejo de recordártelo.",
    badUnsubscribe:
      "Ese enlace para darte de baja no es válido. Desactiva los correos en tu página de Cuenta.",
    unsubscribed:
      "Listo. Ya no recibirás correos de recordatorio. La campanita de tu panel los conserva.",
    failed: "Eso no funcionó. Abre tus postulaciones.",
    failedShort: "Eso no funcionó.",
    thatJob: "ese empleo",
    marked: "Marcado como listo. No te avisaré más sobre {name}.",
    movedOn: "{name} ya pasó de Postulada, así que no hay nada que posponer.",
    snoozed: "Pospuesto {days} días. Te avisaré sobre {name} el {day}.",
    applications: "Abrir tus postulaciones",
  },
} satisfies Translation<Messages["account"]>;
