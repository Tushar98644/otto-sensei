import type { ExampleWords } from "../../../examples";

export const customerSupport: ExampleWords<"customer-support"> = {
  role: "Atención al cliente",
  card: "Volumen, tiempo de respuesta y CSAT, de especialista a líder de equipo.",
  description:
    "Ejemplo de currículum de atención al cliente con líneas de tiempo de resolución, CSAT y volumen, y las herramientas y habilidades que piden las ofertas.",
  intro:
    "Los equipos de soporte funcionan con cifras: tickets al día, tiempo de primera respuesta, CSAT, escalamientos. Un currículum de soporte que las usa se lee como el de alguien que ya conoce el trabajo. Este ejemplo va del soporte telefónico a un puesto de líder de equipo.",
  person:
    "Luis es inventado: un líder de equipo de atención al cliente con 5 años en soporte telefónico y por chat para una tienda en línea, con base en San Antonio. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de atención al cliente",
    basics: {
      headline: "Líder de equipo de atención al cliente",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Líder de atención al cliente con 5 años en soporte por teléfono, chat y correo para una tienda en línea con 2 millones de clientes. Mantiene las colas cortas y las respuestas amables, y corrige las causas detrás de los tickets repetidos.",
    experience: [
      {
        title: "Líder de equipo de atención al cliente",
        bullets: [
          "Lidero un equipo de 12 personas en chat y correo, con la primera respuesta en menos de 2 minutos y un CSAT del 92% durante las ventas de fin de año.",
          "Escribí 45 artículos de ayuda en Zendesk para las preguntas más comunes sobre reembolsos y entregas, reduciendo esos tickets un 25%.",
          "Organicé una revisión semanal de tickets repetidos con el equipo de entregas, que corrigió un error de código postal detrás de 1,500 tickets al mes.",
        ],
      },
      {
        title: "Especialista en atención al cliente",
        bullets: [
          "Respondí de 70 a 90 chats y llamadas al día en español e inglés, con un CSAT del 94% durante 2 años.",
          "Capacité a 20 agentes nuevos en reembolsos y escalamientos, reduciendo de 6 a 4 semanas el tiempo hasta asumir la carga completa de trabajo.",
          "Gané dos veces el premio trimestral de calidad entre 80 agentes por auditorías de llamadas y tiempo de resolución.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Inglés" }],
    skills: [
      {
        label: "Soporte",
        items: [
          "Soporte al cliente",
          "Atención al cliente",
          "Mesa de ayuda",
          "Gestión de escalamientos",
        ],
      },
      { label: "Herramientas", items: ["Zendesk", "Freshdesk", "Google Sheets", "Excel"] },
      { label: "Idiomas", items: ["Español", "Inglés"] },
    ],
  },
  lines: [
    {
      weak: "Manejé consultas de clientes por chat y teléfono.",
      strong:
        "Respondí de 70 a 90 chats y llamadas al día en español e inglés, con un CSAT del 94% durante 2 años.",
    },
    {
      weak: "Ideal para el trabajo en equipo y los entornos de ritmo rápido.",
      strong:
        "Lidero un equipo de 12 personas en chat y correo, con la primera respuesta en menos de 2 minutos y un CSAT del 92% durante las ventas de fin de año.",
    },
    {
      weak: "Ayudé a las personas recién contratadas a aprender el proceso.",
      strong:
        "Capacité a 20 agentes nuevos en reembolsos y escalamientos, reduciendo de 6 a 4 semanas el tiempo hasta asumir la carga completa de trabajo.",
    },
  ],
  skills: [{ label: "Soporte" }, { label: "Herramientas" }, { label: "Herramientas de oficina" }],
  tips: [
    {
      title: "Cita las métricas que reporta tu equipo",
      text: "Tickets o llamadas al día, tiempo de primera respuesta, tiempo de resolución, CSAT y puntajes de calidad. Si no sabes una cifra exacta, usa un rango que puedas sostener.",
    },
    {
      title: "Muestra que corriges causas, no solo tickets",
      text: "Artículos de ayuda que redujeron un tipo de ticket, un error que lograste que se corrigiera, un proceso que cambiaste. Eso es lo que te lleva de especialista a líder.",
    },
    {
      title: "Anota tus idiomas",
      text: "Muchos empleos de soporte en India y en el extranjero contratan por idioma. Nombra cada idioma en el que puedes atender clientes, en una línea de habilidades o en una sección de Idiomas.",
    },
  ],
  mistakes: [
    {
      title: "“Trabajo en equipo en un entorno de ritmo rápido”",
      text: "La revisión de líneas de Otto marca estas expresiones como frases hechas: todos los currículums de soporte las tienen. Un CSAT bajo presión dice lo mismo y lo demuestra.",
    },
    {
      title: "Nombres de procesos que nadie de afuera conoce",
      text: "Los nombres internos de colas y herramientas no significan nada para un nuevo empleador. Di en palabras simples cuál era el proceso.",
    },
    {
      title: "Esconder un pasado en BPO",
      text: "La experiencia en procesos de voz en un BPO es experiencia real de soporte. Nombra la industria del cliente si puedes, y muestra las cifras.",
    },
  ],
  faq: [
    {
      question: "¿Qué habilidades debe mostrar un currículum de atención al cliente?",
      answer:
        "Los canales que atendiste (teléfono, chat, correo), las herramientas de mesa de ayuda que usaste, tus idiomas y cifras de volumen, tiempo de respuesta y CSAT.",
    },
    {
      question: "¿Cómo paso de atención al cliente a un puesto de líder de equipo?",
      answer:
        "Muestra el trabajo de liderazgo que ya haces: capacitar a quienes recién entran, auditorías de calidad, artículos de ayuda, cubrir la cola. Da una cifra para cada uno, y di en tu resumen el cambio que buscas.",
    },
    {
      question: "¿Debo mencionar turnos nocturnos o rotativos?",
      answer:
        "Solo si el empleo los pide. Si una oferta dice turnos rotativos, una línea que diga que ya los trabajaste responde la pregunta antes de que te la hagan.",
    },
  ],
};
