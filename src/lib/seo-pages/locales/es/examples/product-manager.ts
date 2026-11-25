import type { ExampleWords } from "../../../examples";

export const productManager: ExampleWords<"product-manager"> = {
  role: "Gerente de producto",
  card: "Primero los resultados, con la investigación y los experimentos que los respaldan.",
  description:
    "Ejemplo de currículum de gerente de producto: líneas con el resultado, cómo lo encontraste y a quién lideraste, habilidades clave y errores.",
  intro:
    "Un gerente de producto no escribe el código ni dibuja las pantallas, así que el currículum tiene que mostrar qué cambió gracias a sus decisiones. Este ejemplo empieza cada línea con un resultado y lo respalda con cómo llegó ahí el equipo.",
  person:
    "David es inventado: un gerente de producto con 6 años, que pasó de ingeniería a producto en una empresa de viajes en Seattle. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de gerente de producto",
    basics: {
      headline: "Gerente de producto",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Gerente de producto con 3 años en producto y 3 en ingeniería, trabajando en reservas y pagos para una app de viajes. Lanza en pasos pequeños, mide con honestidad y deja todo por escrito.",
    experience: [
      {
        title: "Gerente de producto",
        bullets: [
          "Lideré a un equipo de 7 para rehacer el checkout de hoteles, y subí la tasa de reservas completadas del 61% al 70% en dos trimestres.",
          "Descubrí en 30 entrevistas con usuarios que la gente abandonaba en el paso de factura empresarial, y lo reduje a un solo campo opcional.",
          "Armé revisiones semanales de producto en Amplitude con diseño e ingeniería, para que un paso roto del embudo aparezca en 7 días en lugar de 30.",
          "Escribí el roadmap de pagos divididos con Apple Pay y tarjetas, lanzado a 2 millones de usuarios con una tasa de fallas del 0.2%.",
        ],
      },
      {
        title: "Gerente de producto asociado",
        bullets: [
          "Dirigí 12 pruebas A/B de filtros de búsqueda en 5 meses, y me quedé con las 3 que aumentaron las búsquedas por sesión.",
        ],
      },
      {
        title: "Ingeniero de software",
        bullets: [
          "Creé las APIs de reservas de una app de pasajes de autobús que procesaba 40,000 reservas al día en su punto máximo.",
          "Pasé a trabajo de producto escribiendo las especificaciones de 2 funciones, lo que me llevó a un puesto de APM.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ingeniería Eléctrica y de Computación" }],
    skills: [
      {
        label: "Producto",
        items: [
          "Gestión de producto",
          "Planificación de roadmap",
          "Investigación de usuarios",
          "Pruebas A/B",
          "Agile",
        ],
      },
      { label: "Herramientas", items: ["Jira", "Amplitude", "SQL", "Figma", "Confluence"] },
    ],
  },
  lines: [
    {
      weak: "Gestioné el roadmap del producto de checkout.",
      strong:
        "Lideré a un equipo de 7 para rehacer el checkout de hoteles, y subí la tasa de reservas completadas del 61% al 70% en dos trimestres.",
    },
    {
      weak: "Hice investigación de usuarios.",
      strong:
        "Descubrí en 30 entrevistas con usuarios que la gente abandonaba en el paso de factura empresarial, y lo reduje a un solo campo opcional.",
    },
    {
      weak: "Colaboré con equipos multifuncionales para entregar funciones.",
      strong:
        "Escribí el roadmap de pagos divididos con Apple Pay y tarjetas, lanzado a 2 millones de usuarios con una tasa de fallas del 0.2%.",
    },
  ],
  skills: [
    { label: "Trabajo de producto" },
    { label: "Formas de trabajo" },
    { label: "Datos y diseño" },
  ],
  tips: [
    {
      title: "Empieza con el resultado",
      text: "Conversión, retención, ingresos, tiempo ahorrado, tickets de soporte evitados. Elige la cifra que seguía el negocio y ponla primero; luego di cómo la movió el equipo.",
    },
    {
      title: "Muestra cómo decidiste",
      text: "Una línea sobre entrevistas, un experimento o una consulta de datos muestra que tomas decisiones con evidencia. Quien contrata lo busca en cada entrevista de producto.",
    },
    {
      title: "Haz visible tu paso a producto",
      text: "Si vienes de ingeniería, diseño o soporte, conserva ese empleo y agrega una línea sobre el trabajo de producto que hiciste ahí. Es una fortaleza, no un hueco.",
    },
  ],
  mistakes: [
    {
      title: "“Colaboré con equipos multifuncionales”",
      text: "Todos los gerentes de producto lo hacen, así que no dice nada. Nombra lo que lanzó el equipo y qué cambió.",
    },
    {
      title: "Atribuirte los logros de toda la empresa",
      text: "Si los ingresos crecieron un 40% mientras tú te hacías cargo de una función, di qué logró tu función. Quienes entrevistan lo comprueban, y una cifra más pequeña y honesta se sostiene.",
    },
    {
      title: "Solo nombres de funciones",
      text: "“Lancé Smart Filters” no significa nada fuera de la empresa. Di qué hizo por los usuarios en pocas palabras simples.",
    },
  ],
  faq: [
    {
      question:
        "¿Cómo escribo un currículum de gerente de producto sin haber tenido el título de PM?",
      answer:
        "Conserva tus títulos reales y muestra el trabajo de producto dentro de ellos: especificaciones que escribiste, investigaciones que dirigiste, lanzamientos que lideraste. Una línea breve del resumen puede decir que estás pasando a producto.",
    },
    {
      question: "¿Un currículum de gerente de producto debe tener una página?",
      answer:
        "Una página hasta unos 5 años; después, dos páginas si la segunda tiene resultados reales. Recorta los empleos antiguos a una o dos líneas en lugar de achicar la letra.",
    },
    {
      question: "¿Qué métricas debe poner un gerente de producto en su currículum?",
      answer:
        "Las que seguía tu equipo: conversión, activación, retención, ingresos o costo. Da el antes y el después, y el tiempo que tomó.",
    },
  ],
};
