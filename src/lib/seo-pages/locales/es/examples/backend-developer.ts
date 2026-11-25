import type { ExampleWords } from "../../../examples";

export const backendDeveloper: ExampleWords<"backend-developer"> = {
  role: "Desarrollador backend",
  card: "Servicios que muestran carga, latencia, disponibilidad y cuánto cuesta operarlos.",
  description:
    "Ejemplo de currículum de desarrollador backend: líneas en Java y Python con escala, disponibilidad y costo, habilidades que piden las ofertas y errores.",
  intro:
    "El trabajo de backend suele ser invisible, así que el currículum tiene que hacerlo visible: cuánto tráfico, qué tan confiable, cuánto costaba y qué cambió gracias a ti. Este ejemplo convierte cada una de esas cosas en una cifra.",
  person:
    "Ethan es inventado: un desarrollador backend con 3 años en software de logística en Columbus, Ohio. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de desarrollador backend",
    basics: {
      headline: "Desarrollador backend",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Desarrollador backend con 3 años creando servicios de pedidos y seguimiento con Java, Python y PostgreSQL. Se enfoca en servicios que siguen en pie en los picos y cuestan menos de operar.",
    experience: [
      {
        title: "Desarrollador backend",
        bullets: [
          "Creé en Spring Boot la API de seguimiento de envíos, que atiende 1,200 solicitudes por segundo en los picos con un p99 de menos de 150 ms.",
          "Pasé los eventos de pedidos del sondeo a la base de datos a Kafka, con lo que la carga de PostgreSQL bajó un 60% en la temporada de fiestas.",
          "Reduje un 28% la factura mensual de AWS ajustando el tamaño de las instancias y moviendo los logs fríos a un almacenamiento más barato.",
        ],
      },
      {
        title: "Ingeniero de software asociado",
        bullets: [
          "Escribí un servicio en Python con FastAPI que trae precios de materias primas de 40 fuentes cada hora para el equipo de precios.",
          "Sumé Docker y GitHub Actions a 6 servicios, reduciendo el tiempo del merge a producción de 2 días a 25 minutos.",
          "Corregí una condición de carrera en las actualizaciones de stock que hacía sobrevender el 3% de los pedidos, y la encontré reproduciendo logs de producción.",
        ],
      },
    ],
    projects: [
      {
        name: "Limitador de tasa",
        tech: "Go, Redis",
        bullets: [
          "Escribí un limitador de tasa de tipo token bucket con backend en Redis y lo probé con carga de hasta 20,000 solicitudes por segundo.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Tecnologías de la Información" }],
    skills: [
      { label: "Lenguajes", items: ["Java", "Python", "Go", "SQL"] },
      {
        label: "Servicios y datos",
        items: ["Spring Boot", "FastAPI", "Kafka", "PostgreSQL", "Redis", "Microservicios"],
      },
      { label: "Infraestructura", items: ["AWS", "Docker", "GitHub Actions", "Linux", "Datadog"] },
    ],
  },
  lines: [
    {
      weak: "Manejé el desarrollo backend del sistema de seguimiento.",
      strong:
        "Creé en Spring Boot la API de seguimiento de envíos, que atiende 1,200 solicitudes por segundo en los picos con un p99 de menos de 150 ms.",
    },
    {
      weak: "Ayudé a reducir los costos de la nube.",
      strong:
        "Reduje un 28% la factura mensual de AWS ajustando el tamaño de las instancias y moviendo los logs fríos a un almacenamiento más barato.",
    },
    {
      weak: "Estuve involucrado en la configuración de CI/CD.",
      strong:
        "Sumé Docker y GitHub Actions a 6 servicios, reduciendo el tiempo del merge a producción de 2 días a 25 minutos.",
    },
  ],
  skills: [
    { label: "Lenguajes" },
    { label: "Datos y mensajería" },
    { label: "Arquitectura y nube" },
  ],
  tips: [
    {
      title: "Muestra carga, latencia y disponibilidad",
      text: "Solicitudes por segundo, latencia p99, tasa de errores, disponibilidad. Son las cifras sobre las que preguntan en las entrevistas de backend, así que poner una en una línea abre la conversación que quieres.",
    },
    {
      title: "El dinero también es un resultado",
      text: "Una factura de nube más baja, menos servidores o menos tiempo de guardia es un resultado que cualquier gerente entiende. Di cuánto, y qué cambiaste para lograrlo.",
    },
    {
      title: "Explica el dominio en pocas palabras",
      text: "“Seguimiento de envíos”, “reembolsos con tarjeta”, “precios de materias primas”: un sustantivo corto le dice a quien lee qué hacía el sistema, y así las cifras significan algo.",
    },
  ],
  mistakes: [
    {
      title: "Solo enumerar tecnologías",
      text: "Una línea que dice “Java, Spring Boot, Kafka, Docker” cuenta qué usaste, no qué hiciste. Pon las herramientas dentro de una línea con un resultado.",
    },
    {
      title: "Esconderte detrás de “estuve involucrado en”",
      text: "La revisión de líneas de Otto marca los arranques pasivos y débiles como este, porque quien lee no puede saber qué hiciste. Empieza con tu propio verbo: creé, reduje, migré, corregí.",
    },
    {
      title: "Omitir la escala",
      text: "Una cola que maneja 50 mensajes al día y otra que maneja 50,000 por segundo son trabajos distintos. Di cuál era la tuya.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de desarrollador backend?",
      answer:
        "Tus lenguajes y frameworks, los sistemas que creaste y cifras de carga, latencia, disponibilidad o costo. Agrega un proyecto si tu trabajo está bajo un acuerdo de confidencialidad, y mantenlo en una o dos páginas.",
    },
    {
      question: "¿Debo mencionar el diseño de sistemas en mi currículum?",
      answer:
        "Demuéstralo en vez de afirmarlo. Una línea sobre dividir un servicio, agregar una cola o diseñar para el tráfico pico le dice más a quien lee que las palabras “diseño de sistemas” en una lista de habilidades.",
    },
    {
      question: "¿Qué formato le conviene a un currículum de backend?",
      answer:
        "Cualquier formato sencillo de una columna. Este ejemplo usa Minimal, que viene con Pro; Classic y Compact son gratis y se leen igual de limpio.",
    },
  ],
};
