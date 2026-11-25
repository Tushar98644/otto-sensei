import type { ExampleWords } from "../../../examples";

export const businessAnalyst: ExampleWords<"business-analyst"> = {
  role: "Analista de negocios",
  card: "Requisitos, mapas de procesos y datos que cambiaron cómo trabaja un equipo.",
  description:
    "Ejemplo de currículum de analista de negocios: requisitos, procesos y SQL que muestran qué cambió, habilidades y herramientas de las ofertas, y consejos.",
  intro:
    "Un analista de negocios está entre quienes operan un proceso y quienes lo cambian. El currículum tiene que mostrar los dos lados: qué descubriste, qué dejaste por escrito y qué mejoró una vez que salió el cambio. Este ejemplo lo hace para un banco y una aseguradora.",
  person:
    "Natalie es inventada: una analista de negocios con 5 años en un banco y una aseguradora de Charlotte, que ascendió desde operaciones de siniestros. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de analista de negocios",
    basics: {
      headline: "Analista de negocios",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Analista de negocios con 5 años en banca y seguros, que convierte procesos desordenados en requisitos claros y mejoras medibles. Trabaja con SQL, Excel y Power BI, y se mueve con la misma comodidad entre el personal de operaciones y los ingenieros.",
    experience: [
      {
        title: "Analista de negocios sénior",
        bullets: [
          "Mapeé el proceso de préstamos a pymes entre 4 equipos y 23 traspasos, y después escribí los requisitos que bajaron el tiempo de aprobación de 19 a 8 días.",
          "Escribí 140 historias de usuario con criterios de aceptación para un nuevo portal de préstamos, y dirigí pruebas con 12 analistas de crédito que encontraron 31 defectos antes del lanzamiento.",
          "Analicé con SQL 3 años de datos de préstamos y mostré que el 40% del retrabajo venía de 2 campos vacíos del formulario de solicitud, que el equipo volvió obligatorios.",
          "Creé un tablero de préstamos por etapa en Power BI que 15 gerentes de sucursal revisan a diario, en lugar de una hoja de cálculo semanal por correo.",
        ],
      },
      {
        title: "Analista de negocios",
        bullets: [
          "Documenté el proceso de recepción de siniestros, encontré 6 pasos duplicados de captura de datos y los eliminé en una versión que ahorró 5 horas semanales a cada ajustador.",
          "Reuní los requisitos de 30 ajustadores para una página de estado de siniestros, que redujo un 22% las llamadas de consulta al centro de llamadas.",
        ],
      },
      {
        title: "Asociada de operaciones de siniestros",
        bullets: [
          "Procesé 60 siniestros de autos por semana y escribí la primera guía práctica del equipo, que se volvió el material de capacitación de 25 nuevas contrataciones.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Administración de Empresas" }],
    skills: [
      {
        label: "Análisis",
        items: [
          "Levantamiento de requisitos",
          "Mapeo de procesos",
          "Historias de usuario",
          "Pruebas de aceptación de usuario",
          "Análisis de datos",
        ],
      },
      { label: "Herramientas", items: ["SQL", "Excel", "Power BI", "Jira", "Confluence", "Visio"] },
    ],
    certifications: [{ name: "Certification of Capability in Business Analysis (CCBA)" }],
  },
  lines: [
    {
      weak: "Reuní requisitos de las partes interesadas.",
      strong:
        "Mapeé el proceso de préstamos a pymes entre 4 equipos y 23 traspasos, y después escribí los requisitos que bajaron el tiempo de aprobación de 19 a 8 días.",
    },
    {
      weak: "Involucrada en proyectos de mejora de procesos.",
      strong:
        "Documenté el proceso de recepción de siniestros, encontré 6 pasos duplicados de captura de datos y los eliminé en una versión que ahorró 5 horas semanales a cada ajustador.",
    },
    {
      weak: "Realicé varias tareas de análisis de datos con SQL.",
      strong:
        "Analicé con SQL 3 años de datos de préstamos y mostré que el 40% del retrabajo venía de 2 campos vacíos del formulario de solicitud, que el equipo volvió obligatorios.",
    },
  ],
  skills: [{ label: "Análisis" }, { label: "Entrega" }, { label: "Herramientas de datos" }],
  tips: [
    {
      title: "Muestra el proceso antes y después",
      text: "Días para aprobar, pasos eliminados, errores, horas ahorradas. El trabajo de un analista de negocios se ve en cómo funciona el proceso después del cambio, así que mídelo antes de empezar.",
    },
    {
      title: "Cuenta los documentos que escribiste",
      text: "Historias de usuario, mapas de procesos, requisitos y casos de prueba. Di cuántos y quién los aprobó; eso muestra que puedes llevar un cambio de una sala de reuniones a una versión publicada.",
    },
    {
      title: "Pon SQL en una línea, no solo en una lista",
      text: "Muchas ofertas de analista de negocios piden SQL o un buen manejo de Excel. Una línea en la que una consulta encontró la causa de un problema lo demuestra mejor que una lista de habilidades.",
    },
  ],
  mistakes: [
    {
      title: "“Actué como enlace entre el negocio y TI”",
      text: "Eso repite el título del puesto. Di en qué se pusieron de acuerdo los dos lados gracias a ti, y qué se lanzó como resultado.",
    },
    {
      title: "Solo las herramientas, nunca el cambio",
      text: "Jira, Visio y Confluence son donde vive el trabajo, no el trabajo en sí. Cada línea necesita un proceso, una decisión o una cifra que se movió.",
    },
    {
      title: "Esconder tus años en operaciones",
      text: "El tiempo en siniestros, facturación o un centro de llamadas es la razón por la que entiendes el proceso. Deja ese empleo en la página con una línea que muestre que mejoraste cómo funcionaba.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de analista de negocios?",
      answer:
        "Los procesos o sistemas que analizaste, los requisitos que escribiste, las herramientas que usaste y qué cambió después: tiempo ahorrado, errores reducidos o costos evitados. Agrega una certificación ECBA, CCBA o CBAP si la tienes.",
    },
    {
      question: "¿Los analistas de negocios necesitan SQL en su currículum?",
      answer:
        "No todas las ofertas lo exigen, pero muchas ofertas de EE. UU. lo piden, y te permite revisar por tu cuenta un problema en los datos. Si lo has usado, muestra en una línea un hallazgo de una consulta.",
    },
    {
      question: "¿Cómo paso de operaciones a un puesto de analista de negocios?",
      answer:
        "Escribe tu empleo actual en torno al análisis que hay dentro: un proceso que mapeaste, un informe que creaste, una mejora que propusiste. El resumen puede decir que te estás pasando al análisis de negocios.",
    },
    {
      question: "¿Un analista de negocios es lo mismo que un analista de datos?",
      answer:
        "Se superponen. Los analistas de negocios se enfocan en los procesos y en los requisitos de un cambio; los analistas de datos, en los informes y el análisis. Inclina tus líneas hacia lo que pida la oferta.",
    },
  ],
};
