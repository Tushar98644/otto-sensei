import type { Messages } from "..";
import type { Translation } from "../../types";

// The home page, in Spanish.
export default {
  meta: {
    title: "Revisor y creador de currículum ATS gratis, con IA",
    description:
      "Revisa y crea tu currículum ATS gratis con la IA de Otto, más vacantes según tu currículum, seguimiento de postulaciones, preparación para entrevistas y portafolio.",
  },
  cta: {
    check: "Revisar mi currículum",
    continueWith: "Seguir con {title}",
  },
  hero: {
    eyebrow: "Gratis para empezar",
    title: "Toda tu búsqueda de empleo,",
    titleEm: "en <b>un solo lugar</b>.",
    lead: {
      check: "Revisa y corrige tu currículum, y luego encuentra empleos ordenados según tu perfil.",
      track: "Sigue tus postulaciones, prepara entrevistas y comparte un portafolio.",
    },
    featuresLabel: "Lo que hace Otto",
    features: {
      checker: "Revisión de currículum",
      jobs: "{count} vacantes abiertas",
      jobsNoCount: "Vacantes abiertas",
      emailTracking: "Seguimiento por correo",
      interviewPrep: "Preparación para entrevistas",
      portfolio: "Sitio de portafolio",
      extension: "Extensión de Chrome",
      extensionSoon: "Extensión de Chrome, pronto",
    },
    noSignup: "No necesitas registrarte. Tu archivo se lee y luego se borra.",
    another: "O <link>revisa otro archivo</link>. Se lee y luego se borra.",
    jobPost: "¿Tienes una oferta de empleo? <link>Revisa tu compatibilidad</link>.",
  },
  demo: {
    see: "Lo que ves",
    reads: "Lo que lee el software de selección",
    views: { label: "Currículum de ejemplo", see: "Lo que ves", reads: "Lo que lee el software" },
    otto: "Otto, la nutria, asomándose por la ventana",
    plainText: "Texto plano",
    mixed: "Habilidades mezcladas con los empleos",
    captionTitle: "Currículum de ejemplo",
    caption:
      "Las columnas se ven bien para las personas. El software las lee de corrido, de un lado a otro.",
  },
  resume: {
    label:
      "Currículum de ejemplo de {name}, diseñadora de producto. Las habilidades y los idiomas están en una columna a la izquierda y la experiencia laboral en una columna a la derecha, con pequeños íconos junto a su correo y su teléfono.",
    role: "Diseñadora de producto",
    headings: { skills: "Habilidades", languages: "Idiomas", experience: "Experiencia" },
    skills: { research: "Investigación de usuarios", prototyping: "Prototipado" },
    languages: { english: "Inglés", spanish: "Español" },
    jobs: {
      senior: {
        title: "Diseñadora de producto sénior",
        dates: "2021 – hoy",
        bullet: "Rediseñé el checkout. Los pedidos subieron un 18%.",
      },
      designer: {
        title: "Diseñadora de producto",
        dates: "2018 – 2021",
        bullet: "Creé el sistema de diseño del equipo.",
      },
    },
  },
  upload: {
    opening: "Abriendo {name} en el estudio.",
    oneFile: "Elige un solo archivo a la vez.",
    problems: {
      unsupported: "Ese tipo de archivo no es compatible.",
      unsupportedKinds: "Ese tipo de archivo no es compatible. Elige un archivo {kinds}.",
      kinds: "{first} o {last}",
      empty: "Ese archivo está vacío. Elige otro.",
      tooBig: "Ese archivo es demasiado grande. El límite es {limit}.",
    },
    drop: "Suelta tu currículum para revisarlo",
    formats: "PDF o Word (.docx), hasta {size}",
  },
  how: {
    eyebrow: "Cómo funciona",
    title: "Del archivo viejo a un PDF limpio",
    intro: "Cinco pasos. Puedes parar después de cualquiera.",
    step: "Paso {number} · {name}",
    steps: {
      upload: {
        name: "Subir",
        caption: "Sube tu archivo PDF o Word, o empieza desde cero.",
      },
      recruiterView: {
        name: "Vista del reclutador",
        caption:
          "Mira el texto que extrae el software de selección, con revisiones claras y el motivo de cada una.",
      },
      fix: {
        name: "Corrige líneas con Otto",
        caption:
          "Otto te pide el dato que falta y luego escribe la línea a partir de tu respuesta. Escríbela o dila en voz alta. Nunca inventa cifras, y tú conservas, editas u omites cada sugerencia.",
      },
      tailor: {
        name: "Adapta a un empleo",
        caption: "Pega una oferta de empleo para ver qué palabras clave tienes y cuáles te faltan.",
      },
      download: {
        name: "PDF gratis",
        caption:
          "Descarga gratis un PDF limpio y vuelve a revisarlo. Todos los formatos se leen de arriba abajo, con los títulos en su propia línea, en tamaño Carta o A4.",
      },
    },
    upload: { meta: "PDF · 1 página", reading: "Leyendo tu archivo" },
    checks: {
      meta: { one: "{count} revisión", other: "{count} revisiones" },
      items: {
        columns: {
          title: "Diseño a dos columnas",
          detail: "Tus habilidades se mezclaron con tu historial laboral.",
        },
        icons: {
          title: "Íconos en tu línea de contacto",
          detail: "Se convierten en símbolos sueltos. Funcionan mejor las palabras simples.",
        },
        contact: {
          title: "Correo y teléfono encontrados",
          detail: "Los reclutadores pueden contactarte.",
        },
      },
    },
    fixer: {
      addNumber: "Agrega una cifra",
      before: "Antes: ",
      line: "Responsable de gestionar las cuentas de redes sociales",
      questions: "1 pregunta",
      question: "¿Cuánto crecieron los seguidores?",
      you: "Tú",
      saidOutLoud: "Dicho en voz alta",
      answer: "Se triplicaron en 6 meses. Publicaba videos cortos todos los días.",
      looksGood: "Se ve bien",
      after: "Después: ",
      fixed:
        "Multipliqué por 3 los seguidores en redes sociales en 6 meses publicando videos cortos a diario",
      updated: "Línea actualizada",
    },
    tailor: {
      jobPost: "Oferta de empleo",
      jobTitle: "Diseñador de producto sénior",
      onResume: "En tu currículum",
      missing: "Falta",
      onlyIfTrue: "· agrégala solo si es cierto",
      terms: { accessibility: "Accesibilidad", abTesting: "Pruebas A/B" },
    },
    download: {
      before: "Antes",
      beforeText: "problemas en el archivo viejo",
      after: "Después",
      afterText: "problemas en tu nuevo PDF",
    },
  },
  jobs: {
    eyebrow: "Empleos · nuevos cada día",
    title: "{count} vacantes abiertas, ordenadas según tu currículum",
    titleNoCount: "Vacantes abiertas, ordenadas según tu currículum",
    intro:
      "Otto lee cada día las páginas de empleo de las empresas y te muestra solo empleos de tu área, los que mejor encajan primero, con un motivo claro para cada uno. Free muestra tus {free} mejores; Pro te compara con todos.",
    caption:
      "La página de Empleos real: un representante de ventas con una pasantía en marketing digital elige “Cualquier puesto de marketing”, y Otto ordena empleos de marketing de nivel inicial según el SEO, Google Ads y HubSpot de su currículum.",
    points: {
      matched: {
        title: "Tu tipo de trabajo, comparado con tu currículum",
        text: "Otto entiende qué significa cada título de puesto, así que un ingeniero de software ve ofertas de desarrollador backend, pero no de soporte ni de ventas. Cada empleo muestra lo que tu currículum tiene y lo que le falta.",
      },
      visa: {
        title: "Visa y permiso de trabajo, verificados",
        text: "En Pro, dile a Otto dónde puedes trabajar: las ofertas que dicen que no pueden contratarte quedan marcadas, y un interruptor las oculta. Las empresas que están en los registros públicos de patrocinadores H-1B de EE. UU. y del Reino Unido lo indican.",
      },
      role: {
        title: "El puesto, el nivel y el lugar que buscas",
        text: "Elige un puesto, un nivel y un lugar, o solo remoto. Para empezar, Otto los deduce de tu currículum.",
      },
      direct: {
        title: "Directo de la empresa",
        text: "Los empleos vienen de las páginas de empleo de las propias empresas y de fuentes públicas de empleo de EE. UU., el Reino Unido, Australia, Latinoamérica, Europa y más, leídas cada día. Cada uno enlaza a la oferta original.",
      },
    },
    link: "Ver mis empleos compatibles",
  },
  emailTracking: {
    eyebrow: "Seguimiento por correo · Pro",
    title: "Tus postulaciones se actualizan solas",
    intro:
      "Los correos de los procesos de selección ya dicen en qué punto está cada postulación. Reenvíalos a Otto una vez, y tu tablero se mantiene al día sin que arrastres ni una sola tarjeta.",
    caption:
      "El tablero real mientras llegan tres correos: el agradecimiento de Northwind agrega el empleo, la invitación de Brightloop lo pasa a Entrevistas con la fecha, y la actualización de Acme lo cierra.",
    points: {
      setup: {
        title: "Se configura una vez, en Gmail",
        text: "Recibes tu propia dirección de Otto y un filtro de Gmail que le reenvía solo los correos de empleo. Tres pasos, unos minutos, con una prueba al final.",
      },
      board: {
        title: "El tablero se mueve solo",
        text: "Un agradecimiento agrega el empleo a Postulado, una invitación a entrevista o a prueba lo pasa a Entrevistas con la fecha, y las ofertas y los rechazos van a su lugar. Una tarjeta nunca retrocede.",
      },
      rules: {
        title: "Leído con reglas, guardando lo mínimo",
        text: "Otto lee cada correo con reglas fijas, sin IA, y guarda solo el dominio del remitente, el asunto y lo que encontró. El correo que no puede verificar te espera en una lista “Revisar esto”.",
      },
    },
  },
  interviewPrep: {
    eyebrow: "Preparación para entrevistas · Pro",
    title: "Qué te van a preguntar,",
    titleEm: "y qué vas a responder.",
    intro:
      "Para cada entrevista, Otto lee la oferta de empleo y tu currículum y escribe una guía de preparación para ese empleo. Luego la practicas en voz alta, con Otto haciendo las preguntas.",
    caption:
      "Una guía real para una entrevista de diseñador de producto en Northwind: las preguntas probables, una historia del currículum, la ronda de oficio de diseño y el modo práctica.",
    points: {
      questions: {
        title: "Preguntas probables, ronda por ronda",
        text: "De la apertura al cierre, cada pregunta dice qué está evaluando el entrevistador, los puntos que debes tocar y la repregunta que puedes esperar. Luego vienen preguntas para que hagas tú.",
      },
      stories: {
        title: "Historias a partir de tus propias líneas",
        text: "Cada historia parte de una línea de tu currículum, contada como situación, tarea, acción y resultado. Lo que tu currículum no dice queda en blanco para que lo completes, nunca inventado.",
      },
      craft: {
        title: "Una ronda sobre tu oficio, y luego práctica",
        text: "Los puestos técnicos tienen una ronda técnica sobre tus proyectos, conceptos clave y diseño de sistemas. Diseñadores y gerentes de producto tienen una sobre su oficio. Luego Otto hace de entrevistador, una pregunta a la vez.",
      },
    },
    also: {
      title: "También en Otto",
      letters: {
        label: "Cartas",
        text: "Cartas de presentación, mensajes de contacto y respuestas a preguntas de postulación, escritos solo a partir de tu currículum y la oferta de empleo.",
      },
      careerLog: {
        label: "Bitácora profesional",
        text: "Una nota de un minuto sobre tu trabajo cada mes, gratis en todos los planes. En Pro, Otto convierte las notas en líneas de currículum con tus propias cifras.",
      },
    },
  },
  extension: {
    eyebrow: "Otto para Chrome",
    eyebrowSoon: "Otto para Chrome · muy pronto",
    title: "Postúlate más rápido, desde la oferta misma",
    intro:
      "Mira qué tan compatible eres antes de leer toda la oferta, guárdala en tu tablero con un clic y deja que Otto llene los formularios largos de postulación con tu currículum. Tú revisas cada respuesta y presionas Enviar.",
    onPost: "En la oferta de empleo",
    onForm: "En el formulario de postulación",
    points: {
      badge: {
        title: "Una insignia de compatibilidad en la oferta",
        text: "En LinkedIn, Naukri y las páginas de empleo de las empresas, la insignia de Otto muestra qué habilidades de la oferta tiene tu currículum y cuáles le faltan. La revisión se hace en tu navegador y nunca envía la oferta a ningún lado.",
      },
      save: {
        title: "Guárdalo en tu tablero",
        text: "Guardar pone el empleo en Por postular, en tu tablero de Postulaciones, con una copia de la oferta por si la retiran.",
      },
      tailor: {
        title: "Adaptar y Carta desde la oferta",
        text: "En {plans}, Adaptar abre Otto con tu currículum adaptado a ese empleo, y Carta, con una carta de presentación para él.",
      },
      fill: {
        title: "Llenar con Otto en formularios de postulación",
        text: "En {plans}, Otto llena formularios de Greenhouse, Lever, Ashby y Workday con tu currículum y tus respuestas guardadas. Tú lo revisas y presionas Enviar. Otto nunca llena preguntas de autoidentificación ni de consentimiento.",
      },
    },
    post: {
      label:
        "Ejemplo: la insignia de Otto en la esquina de una oferta de {title}, con {found} de {total} habilidades encontradas y falta {missing}.",
      title: "Diseñador de producto sénior",
      where: "Remoto, Europa",
      careers: "Empleos en {company}",
      meta: "Oferta de empleo",
      about: "Sobre el puesto",
      bring: "Lo que aportarás",
      found: "de <b>{total}</b> habilidades encontradas",
      missing: "Falta: <b>{skill}</b>",
      skill: "accesibilidad",
      actions: { save: "Guardar", tailor: "Adaptar", letter: "Carta" },
    },
    form: {
      label:
        "Ejemplo: Llenar con Otto en el formulario de postulación de {company}, con {filled} campos llenos, el currículum adjunto, una respuesta redactada a “{question}” y la pregunta de género en blanco para ti.",
      window: "{company} · Postularse",
      meta: "Formulario de postulación",
      heading: "Postúlate a este empleo",
      fields: {
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Correo electrónico",
        company: "Empresa actual",
        portfolio: "Portafolio",
      },
      resume: "Currículum/CV",
      question: "¿Por qué {company}?",
      answer:
        "Me gusta cómo {company} hace fáciles de leer los datos complejos, y aportaría ese mismo cuidado a su producto, desde la investigación hasta los prototipos.",
      draft: "Redactar con Otto",
      selfId: "Autoidentificación voluntaria",
      gender: "Género",
      select: "Seleccionar…",
      submit: "Enviar postulación",
      filled: "Se llenaron {count} campos y se adjuntó <b>{file}</b>.",
      leftForYou:
        "Pendiente para ti: 1 pregunta de autoidentificación o de consentimiento. Otto nunca responde esas.",
      checkEvery:
        "Revisa cada respuesta y luego presiona Enviar por tu cuenta. Otto nunca envía un formulario.",
    },
    addToChrome: "Agregar a Chrome",
    newTab: "(se abre en una pestaña nueva)",
    comingSoon: "Muy pronto",
    notInStore: "Todavía no está en Chrome Web Store.",
  },
  portfolio: {
    eyebrow: "Portafolio · lo alojamos por ti",
    title: "Un portafolio de verdad,",
    titleEm: "en tu propio enlace.",
    intro:
      "No es tu currículum convertido en página web. Elige uno de {count} diseños y Otto lo llena con tus proyectos, experiencia, textos y enlaces. Nosotros lo alojamos, así que no tienes nada que configurar. {offer}",
    offer: "Viene con Pro.",
    offerTrial: "Viene con Pro, y puedes empezar con una prueba de {days} días.",
    templates: {
      paper:
        "Dibujado a mano: tu nombre en marcador sobre un zorro junto al mar, tarjetas entintadas y subrayados ondulados, de día o de noche.",
      gazette:
        "Tu página como un periódico de 1926: una cabecera en letra gótica, tu titular, columnas con filetes y una cinta de noticias.",
      reel: "Un título enorme que gira sobre una esfera 3D, y luego cada proyecto en el marco de un dispositivo.",
    },
    link: "Crear mi portafolio",
  },
  wontDo: {
    title: "Lo que Otto no hará",
    pledges: {
      score: {
        claim: "Inventar una puntuación.",
        reason: "Recibes revisiones claras con sus motivos, no un número misterioso sobre 100.",
      },
      numbers: {
        claim: "Inventar tus cifras.",
        reason: "Otto te pide tus cifras y resultados reales, y tú apruebas cada cambio.",
      },
      download: {
        claim: "Cobrarte por descargar.",
        reason: "Edita y descarga todos los PDF que quieras. Sin muro de pago en el último paso.",
      },
      file: {
        claim: "Quedarse con tu archivo.",
        reason:
          "Leemos lo que subes para obtener el texto y luego lo descartamos. Tus currículums se quedan en tu navegador, a menos que inicies sesión para respaldarlos. <link>Cómo tratamos los datos</link>",
      },
    },
  },
  pricingTeaser: {
    eyebrow: "Precios",
    title: "Gratis para lo básico.",
    titleEm: "Más cuando la búsqueda se intensifica.",
    free: "<b>{plan}:</b> revisa, corrige y descarga {resumes} en PDF, con {fixes} correcciones de línea de Otto al mes.",
    pro: "<b>{plan}, {price} al mes:</b> adaptación, cartas de presentación, todos los empleos compatibles, hasta {resumes} y {applications}. {close}",
    resumes: { one: "{count} currículum", other: "{count} currículums" },
    trackedApplications: {
      one: "{count} postulación en seguimiento",
      other: "{count} postulaciones en seguimiento",
    },
    trial: "Pruébalo {days} días por {price}.",
    link: "Ver precios",
  },
  faq: {
    title: "Antes de empezar",
    applications: { one: "{count} postulación", other: "{count} postulaciones" },
    items: {
      free: {
        question: "¿De verdad es gratis descargar?",
        answer:
          "Sí. La edición, las revisiones del reclutador y las descargas en PDF son gratis, sin muro de pago en el último paso, y Free incluye {fixes} correcciones de línea al mes con Otto. Pro y Max suman el resto de la ayuda con IA de Otto, más formatos, más currículums y descargas en Word.",
      },
      ats: {
        question: "¿Qué es un ATS?",
        answer:
          "Un sistema de seguimiento de candidatos (applicant tracking system): el software que usa la mayoría de los empleadores para recibir y ordenar postulaciones. Lee el texto de tu archivo, y los diseños llamativos pueden desordenarlo. Otto te muestra exactamente lo que lee.",
      },
      invent: {
        question: "¿Otto inventará cosas en mi currículum?",
        answer:
          "No. Otto te pide datos, como cifras y resultados, y solo usa lo que le dices. Revisas cada cambio antes de que entre en tu currículum.",
      },
      talk: {
        question: "¿Puedo hablar en vez de escribir?",
        answer:
          "Sí. Los cuadros donde le escribes a Otto tienen un micrófono, incluidas las preguntas de Otto cuando corrige una línea. Presiónalo y habla, y vuelve a presionarlo cuando termines. Funciona en cualquier navegador moderno. En algunos navegadores, como Brave y Firefox, tendrás que iniciar sesión. Otto guarda solo el texto.",
      },
      account: {
        question: "¿Necesito una cuenta?",
        answer:
          "No para revisar, editar o descargar. Los respaldos y las {fixes} correcciones de línea de Otto al mes necesitan una cuenta gratis: inicia sesión con Google o con un código de 6 dígitos que te llega por correo, sin contraseña. El resto de la ayuda con IA de Otto, la lista completa de empleos compatibles (Free muestra tus {matches} más cercanos) y el seguimiento de más de {applications} vienen con {pro}. {trialHeadline}: {trialSentence}",
      },
      data: {
        question: "¿Dónde se guardan mis datos?",
        answer:
          "Tus currículums se guardan en tu navegador. Si inicias sesión, también guardamos un respaldo para que puedas abrirlos en cualquier dispositivo. Leemos los archivos que subes para obtener el texto y luego los descartamos. Los detalles están en nuestra <link>política de privacidad</link>.",
      },
      cancel: {
        question: "¿Puedo cancelar cuando quiera?",
        answer:
          "Sí. Cancela tu plan desde la página de tu cuenta cuando quieras. Lo conservas hasta el final del período que pagaste, y no se te vuelve a cobrar.",
      },
      anyJob: {
        question: "¿Sirve para cualquier empleo?",
        answer:
          "Sí, desde tu primer empleo hasta puestos sénior, en cualquier área. La adaptación funciona con cualquier oferta de empleo que pegues. Otto lee mejor los currículums escritos en inglés. Los <link>ejemplos de currículum</link> muestran {count} empleos, desde recién egresados hasta ventas.",
      },
    },
  },
  finalCta: {
    otto: "Otto, la nutria, leyendo un currículum",
    title: "Mira lo que ve el software.",
    note: "Revisar y descargar PDF es gratis. Pro y Max suman más ayuda de Otto.",
  },
} satisfies Translation<Messages["home"]>;
