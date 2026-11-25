import type { ExampleWords } from "../../../examples";

export const projectManager: ExampleWords<"project-manager"> = {
  role: "Gerente de proyectos",
  card: "Proyectos entregados a tiempo y dentro del presupuesto, con el alcance, el equipo y los riesgos detrás.",
  description:
    "Ejemplo de currículum de gerente de proyectos con alcance, presupuesto, plazos y tamaño del equipo, habilidades de PMP y Agile, consejos y errores.",
  intro:
    "Quien contrata lee un currículum de gerente de proyectos con tres preguntas en mente: qué tan grandes eran los proyectos, si se entregaron a tiempo y dentro del presupuesto, y qué hiciste cuando uno se atrasó. Este ejemplo responde las tres en cada empleo.",
  person:
    "Nicole es inventada: una gerente de proyectos con certificación PMP y 7 años dirigiendo implementaciones de software y mudanzas de oficinas para una red de salud en Chicago. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de gerente de proyectos",
    basics: {
      headline: "Gerente de proyectos, PMP",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Gerente de proyectos con 7 años liderando implementaciones de software, aperturas de clínicas y mudanzas de oficinas para una red de salud. Planifica en detalle, informa los riesgos temprano y mantiene en orden presupuestos de hasta USD 4 M.",
    experience: [
      {
        title: "Gerente de proyectos sénior",
        bullets: [
          "Lideré el despliegue de un nuevo sistema de citas en 42 clínicas en 14 meses, con 3 semanas de adelanto y USD 180,000 bajo un presupuesto de USD 2.6 M.",
          "Dirigí un equipo de 11 de TI, operaciones clínicas y el proveedor, con un registro semanal de riesgos que detectó 2 problemas de migración de datos antes del lanzamiento.",
          "Bajé las inasistencias de pacientes del 14% al 9% al sumar recordatorios por SMS al alcance de la implementación tras un piloto en 6 clínicas.",
          "Armé un proceso de admisión de proyectos en Jira y Confluence que ordena 60 solicitudes al año por costo y valor, para que los líderes aprueben el trabajo en una reunión.",
        ],
      },
      {
        title: "Gerente de proyectos",
        bullets: [
          "Gestioné la mudanza de 380 empleados a una nueva sede en 2 fines de semana, sin días de trabajo perdidos y con cada escritorio funcionando el lunes por la mañana.",
          "Entregué a tiempo 3 aperturas de clínicas con un solo plan compartido de obra, contratación y equipamiento, que luego se reutilizó en 5 sedes más.",
        ],
      },
      {
        title: "Coordinadora de proyectos",
        bullets: [
          "Seguí los cronogramas y presupuestos de 9 proyectos de construcción por USD 22 M en total, con un informe semanal de estado para clientes y jefes de obra.",
          "Creé un registro de órdenes de cambio en Excel que bajó el tiempo de aprobación de 12 días a 5.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Administración de Empresas" }],
    skills: [
      {
        label: "Gestión de proyectos",
        items: [
          "Gestión de proyectos",
          "Gestión de riesgos",
          "Presupuestos",
          "Gestión de partes interesadas",
          "Gestión de proveedores",
          "Gestión del cambio",
        ],
      },
      {
        label: "Métodos y herramientas",
        items: ["Agile", "Scrum", "Jira", "Confluence", "Smartsheet", "Microsoft Project", "Excel"],
      },
    ],
    certifications: [
      { name: "Project Management Professional (PMP)" },
      { name: "Certified ScrumMaster (CSM)" },
    ],
  },
  lines: [
    {
      weak: "A cargo de la planificación y ejecución de proyectos.",
      strong:
        "Lideré el despliegue de un nuevo sistema de citas en 42 clínicas en 14 meses, con 3 semanas de adelanto y USD 180,000 bajo un presupuesto de USD 2.6 M.",
    },
    {
      weak: "Trabajé con las partes interesadas para mantener los proyectos en curso.",
      strong:
        "Dirigí un equipo de 11 de TI, operaciones clínicas y el proveedor, con un registro semanal de riesgos que detectó 2 problemas de migración de datos antes del lanzamiento.",
    },
    {
      weak: "Gestioné múltiples proyectos al mismo tiempo.",
      strong:
        "Seguí los cronogramas y presupuestos de 9 proyectos de construcción por USD 22 M en total, con un informe semanal de estado para clientes y jefes de obra.",
    },
  ],
  skills: [{ label: "Entrega" }, { label: "Métodos" }, { label: "Herramientas" }],
  tips: [
    {
      title: "Dale un tamaño a cada proyecto",
      text: "Presupuesto, tamaño del equipo, cantidad de sedes o usuarios, y cuánto duró. Quien lee no distingue un proyecto de USD 50,000 de uno de USD 5 M si no lo dices, y el tamaño marca tu nivel.",
    },
    {
      title: "Muestra qué pasó cuando algo salió mal",
      text: "Todo proyecto se topa con un problema. Una línea sobre un riesgo que detectaste a tiempo o un atraso que recuperaste le dice más a quien contrata que decir que eres una persona organizada.",
    },
    {
      title: "Ajusta el método a la oferta",
      text: "Si la oferta pide Agile, muestra un proyecto en sprints. Si pide PMP o cascada, muestra fases, aprobaciones y control de cambios. Empieza con el que buscan.",
    },
  ],
  mistakes: [
    {
      title: "“Gestioné proyectos de principio a fin”",
      text: "Esa es la definición del puesto, no un resultado. Cámbiala por un proyecto, su tamaño y si se entregó a tiempo y dentro del presupuesto.",
    },
    {
      title: "Cada herramienta que abriste alguna vez",
      text: "Jira, Asana, Trello, Monday, Smartsheet y Wrike en una sola lista se leen como relleno. Nombra las dos o tres en las que llevaste proyectos reales, y muéstralas en una línea.",
    },
    {
      title: "Esconder el PMP",
      text: "Si tienes el PMP o el CSM, ponlo en tu titular y otra vez en certificaciones con el año. Las ofertas en Estados Unidos suelen pedirlo como requisito, y los reclutadores lo buscan.",
    },
  ],
  faq: [
    {
      question: "¿Debo poner el PMP en mi currículum de gerente de proyectos?",
      answer:
        "Sí, si lo tienes: en tu titular y en una sección de certificaciones con el año. Si todavía estás estudiando, escribe que tu examen PMP está programado y da el mes, en lugar de dar a entender que ya lo tienes.",
    },
    {
      question: "¿Cómo muestro experiencia en gestión de proyectos sin el título?",
      answer:
        "Conserva tu título real y escribe líneas sobre los proyectos que dirigiste en ese puesto: alcance, presupuesto, equipo y resultado. Coordinadores, ingenieros y analistas suelen liderar proyectos sin tener el título.",
    },
    {
      question: "¿Qué cifras van en un currículum de gerente de proyectos?",
      answer:
        "Presupuesto, tamaño del equipo, fechas previstas frente a reales, costo frente a presupuesto y el resultado para el que era el proyecto, como menos inasistencias de pacientes o una aprobación más rápida.",
    },
    {
      question: "¿Un currículum de gerente de programas es distinto del de gerente de proyectos?",
      answer:
        "Un gerente de programas dirige un grupo de proyectos relacionados hacia un mismo objetivo, así que el currículum muestra el portafolio: cuántos proyectos, el presupuesto total y el objetivo al que servían. Un gerente de proyectos muestra cada proyecto con más detalle.",
    },
  ],
};
