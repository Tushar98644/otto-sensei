import type { ExampleWords } from "../../../examples";

export const softwareEngineer: ExampleWords<"software-engineer"> = {
  role: "Ingeniero de software",
  card: "Cuatro años en sistemas de pago, con el stack y una cifra en cada línea.",
  description:
    "Ejemplo de currículum de ingeniero de software: líneas con impacto, las habilidades que piden las ofertas, consejos de título y errores que evitar.",
  intro:
    "Quien contrata lee un currículum de ingeniería de software buscando tres cosas: qué entregaste, de qué tamaño era y con qué stack lo hiciste. Este ejemplo pone las tres en cada línea, para que las encuentren tanto las personas como el software de selección.",
  person:
    "Imani es inventada: una ingeniera con perfil backend y 4 años en sistemas de pago en Nueva York. Los nombres, las empresas y las cifras son inventados; copia la forma, no los datos.",
  resume: {
    title: "Currículum de ingeniera de software",
    basics: {
      headline: "Ingeniera de software",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Ingeniera de software con 4 años en sistemas de pago con Java, Go y AWS. Se hace cargo de servicios desde la revisión de diseño hasta las guardias, y los mide después del lanzamiento.",
    experience: [
      {
        title: "Ingeniera de software II",
        bullets: [
          "Creé una capa de idempotencia en Go para las respuestas de pagos ACH, con lo que los reembolsos duplicados bajaron del 0.4% de los pagos a menos del 0.05%.",
          "Pasé el informe de liquidación de un proceso nocturno a flujos de Kafka, para que los comercios vean los montos liquidados en 10 minutos.",
          "Lideré con otro ingeniero la migración de 14 servicios de EC2 a Kubernetes en AWS, sin caídas para los clientes.",
          "Escribí el runbook de guardias y las reglas de alerta en Grafana, y bajé los avisos semanales de 22 a 6 en dos trimestres.",
        ],
      },
      {
        title: "Ingeniera de software",
        bullets: [
          "Lancé una API REST para exportar facturas con Java y Spring Boot, usada hoy por 1,800 pequeñas empresas cada mes.",
          "Reduje la latencia p95 de la búsqueda de facturas de 1.2 s a 280 ms con índices compuestos y una caché de Redis.",
          "Sumé pruebas de contrato al pipeline de CI/CD que detectaron 9 cambios incompatibles en la API antes de su lanzamiento en un año.",
        ],
      },
    ],
    projects: [
      {
        name: "ledgerlite",
        tech: "Go, PostgreSQL",
        bullets: [
          "Publiqué una biblioteca de contabilidad por partida doble de código abierto que hoy usan 3 equipos de Paysprout para los saldos de billeteras.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ciencias de la Computación" }],
    skills: [
      { label: "Lenguajes", items: ["Java", "Go", "Python", "SQL"] },
      { label: "Backend", items: ["Spring Boot", "Kafka", "PostgreSQL", "Redis", "REST", "gRPC"] },
      { label: "Nube", items: ["AWS", "Kubernetes", "Docker", "Terraform", "Grafana"] },
    ],
    certifications: [{ name: "AWS Certified Developer – Associate" }],
  },
  lines: [
    {
      weak: "Responsable del mantenimiento del backend de pagos.",
      strong:
        "Mantuve el backend de pagos con un 99.95% de disponibilidad durante un año con chequeos de salud, reintentos y un runbook de failover probado.",
    },
    {
      weak: "Trabajé en mejorar el rendimiento de nuestras APIs.",
      strong:
        "Reduje la latencia p95 de la API de búsqueda de facturas de 1.2 s a 280 ms con índices compuestos y una caché de Redis.",
    },
    {
      weak: "Migramos nuestros servicios a Kubernetes.",
      strong:
        "Migré con otro ingeniero 14 servicios de EC2 a Kubernetes en AWS, sin caídas para los clientes.",
    },
  ],
  skills: [{ label: "Lenguajes" }, { label: "Frameworks y datos" }, { label: "Nube y entrega" }],
  tips: [
    {
      title: "Pon el stack dentro de la línea",
      text: "“Reduje la latencia con una caché de Redis” muestra Redis en acción. Una habilidad que solo aparece en tu lista de habilidades cuenta menos, para quien recluta y para la verificación de compatibilidad de Otto, que la marca como listada y no como demostrada.",
    },
    {
      title: "Dale un tamaño a cada línea",
      text: "Solicitudes por segundo, usuarios, servicios, dinero movido, minutos ahorrados. Una cifra basta para convertir una tarea en un resultado, y le da a quien te entrevista algo sobre qué preguntar.",
    },
    {
      title: "Escribe el título de las dos formas",
      text: "Si tu empresa dice SDE-2, escribe “Software Engineer II (SDE-2)”. Los reclutadores en India buscan títulos SDE; los empleadores de otros países buscan “software engineer”, y ambos deberían encontrarte.",
    },
  ],
  mistakes: [
    {
      title: "Una lista de 40 herramientas",
      text: "Incluye las herramientas sobre las que te gustaría que te entrevistaran. Las que usaste una vez invitan preguntas que no sabrás responder y tapan las que importan para el puesto.",
    },
    {
      title: "Líneas sobre el equipo, no sobre ti",
      text: "“Migramos nuestros servicios” esconde tu parte. La revisión de líneas de Otto marca la primera persona del plural por eso: di lo que hiciste tú, aunque otros hayan ayudado.",
    },
    {
      title: "Dos columnas y barras de habilidades",
      text: "El software de selección lee de corrido a través de las columnas y no puede leer una barra. Una sola columna de texto real mantiene tus empleos, fechas y habilidades en el orden correcto.",
    },
  ],
  faq: [
    {
      question: "¿Qué extensión debe tener un currículum de ingeniero de software?",
      answer:
        "Una página para la mayoría de las personas con menos de 5 años de experiencia. Después, dos páginas están bien si cada línea se gana su lugar. La vista del reclutador de Otto marca todo lo que pase de dos páginas.",
    },
    {
      question: "¿Debo agregar el enlace a mi GitHub o a mi portafolio?",
      answer:
        "Sí, si muestra trabajo del que te gustaría hablar. Un enlace a repositorios vacíos o abandonados hace más daño que no poner ninguno. Fija primero tus dos o tres mejores proyectos.",
    },
    {
      question: "¿Debo poner mi CTC o mi período de preaviso en el currículum?",
      answer:
        "No. Los reclutadores en India piden el CTC actual, el CTC esperado y el período de preaviso en el formulario de postulación o en la primera llamada. Deja el currículum para tu trabajo; da esas cifras cuando te las pidan.",
    },
  ],
};
