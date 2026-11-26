import type { AtsTranslation } from "../../ats";

// The ATS guides' introductions, sourced notes and general advice, in Spanish.
const ANSWER_THE_SAME = "Respóndelas con honestidad, y siempre de la misma manera.";

const GREENHOUSE_HELP = "Centro de ayuda de Greenhouse";
const WORKDAY_DOCS = "Documentación de Workday";
const ORACLE_DOCS = "Documentación de Oracle Taleo";
const SAP_NOTE = "Nota de soporte de SAP";
const SAP_LEARNING = "SAP Learning";
const WORKABLE_HELP = "Centro de ayuda de Workable";
const ASHBY_DOCS = "Documentación de Ashby";

export default {
  intros: {
    greenhouse: {
      what: "Greenhouse es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos, recibir postulaciones y revisar candidatos.",
      spot: "El formulario suele estar en boards.greenhouse.io o job-boards.greenhouse.io, o el enlace lleva gh_jid= y un número.",
    },
    lever: {
      what: "Lever es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y revisar candidatos.",
      spot: "El empleo suele estar en jobs.lever.co.",
    },
    ashby: {
      what: "Ashby es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y revisar candidatos.",
      spot: "El empleo suele estar en jobs.ashbyhq.com, o el enlace lleva ashby_jid=.",
    },
    workday: {
      what: "Workday es un software de recursos humanos. Los empleadores que usan sus herramientas de reclutamiento reciben las postulaciones a través de Workday.",
      spot: "El formulario suele estar en una dirección que termina en myworkdayjobs.com o myworkdaysite.com.",
    },
    icims: {
      what: "iCIMS es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y filtrar candidatos.",
      spot: "El formulario suele estar en una dirección que termina en icims.com.",
    },
    taleo: {
      what: "Taleo es el software de selección de Oracle (un sistema de seguimiento de candidatos, o ATS) para publicar empleos y filtrar candidatos.",
      spot: "El formulario suele estar en una dirección que termina en taleo.net.",
    },
    successfactors: {
      what: "SAP SuccessFactors es el software de recursos humanos de SAP. Su parte de reclutamiento recibe postulaciones y filtra candidatos.",
      spot: "El formulario suele estar en una dirección como career4.successfactors.com, o en una que termina en jobs2web.com.",
    },
    smartrecruiters: {
      what: "SmartRecruiters es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y filtrar candidatos. Su IA se llama Winston.",
      spot: "El empleo suele estar en jobs.smartrecruiters.com o careers.smartrecruiters.com.",
    },
    workable: {
      what: "Workable es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y filtrar candidatos.",
      spot: "El formulario suele estar en apply.workable.com.",
    },
    bamboohr: {
      what: "BambooHR es un software de recursos humanos para empresas, con una herramienta de selección para publicar empleos y revisar candidatos.",
      spot: "El formulario suele estar en una dirección que termina en bamboohr.com.",
    },
    jobvite: {
      what: "Jobvite es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y revisar candidatos.",
      spot: "El empleo suele estar en jobs.jobvite.com.",
    },
    recruitee: {
      what: "Recruitee es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y filtrar candidatos.",
      spot: "El formulario suele estar en una dirección que termina en recruitee.com.",
    },
    teamtailor: {
      what: "Teamtailor es un software de selección (un sistema de seguimiento de candidatos, o ATS) que los empleadores usan para publicar empleos y revisar candidatos. Su asistente de IA se llama Co-pilot.",
      spot: "El formulario suele estar en una dirección que termina en teamtailor.com.",
    },
  },
  notes: {
    greenhouse: [
      {
        fact: "Los empleadores pueden configurar el formulario para que te rechace automáticamente por algunas respuestas a preguntas de sí/no y de elegir de una lista.",
        todo: ANSWER_THE_SAME,
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Greenhouse dice que la mayoría de los reclutadores revisan las postulaciones en el orden en que llegan.",
        todo: "Postula poco después de que se publique el empleo.",
        source: { label: "Blog de Greenhouse" },
      },
      {
        fact: "Greenhouse no puede leer currículums de más de 2.5 MB. Las columnas, las tablas y los datos de contacto en un encabezado, un pie de página o un cuadro de texto también le causan problemas.",
        todo: "Usa una sola columna, menos de 2.5 MB y los datos de contacto en el texto principal.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "En el filtro de palabras clave de Greenhouse, una palabra de tu postulación solo cuenta si coincide exactamente con la palabra que busca el reclutador.",
        todo: "Usa las propias palabras de la oferta para las habilidades que tienes, como “JavaScript”.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Con Talent Matching activado, la IA etiqueta a cada candidato desde Strong match hasta Limited match. Greenhouse dice que nunca hace avanzar ni rechaza a nadie por sí sola.",
        todo: "Haz que las habilidades clave del empleo sean fáciles de encontrar en tu currículum.",
        source: { label: GREENHOUSE_HELP },
      },
    ],
    lever: [
      {
        fact: "Lever ofrece a los reclutadores Talent Fit, un porcentaje de cuánto coinciden tus habilidades con la oferta de empleo. Lever dice que los reclutadores toman la decisión final.",
        todo: "Usa las palabras de la oferta para las habilidades que de verdad tienes.",
        source: { label: "Lever" },
      },
      {
        fact: "Lever copia tu nombre, tu empleador y tus datos de contacto desde tu currículum. No puede leer imágenes, y probablemente tampoco un archivo cuyo texto no puedas seleccionar.",
        todo: "Envía un PDF o un Word cuyo texto se pueda seleccionar.",
        source: { label: "Centro de ayuda de Lever" },
      },
    ],
    ashby: [
      {
        fact: "Con la revisión con IA activada, Ashby compara tu currículum con cada uno de los criterios del equipo: meets (cumple), does not meet (no cumple) o undecided (sin decidir).",
        todo: "Haz que cada requisito que cumples sea fácil de encontrar.",
        source: { label: ASHBY_DOCS },
      },
      {
        fact: "El equipo elige esos criterios: sugerencias de la IA a partir de la oferta, criterios reutilizados de otros empleos o los suyos propios.",
        todo: "Cubre los requisitos de la oferta con tus propias palabras, y siempre con la verdad.",
        source: { label: ASHBY_DOCS },
      },
      {
        fact: "Los reclutadores pueden ordenar a los candidatos por la proporción de criterios que cumplen, así que los más compatibles se leen primero.",
        todo: "Muestra cada requisito de la lista que de verdad cumples.",
        source: { label: ASHBY_DOCS },
      },
      {
        fact: "Los empleadores pueden fijar reglas que rechazan una postulación automáticamente al enviarse, según sus respuestas del formulario. El correo puede retenerse durante días.",
        todo: ANSWER_THE_SAME,
        source: { label: ASHBY_DOCS },
      },
    ],
    workday: [
      {
        fact: "El lector de currículums de Workday nunca completa los campos de habilidades ni de idiomas.",
        todo: "Escribe tus habilidades e idiomas en esos campos por tu cuenta.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Workday dice que lo que lee varía según el diseño del archivo y el orden de las palabras, y que los archivos sin imágenes funcionan mejor.",
        todo: "Revisa cada campo que completa antes de enviar.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Los empleadores pueden fijar reglas que descartan candidatos automáticamente, como a cualquiera que no tenga permiso para trabajar en el país del empleo.",
        todo: "Responde las preguntas sobre permiso de trabajo con honestidad, y siempre de la misma manera.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Cuando un empleador activa la calificación más reciente de HiredScore, esta compara cada requisito de la lista, uno por uno, con tu currículum. Cumplir todos los básicos da una A o una B.",
        todo: "Respalda cada requisito indispensable con una línea que lo muestre con claridad.",
        source: { label: "Notas de versión de Workday HiredScore" },
      },
    ],
    icims: [
      {
        fact: "Los empleadores de iCIMS pueden agregar preguntas eliminatorias que descartan candidatos al momento de postular.",
        todo: ANSWER_THE_SAME,
        source: { label: "Blog de iCIMS" },
      },
      {
        fact: "iCIMS ofrece Candidate Ranking, que usa IA para comparar tus habilidades y experiencia con la oferta de empleo y mostrar primero a los más compatibles.",
        todo: "Describe tu experiencia con los términos de la oferta, cuando sean ciertos.",
        source: { label: "Blog de iCIMS" },
      },
    ],
    taleo: [
      {
        fact: "La búsqueda por palabras clave de Taleo encuentra palabras exactas, a menos que el reclutador active Related Terms.",
        todo: "Usa las palabras exactas de la oferta, y escribe las abreviaturas de las dos formas una vez: “Kubernetes (K8s)”.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "La búsqueda por palabras clave de Taleo lee los archivos PDF, Word, RTF, de texto y HTML que adjuntas.",
        todo: "Adjunta un archivo PDF o Word, nunca una foto ni un escaneo.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Las preguntas de descalificación deben responderse, y tus respuestas pueden descalificarte automáticamente.",
        todo: ANSWER_THE_SAME,
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Los empleadores marcan habilidades y preguntas como Required (obligatoria) o Asset (deseable). Los reclutadores pueden listar solo a las personas que cumplen todas las Required.",
        todo: "Responde las preguntas de habilidades con precisión: las Required deciden si te tienen en cuenta.",
        source: { label: ORACLE_DOCS },
      },
    ],
    successfactors: [
      {
        fact: "Una respuesta incorrecta a una pregunta descalificadora te rechaza automáticamente.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_NOTE },
      },
      {
        fact: "Los empleadores pueden fijar una puntuación mínima para las preguntas puntuadas. Quedar por debajo te descalifica automáticamente.",
        todo: "Responde por completo las preguntas puntuadas. No le restes valor a tu experiencia real.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Los PDF escaneados, o hechos a partir de imágenes, no se leen bien. Los campos desplegables nunca se completan a partir de tu currículum.",
        todo: "Usa un PDF con texto real, y completa los desplegables a mano.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "La lectura de currículums solo funciona en algunos idiomas, como inglés, alemán, francés, español y neerlandés.",
        todo: "Si el tuyo está en otro idioma, revisa cada campo que completa.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Con la comparación de habilidades con IA activada, SAP extrae las habilidades de tu currículum y las ordena en coincidencias exactas y habilidades faltantes.",
        todo: "Nombra las habilidades del empleo que tienes, palabra por palabra.",
        source: { label: SAP_LEARNING },
      },
    ],
    smartrecruiters: [
      {
        fact: "Cualquier pregunta de sí/no o desplegable puede ser eliminatoria. Una respuesta eliminatoria te rechaza automáticamente, por defecto con un correo una hora después.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston Match califica tus habilidades, experiencia y estudios frente al empleo de 1 a 4 estrellas, para ayudar a los reclutadores a elegir a quién leer primero.",
        todo: "Haz que tus habilidades, empleos y estudios sean fáciles de encontrar.",
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston deduce habilidades a partir de tus títulos de puesto.",
        todo: "Usa títulos de puesto claros y estándar.",
        source: { label: SAP_LEARNING },
      },
    ],
    workable: [
      {
        fact: "Las preguntas eliminatorias son solo de sí/no. La respuesta eliminatoria te descalifica, y no te avisan.",
        todo: ANSWER_THE_SAME,
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "El formulario de postulación de Workable acepta currículums de hasta 5 MB, en PDF, DOC, DOCX, RTF, HTML u ODT.",
        todo: "Envía un PDF o DOCX de menos de 5 MB.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Cuando un empleador usa el Workable Agent, este te puntúa según los requisitos del equipo, y los indispensables cuentan el doble.",
        todo: "Muestra con palabras claras cada requisito indispensable que cumples.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Cuando tu currículum y tus respuestas no dicen lo suficiente sobre un requisito, el Agent lo marca como Unknown (desconocido).",
        todo: "Indica con claridad cada requisito que cumples.",
        source: { label: WORKABLE_HELP },
      },
    ],
    bamboohr: [
      {
        fact: "En la herramienta de selección de BambooHR, las personas del equipo leen tu currículum y tus respuestas, y te califican ellas mismas.",
        todo: "Responde cada pregunta por completo: las leen personas.",
        source: { label: "BambooHR" },
      },
      {
        fact: "Los empleadores pueden configurar una pregunta de sí/no para descartarte automáticamente según tu respuesta.",
        todo: ANSWER_THE_SAME,
        source: { label: "Centro de ayuda de BambooHR" },
      },
    ],
    jobvite: [
      {
        fact: "La IA de Jobvite extrae una lista de habilidades de tu currículum, y sus resultados de compatibilidad llegan a los reclutadores como calificaciones.",
        todo: "Nombra las habilidades del empleo que tienes, palabra por palabra.",
        source: { label: "Jobvite" },
      },
      {
        fact: "Jobvite dice que su modelo deja fuera tu nombre, tus datos de contacto, tu edad, raza, género y origen étnico.",
        todo: "Dedica tus palabras a habilidades y resultados.",
        source: { label: "Jobvite" },
      },
    ],
    recruitee: [
      {
        fact: "Las preguntas eliminatorias (sí/no, de opción única o de opción múltiple) descalifican automáticamente a quien da la respuesta incorrecta, y también pueden enviar el correo de rechazo.",
        todo: ANSWER_THE_SAME,
        source: { label: "Centro de ayuda de Recruitee" },
      },
      {
        fact: "Recruitee copia tu nombre, tu correo y tu teléfono desde tu currículum. Las columnas, los gráficos, el texto dentro de imágenes o un correo que solo está en el encabezado o el pie de página suelen causarle problemas.",
        todo: "Usa una sola columna de texto real, con tu correo en el texto principal.",
        source: { label: "Centro de ayuda de Recruitee" },
      },
    ],
    teamtailor: [
      {
        fact: "Con Co-pilot activado, la IA te evalúa según criterios que escribe el equipo: cumple, no cumple, o un guion cuando hay muy poco en qué basarse.",
        todo: "Indica con claridad cada requisito probable.",
        source: { label: "Centro de ayuda de Teamtailor" },
      },
      {
        fact: "Co-pilot lee tu currículum, tu carta de presentación, tus respuestas y tu dirección, y el empleador puede pasar a las personas a otra etapa según su resultado.",
        todo: "Mantén tu carta y tus respuestas coherentes con tu currículum.",
        source: { label: "Centro de ayuda de Teamtailor" },
      },
    ],
  },
  general: [
    {
      title: "Envía texto real, no una imagen del texto",
      text: "Sube un archivo PDF o Word hecho con texto. Un escaneo o una foto de una página puede no leerse bien.",
    },
    {
      title: "Usa una sola columna",
      text: "Pon tus datos de contacto en el texto principal, no en un encabezado, un pie de página, una tabla o un cuadro de texto.",
    },
    {
      title: "Usa las palabras de la oferta para las habilidades que tienes",
      text: "Algunas búsquedas solo encuentran palabras exactas. Escribe una abreviatura de las dos formas una vez, como “Kubernetes (K8s)”.",
    },
    {
      title: "Usa títulos de puesto claros",
      text: "Algunas IA, como Winston de SmartRecruiters, deducen tus habilidades a partir de tus títulos de puesto.",
    },
    {
      title: "Responde las preguntas de filtro con honestidad, siempre de la misma manera",
      text: "Muchos sistemas permiten a los empleadores descartar candidatos automáticamente según algunas respuestas.",
    },
    {
      title: "Revisa lo que completa el formulario",
      text: "Cuando un formulario completa sus campos con tu currículum, lee cada uno antes de enviar.",
    },
  ],
  screeningTip: "Responde las preguntas de filtro con honestidad, y siempre de la misma manera.",
} satisfies AtsTranslation;
