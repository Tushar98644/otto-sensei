import type { Messages } from "..";
import type { Translation } from "../../types";

// Product and tool pages (resume builder, cover letters, tracker, interview prep, portfolio), in Spanish.
export default {
  common: {
    breadcrumb: "Ruta de navegación",
    home: "Inicio",
    howItWorks: "Cómo funciona",
    questions: "Preguntas",
    keepReading: "Sigue leyendo",
    seePlan: "Mira lo que incluye {pro}",
    trialFor: "{headline} por {price}.",
    checkButtons: { match: "Comparar mi currículum con un empleo", check: "Revisar mi currículum" },
  },
  related: {
    examples: {
      title: "Ejemplos de currículum",
      text: "{count} ejemplos completos por empleo, cada uno con líneas más sólidas, habilidades y errores comunes.",
    },
    templates: {
      title: "Plantillas de currículum",
      text: "{count} formatos, cada uno en una columna de texto real. {free} son gratis.",
    },
    jobMatch: {
      title: "Verificación de compatibilidad",
      text: "Pega tu currículum y una oferta de empleo para ver cuáles de sus habilidades muestras. Gratis, sin iniciar sesión.",
    },
    ats: {
      title: "Guías de ATS",
      text: "Notas con fuentes sobre {count} sistemas de selección: cómo leen los archivos, filtran a los candidatos y los clasifican con IA.",
    },
    compare: {
      title: "Compara Otto Sensei",
      text: "En qué se diferencia Otto de {names}, según las páginas de cada producto.",
    },
    coverLetters: {
      title: "Generador de cartas de presentación con IA",
      text: "Cartas de presentación, mensajes de contacto y respuestas a preguntas de postulación, a partir de tu currículum y la oferta de empleo.",
    },
    tracker: {
      title: "Seguimiento de postulaciones",
      text: "Tus postulaciones en un tablero, con el currículum que enviaste, recordatorios de seguimiento y fechas de entrevista.",
    },
    interviewPrep: {
      title: "Preparación para entrevistas con IA",
      text: "Preguntas probables, historias a partir de las líneas de tu currículum y preguntas para hacer, para cada entrevista.",
    },
    portfolio: {
      title: "Creador de sitios de portafolio",
      text: "Un sitio de portafolio creado a partir de tu currículum en uno de {count} diseños, alojado en tu propio enlace.",
    },
  },
  builder: {
    meta: {
      title: "Creador de currículum gratis con IA y revisión ATS",
      description:
        "Crea tu currículum gratis: empieza de cero o con un archivo, mira lo que lee el software de selección, corrige líneas débiles con la IA de Otto y descarga un PDF limpio.",
    },
    crumb: "Creador de currículum",
    eyebrow: "Creador de currículum gratis",
    title: "Un creador de currículum",
    titleEm: "que muestra lo que lee el software.",
    intro:
      "Empieza desde un archivo, una página en blanco o un ejemplo. Otto revisa cada línea, te muestra el texto que el software de selección extrae de tu archivo, y el PDF se descarga gratis.",
    action: "Crear mi currículum",
    seeExamples: "Ver ejemplos de currículum",
    stepsTitle: "Cómo Otto crea y revisa un currículum",
    stepsIntro:
      "Cinco pasos en el estudio. Puedes parar después de cualquiera; tu currículum se guarda en tu navegador a medida que avanzas.",
    steps: {
      start: {
        title: "Empieza con lo que tienes",
        text: "Sube un archivo PDF o Word, importa la exportación de datos de LinkedIn o un archivo JSON Resume, empieza desde una página en blanco o abre uno de los <link>ejemplos de currículum</link>. Con {pro}, Crear con Otto escribe un primer borrador a partir de unas pocas respuestas sobre tus empleos.",
      },
      read: {
        title: "Mira lo que lee el software de selección",
        text: "La vista del reclutador muestra el texto que un sistema de selección extrae de tu archivo, en orden, con revisiones claras de datos de contacto, títulos, columnas, tablas, íconos, fechas y extensión. Cada problema viene con su motivo.",
      },
      fix: {
        title: "Corrige líneas débiles con Otto",
        text: "La revisión de líneas de Otto marca las líneas que suenan a lista de tareas, no muestran un resultado o se apoyan en frases hechas. Pídele que corrija una y primero te pedirá el dato que falta; luego escribirá la línea a partir de tu respuesta. Tú conservas, editas u omites cada sugerencia. {free} incluye {fixes} correcciones de línea al mes.",
      },
      match: {
        title: "Compáralo con un empleo",
        text: "Pega una oferta de empleo o su enlace para ver qué habilidades menciona, cuáles muestra tu currículum y cuáles faltan. La <link>verificación de compatibilidad</link> funciona sin iniciar sesión. Con {pro}, Otto adapta una copia de tu currículum a la oferta.",
      },
      download: {
        title: "Descarga un PDF limpio",
        text: "Elige un formato y papel Carta o A4, y descarga. Cada formato es una columna de texto real, probada leyendo de nuevo el PDF. {freeFormats} son gratis y sin límite de descargas; los otros {proFormats} formatos y las descargas en Word vienen con {pro}.",
      },
    },
    plans: {
      title: "Qué es gratis y qué suma {pro}",
      intro:
        "Precios en dólares estadounidenses. Pueden aplicar impuestos. {max} cuesta {price} al mes para tener más ayuda de Otto cada mes.",
      freeCta: "Crear mi currículum",
      freeNote: "Sin tarjeta",
      paidCta: "Ver {pro} y {max}",
      cancelAnytime: "Cancela cuando quieras",
    },
    audiencesTitle: "Para quién es",
    audiences: {
      freshers: {
        title: "Recién egresados y estudiantes",
        text: "Pon Educación primero, escribe los proyectos como si fueran empleos y mantenlo en una página. El <link>ejemplo para recién egresados</link> muestra la estructura para un B.Tech o cualquier otro graduado, y revisar y descargar PDF no cuesta nada.",
      },
      changing: {
        title: "Cambiar de empleo",
        text: "Sube el currículum que tienes. La vista del reclutador muestra qué corregir primero, y la verificación de compatibilidad muestra qué habilidades pide el siguiente empleo que tu currículum aún no muestra.",
      },
      abroad: {
        title: "Postular en el extranjero",
        text: "Elige papel Carta para EE. UU. y Canadá, y A4 para la mayoría de los demás lugares. No incluyas foto, fecha de nacimiento ni estado civil, y escribe los montos en la moneda del empleador.",
      },
      many: {
        title: "Postular a muchos empleos",
        text: "{pro} guarda una copia adaptada para cada empleo, escribe cartas de presentación y respuestas a preguntas de postulación, y sigue hasta {tracked} postulaciones con recordatorios de seguimiento.",
      },
    },
    indiaTitle: "Currículums para empleos en India",
    indiaIntro:
      "CTC, período de preaviso, Naukri y los hábitos de biodata de las plantillas antiguas: dónde va cada cosa y qué dejar fuera.",
    india: {
      ctc: {
        title: "Deja el CTC fuera del currículum",
        text: "Los reclutadores piden el CTC actual y el esperado en el formulario de postulación, en tu perfil de Naukri o en la primera llamada. Déjalo fuera de la página, para que un solo currículum sirva para todas las postulaciones. Con {pro}, cuando Otto redacta una respuesta a una pregunta sobre salario, deja un espacio en blanco para que lo completes.",
      },
      notice: {
        title: "Indica tu período de preaviso donde te lo pidan",
        text: "Ponlo en el formulario de postulación o en tu nota de presentación, no debajo de tu nombre. Otto nunca lo adivina: con {pro}, una respuesta redactada que necesite tu período de preaviso lleva un espacio en blanco entre corchetes para que lo completes.",
      },
      naukri: {
        title: "Cuenta la misma historia en Naukri",
        text: "Sube a tu perfil de Naukri el PDF que descargues aquí, y usa en el perfil el mismo título de puesto y las mismas habilidades clave que en el currículum. Así, un reclutador que te encuentre ahí verá la misma historia dos veces.",
      },
      biodata: {
        title: "Olvida los viejos datos de biodata",
        text: "La foto, la fecha de nacimiento, el estado civil, el nombre del padre y una declaración firmada vienen de plantillas antiguas. La mayoría de los empleadores no los pide, y los formatos de Otto no tienen lugar para una foto.",
      },
      marks: {
        title: "Muestra tus notas mientras importen",
        text: "Para recién egresados, el CGPA y las notas de Class XII todavía cuentan, porque muchas ofertas de campus y de trainee fijan una nota mínima. Después de unos años de trabajo, basta con el título y la universidad.",
      },
    },
    examplesTitle: "Empieza con un ejemplo",
    examplesIntro:
      "Cada uno es un currículum completo que puedes abrir en el estudio y hacer tuyo. <link>Ver los {count} ejemplos</link>.",
    faq: {
      free: {
        question: "¿Este creador de currículum es realmente gratis?",
        answer:
          "Sí. Crear, revisar y descargar un currículum en PDF es gratis, en {freeFormats}, sin límite de descargas y sin tarjeta. {free} también incluye {fixes} correcciones de línea de Otto al mes. {pro} cuesta {price} al mes con adaptación, cartas de presentación, todos los formatos y descargas en Word.",
      },
      ai: {
        question: "¿Es un creador de currículum con IA?",
        answer:
          "Sí, con límites a propósito. La IA de Otto corrige líneas, adapta currículums y escribe cartas de presentación, pero solo a partir de los datos que le das: te pide cifras en vez de inventarlas, y tú apruebas cada cambio. La vista del reclutador y la revisión de líneas son reglas simples, no IA.",
      },
      ats: {
        question: "¿Mi currículum pasará un ATS?",
        answer:
          "Nadie puede prometerlo, porque cada empleador configura su sistema de selección de forma distinta. Otto te muestra el texto que un sistema extrae de tu archivo y señala lo que suele fallar, como columnas, tablas, íconos y cuadros de texto. Las <link>guías de ATS</link> muestran lo que se sabe que hacen los sistemas comunes.",
      },
      freshers: {
        question: "¿Sirve para recién egresados?",
        answer:
          "Sí. Empieza con el ejemplo para recién egresados o con una página en blanco, pon Educación primero y mantenlo en una página. {freeFormats} son gratis y quedan bien en un primer currículum.",
      },
      ctc: {
        question: "¿Debo poner mi CTC y mi período de preaviso en el currículum?",
        answer:
          "No. Dalos cuando te los pida un formulario de postulación, un reclutador o tu perfil de Naukri. Un currículum sin ellos sirve para todas las postulaciones, y esas cifras cambian más seguido que tu trabajo.",
      },
      signUp: {
        question: "¿Tengo que registrarme?",
        answer:
          "No para crear, revisar o descargar: tu currículum se guarda en tu navegador. Una cuenta gratis lo respalda y activa las {fixes} correcciones de línea de Otto al mes. Inicia sesión con Google o con un código que te llega por correo, sin contraseña.",
      },
      paper: {
        question: "¿Carta o A4?",
        answer:
          "Están los dos. Elige Carta para empleos en EE. UU. y Canadá, y A4 para India, el Reino Unido, Europa y la mayoría de los demás lugares. Tus palabras no cambian en ningún caso.",
      },
      word: {
        question: "¿Puedo descargar mi currículum en Word?",
        answer:
          "Las descargas en Word (.docx) vienen con {pro}. En {free}, las descargas son en PDF, todas las que quieras. <link>Ver precios</link>.",
      },
    },
    closing: {
      otto: "Otto, la nutria, leyendo un currículum",
      title: "Créalo, revísalo, descárgalo.",
      cta: "Crear mi currículum",
      note: "Gratis y sin necesidad de cuenta.",
    },
  },
  coverLetters: {
    meta: {
      title: "Cartas de presentación con IA desde tu currículum",
      description:
        "Otto escribe cartas de presentación, mensajes de contacto y respuestas de postulación con tu currículum y la oferta, y marca lo que no puede respaldar. Viene con {pro}.",
    },
    crumb: "Generador de cartas de presentación",
    eyebrow: "Cartas de presentación · {pro}",
    title: "Un generador de cartas de presentación con IA",
    titleEm: "que se apega a tus datos.",
    action: "Escribir una carta de presentación",
    planNote:
      "Viene con {pro}, {price} al mes por {letters} cartas, mensajes, respuestas y preparaciones de entrevista.",
    check: {
      title: "Revisa la compatibilidad antes de escribir",
      text: "Una carta funciona mejor cuando tu currículum ya muestra lo que pide la oferta. La verificación de compatibilidad y la vista del reclutador son gratis, sin tarjeta.",
    },
    closing: {
      title: "Una carta para cada empleo, a partir de tu propio currículum.",
      art: "Otto, la nutria, señalando una carta",
    },
    intro:
      "Pega una oferta de empleo o su enlace. Otto escribe la carta de presentación a partir de esa oferta y tu currículum, y señala todo lo que deberías revisar antes de enviarla.",
    featuresTitle: "Lo que Otto escribe por ti",
    features: {
      letter: {
        title: "Una carta de presentación para cada empleo",
        text: "Tres párrafos cortos: el puesto y tu mejor dato para él, dos o tres resultados que coinciden con lo que más pide la oferta, y luego por qué este empleo. El saludo y la despedida se agregan por ti.",
      },
      answers: {
        title: "Respuestas a preguntas de postulación",
        text: "Pega una pregunta como “¿Por qué quieres trabajar aquí?” y Otto la responde a partir de tu currículum. Lo que solo tú sabes, como la fecha de inicio o el salario, queda como un espacio en blanco entre corchetes para que lo completes.",
      },
      outreach: {
        title: "Contacto, seguimientos y agradecimientos",
        text: "Un correo corto y una nota de LinkedIn para alguien de la empresa, un seguimiento cuando una postulación se queda en silencio y un agradecimiento después de una entrevista.",
      },
      facts: {
        title: "Nada inventado",
        text: "Otto escribe solo a partir de tu currículum y la oferta de empleo. Si un borrador tiene una cifra que tu currículum no tiene, un verbo más fuerte que el de tu línea o una frase hecha, lo señala para que lo revises.",
      },
      style: {
        title: "Tu tono, tu ortografía",
        text: "Elige un tono ({tones}), una extensión estándar o más corta, y ortografía de EE. UU. o del Reino Unido. Configúralo una vez y todas las cartas lo seguirán.",
      },
      send: {
        title: "Lista para enviar",
        text: "Cópiala, ábrela como correo o descárgala en PDF o Word. Cada una se guarda con el empleo para el que se escribió.",
      },
    },
    steps: {
      job: {
        title: "Elige el empleo",
        text: "Elige un empleo que guardaste, una postulación de tu tablero o una copia adaptada de tu currículum. O pega una oferta de empleo o su enlace.",
      },
      kind: {
        title: "Elige qué escribir",
        text: "Una carta de presentación, una respuesta a una pregunta de postulación o un mensaje de contacto. Otto lo escribe a partir de tu currículum y la oferta.",
      },
      send: {
        title: "Revísalo y envíalo",
        text: "Lee el borrador, corrige lo que Otto señaló y luego cópialo, envíalo por correo o descárgalo.",
      },
    },
    faq: {
      free: {
        question: "¿El generador de cartas de presentación con IA es gratis?",
        answer:
          "Viene con {pro} y {max}. {pro} cuesta {price} al mes e incluye {letters} al mes, compartidas entre cartas de presentación, mensajes de contacto, respuestas y preparación para entrevistas. En {free}, revisar tu currículum, editarlo y descargarlo en PDF sigue siendo gratis. <link>Ver todos los planes</link>.",
      },
      madeUp: {
        question: "¿Otto inventará cosas?",
        answer:
          "No. Escribe solo a partir de tu currículum y la oferta de empleo, y luego compara el borrador con ambos. Una cifra que tu currículum no tiene, un verbo más fuerte que el de tu línea o una frase hecha quedan señalados, para que los corrijas, o los conserves si son ciertos.",
      },
      link: {
        question: "¿Puede escribir a partir del enlace de una oferta?",
        answer:
          "Sí. Pega el enlace y Otto lee la oferta. Si un sitio no la comparte, pega el texto de la oferta.",
      },
      tone: {
        question: "¿Puedo cambiar el tono o la extensión?",
        answer:
          "Sí. Elige un tono {tones}, una extensión estándar o más corta, ortografía de EE. UU. o del Reino Unido, y tu propia despedida. También puedes dejarle una nota a Otto, como “Menciona que puedo mudarme”.",
      },
      why: {
        question: "¿Cómo responde a “¿Por qué quieres trabajar aquí?”?",
        answer:
          "Pega la pregunta y elige el empleo. Otto responde a partir de tu currículum y la oferta en uno o dos párrafos cortos. Lo que solo tú sabes, como qué te atrae de la empresa, queda como un espacio en blanco entre corchetes para que lo completes.",
      },
    },
    tones: { natural: "natural", warm: "cálido", direct: "directo", formal: "formal" },
  },
  tracker: {
    meta: {
      title: "Seguimiento de postulaciones con avisos por correo",
      description:
        "Sigue cada postulación en un tablero, con el currículum que enviaste, recordatorios de seguimiento y fechas de entrevista. En {pro}, se actualiza con tus correos de empleo.",
    },
    crumb: "Seguimiento de postulaciones",
    eyebrow: "Seguimiento de postulaciones",
    title: "Un seguimiento de postulaciones",
    titleEm: "que se mantiene al día con tu correo.",
    action: "Organizar mis postulaciones",
    planNote:
      "{free} sigue {freeApplications}, {pro} hasta {proApplications} con avisos por correo, y {max} hasta {maxApplications}.",
    applications: { one: "{count} postulación", other: "{count} postulaciones" },
    check: {
      title: "Envía un currículum que se lea bien",
      text: "Antes de registrar la próxima postulación, mira cuáles de las habilidades de la oferta muestra tu currículum y qué lee el software de selección de tu archivo. Las dos revisiones son gratis.",
    },
    closing: {
      title: "Todas tus postulaciones, en un tablero.",
      art: "Otto, la nutria, leyendo una postulación",
    },
    intro:
      "Registra cada empleo al que postulas en un tablero, con el currículum que enviaste, un recordatorio para hacer seguimiento y la fecha de la entrevista. En {pro}, tus correos de empleo mueven cada tarjeta por ti.",
    featuresTitle: "Lo que el seguimiento guarda por ti",
    features: {
      board: {
        title: "Un tablero, de Por postular a Oferta",
        text: "Los empleos que guardas esperan en Por postular. Arrastra cada tarjeta a Postulado, Entrevistas y Oferta a medida que te responden, y a Cerrado cuando termine.",
      },
      resume: {
        title: "El currículum que enviaste",
        text: "Cada postulación guarda el currículum o la copia adaptada que enviaste, para que sepas qué leyeron. Cuando hayas enviado algunas, mira qué versión te consigue entrevistas.",
      },
      reminders: {
        title: "Recordatorios de seguimiento",
        text: "Otto te recuerda hacer seguimiento {followUp} días después de postular, o después de los días que elijas. Pospón uno {snooze} días o descártalo. Después de una entrevista, pone uno para {afterInterview} días hábiles más tarde.",
      },
      interviews: {
        title: "Fechas de entrevista",
        text: "Agrega el día y la hora de la entrevista, y luego agrégala a tu calendario con un recordatorio para practicar la mañana anterior.",
      },
      emails: {
        title: "Avisos desde tus correos de empleo ({pro})",
        text: "Obtén tu propia dirección de Otto y agrega un filtro de Gmail que le reenvíe los correos de empleo. Un correo de “gracias por postularte” agrega el empleo a Postulado, y una invitación a entrevista lo pasa a Entrevistas con la fecha.",
      },
      rules: {
        title: "Leído con reglas, guardando lo mínimo",
        text: "Otto lee cada correo reenviado con reglas fijas, no con IA. Guarda el dominio del remitente, el asunto y lo que encontró, y descarta el resto. El correo que no puede verificar espera a que lo revises.",
      },
    },
    steps: {
      add: {
        title: "Agrega una postulación",
        text: "Escribe la empresa, el título del puesto y el enlace, o marca un empleo guardado como postulado. Elige el currículum que enviaste.",
      },
      move: {
        title: "Avánzala",
        text: "Arrastra la tarjeta a medida que te responden, y agrega la fecha y las notas de la entrevista. En {pro}, tus correos de empleo lo hacen por ti.",
      },
      followUp: {
        title: "Haz seguimiento a tiempo",
        text: "Cuando venza un recordatorio, haz seguimiento, pospónlo o marca el empleo como sin respuesta. En {pro}, Otto escribe el mensaje de seguimiento a partir de tu currículum y el empleo.",
      },
    },
    faq: {
      free: {
        question: "¿El seguimiento de postulaciones es gratis?",
        answer:
          "{free} sigue {freeApplications} con un recordatorio de seguimiento, para que lo pruebes. {pro} sigue hasta {proApplications} y suma avisos desde tus correos de empleo, y {max} sigue hasta {maxApplications}. {pro} cuesta {price} al mes.",
      },
      email: {
        question: "¿Cómo se actualiza desde mi correo?",
        answer:
          "En {pro}, eliges un identificador para tu propia dirección de Otto, la agregas en la configuración de reenvío de Gmail, confirmas que es tu Gmail y luego agregas un filtro para los correos de empleo. Toma unos minutos y termina con un correo de prueba. Después, cada correo de empleo mueve su tarjeta, o espera a que lo revises.",
      },
      privacy: {
        question: "¿Otto lee todo mi correo?",
        answer:
          "No. Solo llegan a Otto los correos que reenvía tu filtro de Gmail. Lee cada uno con reglas fijas, no con IA, guarda el dominio del remitente, el asunto y lo que encontró en él, como la empresa, el título del puesto y la fecha de la entrevista, y descarta el resto. Estos registros se eliminan después de seis meses. La <link>política de privacidad</link> tiene los detalles.",
      },
      wrong: {
        question: "¿Y si Otto lee mal un correo?",
        answer:
          "Deshaz cualquier cambio desde la lista de correos que leyó Otto. Cuando no puede verificar quién envió un correo, nada se mueve hasta que lo revises.",
      },
      versions: {
        question: "¿Puedo ver qué currículum consigue entrevistas?",
        answer:
          "Sí. Cada postulación guarda el currículum que enviaste, así que el tablero cuenta las entrevistas y ofertas que consiguió cada versión. Cuando dos versiones tienen {minForRate} o más postulaciones cada una, Otto compara sus tasas de entrevista.",
      },
    },
  },
  interviewPrep: {
    meta: {
      title: "Preparación para entrevistas con IA según tu currículum",
      description:
        "Prepara cada entrevista con preguntas probables, historias con las líneas de tu currículum y preguntas para hacer. Los puestos técnicos suman una ronda técnica.",
    },
    crumb: "Preparación para entrevistas",
    eyebrow: "Preparación para entrevistas · {pro}",
    title: "Preparación para entrevistas con IA",
    titleEm: "basada en tu propio currículum.",
    action: "Preparar una entrevista",
    planNote:
      "Viene con {pro}, {price} al mes por {letters} preparaciones de entrevista, cartas, mensajes y respuestas.",
    check: {
      title: "Mira lo que pide la oferta",
      text: "La verificación de compatibilidad enumera las habilidades que menciona una oferta y dónde las muestra tu currículum, un buen punto de partida para prepararte. Es gratis y sin iniciar sesión.",
    },
    closing: {
      title: "Llega sabiendo qué vas a decir.",
      art: "Otto, la nutria, pensando en una pregunta de entrevista",
    },
    intro:
      "Elige el empleo y el currículum que enviaste. Otto arma tu preparación a partir de ambos: las preguntas que probablemente te harán, historias a partir de las líneas de tu currículum y preguntas para hacerles.",
    featuresTitle: "Qué trae cada guía de preparación",
    features: {
      questions: {
        title: "Preguntas probables, ronda por ronda",
        text: "De la apertura al cierre, cada pregunta dice qué está evaluando el entrevistador, los puntos que debes tocar y la repregunta que puedes esperar.",
      },
      stories: {
        title: "Historias a partir de tus propias líneas",
        text: "Cada historia parte de una línea de tu currículum, contada como situación, tarea, acción y resultado. Lo que tu currículum no dice queda en blanco para que lo completes, nunca inventado.",
      },
      technical: {
        title: "Una ronda técnica para puestos técnicos",
        text: "Para {roles} tipos de puesto, desde ingenieros y científicos de datos hasta gerentes de producto y diseñadores: análisis a fondo de tu propio trabajo, conceptos clave del puesto y una pregunta de diseño, un caso o un ejercicio. Cada uno dice qué cubre una respuesta sólida y los errores que hay que evitar.",
      },
      ask: {
        title: "Preguntas para hacerles",
        text: "Cuatro o cinco preguntas para el final de la entrevista, sobre el producto, el equipo o los objetivos de la oferta. Ninguna sobre sueldo o días libres.",
      },
      practice: {
        title: "Modo práctica",
        text: "Otto hace de entrevistador, una pregunta a la vez. Responde en voz alta con el micrófono o escribiendo, con un temporizador de dos minutos y tu esquema a un toque. Luego vuelve a practicar las que fallaste.",
      },
      day: {
        title: "Todo listo para el día",
        text: "Agrega la entrevista a tu calendario con un recordatorio para practicar la mañana anterior, o imprime la guía para leerla en el camino.",
      },
    },
    steps: {
      job: {
        title: "Elige el empleo",
        text: "Una postulación que llega a Entrevistas te espera con un botón Preparar. O empieza desde el enlace de cualquier empleo, su oferta o solo el título del puesto.",
      },
      setup: {
        title: "Revisa la configuración",
        text: "Usa el currículum que enviaste. Otto elige la ronda técnica según el empleo; si quieres, cambia el puesto o el nivel, de {firstLevel} a {lastLevel}.",
      },
      practice: {
        title: "Lee, completa, practica",
        text: "Repasa las preguntas y las historias, completa cada espacio en blanco con tus propios datos y luego usa el modo práctica.",
      },
    },
    faq: {
      free: {
        question: "¿La preparación para entrevistas con IA es gratis?",
        answer:
          "Viene con {pro} y {max}. Cada guía de preparación cuenta para la misma asignación mensual que las cartas de presentación y los mensajes: {letters} al mes en {pro} y {maxLetters} en {max}. {pro} cuesta {price} al mes.",
      },
      backUp: {
        question: "¿Me dará respuestas que no puedo respaldar?",
        answer:
          "No. Los datos sobre ti salen solo de tu currículum. Cuando una respuesta necesita algo que tu currículum no dice, Otto deja una pregunta entre corchetes, como “[¿Cuántas personas lo usaron?]”, para que la respondas. En la ronda técnica, el conocimiento general se escribe como orientación, nunca como algo que hiciste.",
      },
      roles: {
        question: "¿Qué puestos tienen ronda técnica?",
        answer:
          "{roles} tipos, desde ingenieros de backend, frontend e IA/ML hasta analistas de datos, gerentes de producto y diseñadores. Otto elige uno según el título del puesto y la oferta, y puedes cambiarlo o desactivarlo.",
      },
      aloud: {
        question: "¿Puedo practicar en voz alta?",
        answer:
          "Sí. En el modo práctica, presiona el micrófono y responde en voz alta, y tu respuesta aparece como texto. Marca cada pregunta como lista o para practicar de nuevo, y las notas que guardes se quedan en tu navegador.",
      },
      noPost: {
        question: "¿Puedo prepararme sin la oferta de empleo?",
        answer:
          "Sí. Pega la oferta completa para tener preguntas más precisas, o déjala fuera y Otto trabaja a partir del título del puesto.",
      },
    },
    levels: { junior: "júnior", mid: "intermedio", senior: "sénior", staff: "staff" },
  },
  portfolio: {
    meta: {
      title: "Del currículum a un sitio de portafolio en {designs} diseños",
      description:
        "Convierte tu currículum en un sitio de portafolio. Elige uno de {designs} diseños, Otto lo completa a partir de tu currículum y lo alojamos en tu propio enlace. Viene con {pro}.",
    },
    crumb: "Creador de sitios de portafolio",
    eyebrow: "Portafolio · {pro}",
    title: "Del currículum al sitio de portafolio,",
    titleEm: "alojado en tu propio enlace.",
    action: "Crear mi portafolio",
    planNote: "Viene con {pro}, {price} al mes con alojamiento incluido.",
    check: {
      title: "Empieza con un currículum que se lea bien",
      text: "Tu portafolio se crea a partir de tu currículum, así que revísalo primero: mira lo que el software de selección lee de tu archivo, o compáralo con un empleo. Las dos cosas son gratis.",
    },
    closing: {
      title: "Tu currículum, como un sitio propio.",
      art: "Otto, la nutria, saludando",
    },
    intro:
      "Elige uno de {designs} diseños y Otto lo completa a partir de tu currículum: tus proyectos, experiencia, habilidades y enlaces. Lo alojamos en tu propio enlace, así que no tienes nada que configurar.",
    featuresTitle: "Lo que obtienes",
    features: {
      designs: {
        title: "{designs} diseños",
        text: "Desde una columna tranquila hasta una página oscura con grandes proyectos destacados. Abre cada uno a tamaño completo con tu propio currículum antes de elegir.",
      },
      filled: {
        title: "Completado a partir de tu currículum",
        text: "Otto redacta la sección sobre ti, los proyectos, la experiencia, las habilidades, la educación y los enlaces a partir de tu currículum. Edita cualquier parte u oculta una sección que no necesites.",
      },
      hosted: {
        title: "Alojado en tu propio enlace",
        text: "La página tiene un enlace con tu nombre, y nosotros la alojamos. Si cambias el nombre más tarde, el enlace anterior sigue funcionando durante {redirectDays} días.",
      },
      sync: {
        title: "Al día con tu currículum",
        text: "Con la sincronización activada, los cambios en tu currículum aparecen solos en la página. Desactívala para actualizar la página solo cuando tú lo decidas.",
      },
      private: {
        title: "Tus datos privados no se muestran",
        text: "Tu correo y tu teléfono empiezan ocultos, y se les pide a los buscadores que omitan la página hasta que les permitas encontrarla.",
      },
      views: {
        title: "Visitas y GitHub",
        text: "Mira cuántas veces se ha visto tu página. Conecta GitHub y la página también puede mostrar tus cifras de GitHub.",
      },
    },
    steps: {
      pick: {
        title: "Elige un currículum y un diseño",
        text: "Mira cada diseño con tu propio currículum y luego elige uno. Otto lo completa.",
      },
      check: {
        title: "Revisa lo que escribió Otto",
        text: "Edita los textos, oculta secciones y elige si quieres mostrar tu correo y tu teléfono.",
      },
      publish: {
        title: "Publica y comparte",
        text: "Nada queda en línea hasta que publiques. Luego envía el enlace a reclutadores, o ponlo en tu currículum y en LinkedIn.",
      },
    },
    faq: {
      free: {
        question: "¿El sitio de portafolio es gratis?",
        answer:
          "Los portafolios vienen con {pro} y {max}, con alojamiento incluido. {pro} cuesta {price} al mes. Si tu plan termina, la página queda fuera de línea, pero se conservan ella y su configuración, así que vuelve tal como estaba cuando regreses.",
      },
      code: {
        question: "¿Necesito programar o comprar hosting?",
        answer:
          "No. Otto crea la página a partir de tu currículum y nosotros la alojamos. No hay nada que instalar ni dominio que comprar.",
      },
      google: {
        question: "¿Google encontrará mi portafolio?",
        answer:
          "Solo si tú quieres. Hasta que actives “Permitir que los buscadores la encuentren”, se les pide a los buscadores que no muestren la página en sus resultados.",
      },
      update: {
        question: "¿Qué pasa cuando actualizo mi currículum?",
        answer:
          "Con la sincronización activada, la página toma el cambio sola. Con la sincronización desactivada, Otto te avisa que el currículum cambió, y tú actualizas la página cuando quieras.",
      },
      design: {
        question: "¿Puedo cambiar el diseño después?",
        answer:
          "Sí. Cambia a cualquiera de los {designs} diseños cuando quieras. Tu página conserva su enlace y su configuración.",
      },
    },
  },
} satisfies Translation<Messages["product"]>;
