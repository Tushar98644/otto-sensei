import type { ExampleWords } from "../../../examples";

export const hr: ExampleWords<"hr"> = {
  role: "Recursos humanos",
  card: "Reclutamiento y trabajo generalista en cifras: tiempo de contratación, retención, casos cerrados.",
  description:
    "Ejemplo de currículum de recursos humanos para puestos generalistas y de reclutamiento: rapidez de contratación, retención, procesos y herramientas.",
  intro:
    "La gente de recursos humanos lee currículums todo el día, así que nota uno vago al instante. El suyo necesita lo mismo que busca en los demás: cifras de contratación y retención, los sistemas que manejó y los problemas que resolvió. Este ejemplo cubre reclutamiento y trabajo generalista.",
  person:
    "Nadia es inventada: una generalista de recursos humanos con 5 años en servicios de TI y comercio minorista en Phoenix, que viene del reclutamiento. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de recursos humanos",
    basics: {
      headline: "Generalista de recursos humanos",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Generalista de recursos humanos con 5 años en reclutamiento, incorporación y relaciones laborales para equipos de 300 a 1,200 personas. Arregla procesos lentos con herramientas simples y políticas claras.",
    experience: [
      {
        title: "Generalista de recursos humanos",
        bullets: [
          "Reduje el tiempo de contratación para puestos de ingeniería de 52 a 34 días con entrevistas estructuradas y una regla de retroalimentación en 48 horas.",
          "Rehice la incorporación de 220 nuevas contrataciones al año, y subí la retención a 90 días del 81% al 90%.",
          "Pasé las vacaciones, la asistencia y los datos de nómina a un solo HRIS, lo que eliminó 3 hojas de cálculo y los errores mensuales de nómina.",
          "Investigué y cerré 40 casos de relaciones laborales al año, cada uno con conclusiones por escrito.",
        ],
      },
      {
        title: "Especialista en adquisición de talento",
        bullets: [
          "Contraté a 180 empleados de tienda y 25 gerentes en 2022 para 30 tiendas, sobre todo con referidos y reclutamiento universitario.",
          "Lancé un bono por referidos que trajo el 35% de las contrataciones, a un tercio del costo por contratación de las agencias.",
          "Organicé 6 jornadas de contratación al año en universidades de Arizona y Nuevo México, y cubrí 60 puestos de trainee.",
        ],
      },
    ],
    education: [{ degree: "MBA", field: "Recursos Humanos" }],
    skills: [
      {
        label: "Recursos humanos",
        items: [
          "Adquisición de talento",
          "Relaciones laborales",
          "Gestión del desempeño",
          "Incorporación",
          "Nómina",
        ],
      },
      {
        label: "Herramientas",
        items: ["Workday", "Excel", "Google Workspace", "LinkedIn Recruiter"],
      },
    ],
  },
  lines: [
    {
      weak: "Responsable del reclutamiento de principio a fin.",
      strong:
        "Reduje el tiempo de contratación para puestos de ingeniería de 52 a 34 días con entrevistas estructuradas y una regla de retroalimentación en 48 horas.",
    },
    {
      weak: "Manejé la incorporación de empleados.",
      strong:
        "Rehice la incorporación de 220 nuevas contrataciones al año, y subí la retención a 90 días del 81% al 90%.",
    },
    {
      weak: "Profesional de recursos humanos trabajadora y con atención al detalle.",
      strong:
        "Pasé las vacaciones, la asistencia y los datos de nómina a un solo HRIS, lo que eliminó 3 hojas de cálculo y los errores mensuales de nómina.",
    },
  ],
  skills: [{ label: "Gestión de personas" }, { label: "Operaciones" }, { label: "Herramientas" }],
  tips: [
    {
      title: "Usa las cifras que ya mides",
      text: "Tiempo de contratación, aceptación de ofertas, retención a 90 días, rotación, casos cerrados. Los equipos de recursos humanos ya las miden; una por línea convierte tareas en resultados.",
    },
    {
      title: "Nombra los sistemas",
      text: "Workday, SAP SuccessFactors, Darwinbox, Keka, Greenhouse: las ofertas suelen nombrar el HRIS o el sistema de reclutamiento, así que di cuáles manejaste.",
    },
    {
      title: "Lo confidencial, confidencial",
      text: "Cuenta los casos y di cómo terminaron, pero nunca nombres a personas ni describas un caso en detalle. Los reclutadores lo notan, y suma a tu favor.",
    },
  ],
  mistakes: [
    {
      title: "“Reclutamiento de principio a fin”",
      text: "Dice que hiciste todo el trabajo, pero no qué tan bien. La revisión de líneas de Otto marca arranques como “Responsable de”; agrega cuántos puestos, qué tan rápido y de qué fuentes.",
    },
    {
      title: "Datos personales de un formato viejo",
      text: "La fecha de nacimiento, el estado civil y una foto todavía aparecen en muchas plantillas de currículum indias. La mayoría de los empleadores no los necesita, y abren la puerta a sesgos. No los pongas.",
    },
    {
      title: "Un muro de habilidades blandas",
      text: "“Don de gentes, buen oyente, trabajador” es lo que escribe todo el mundo. Muestra lo mismo con una línea sobre un caso que cerraste o una política que arreglaste.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de recursos humanos?",
      answer:
        "Tus áreas de recursos humanos (reclutamiento, generalista, nómina o capacitación), el tamaño de la plantilla que atendiste y cifras como el tiempo de contratación o la retención. Agrega los sistemas de recursos humanos que usaste.",
    },
    {
      question:
        "¿Debo poner conocimientos de derecho laboral en mi currículum de recursos humanos?",
      answer:
        "Si el puesto lo pide, muéstralo en una línea: políticas que escribiste o auditorías que aprobaste. Una simple lista de leyes dice menos que un ejemplo de cómo las aplicaste.",
    },
    {
      question: "¿Cómo paso de reclutamiento a un puesto de generalista de recursos humanos?",
      answer:
        "Conserva tus resultados de reclutamiento y agrega el trabajo generalista que hayas hecho: incorporación, políticas, relaciones laborales o datos de nómina. Una línea del resumen puede nombrar el cambio que buscas.",
    },
  ],
};
