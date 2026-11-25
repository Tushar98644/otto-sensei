import type { ExampleWords } from "../../../examples";

export const dataAnalyst: ExampleWords<"data-analyst"> = {
  role: "Analista de datos",
  card: "Trabajo con SQL, Python y Power BI que termina en una decisión que alguien tomó.",
  description:
    "Ejemplo de currículum de analista de datos: líneas de SQL, Excel y Power BI con la decisión que cambió cada análisis, habilidades y consejos.",
  intro:
    "Todo analista de datos sabe SQL y una herramienta de tableros, así que eso solo no te distingue. Lo que sí te distingue es la decisión que cambió tu trabajo: un precio, un presupuesto, un proceso. Este ejemplo termina cada línea con una.",
  person:
    "Emily es inventada: una analista de datos con 3 años en comercio minorista y entregas de comida en Houston. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de analista de datos",
    basics: {
      headline: "Analista de datos",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Analista de datos con 3 años convirtiendo datos de ventas y entregas en decisiones para equipos de operaciones y marketing. Trabaja sobre todo con SQL, Python y Power BI.",
    experience: [
      {
        title: "Analista de datos",
        bullets: [
          "Creé un tablero de Power BI con los tiempos de entrega por zona que usan 30 gerentes de ciudad en su revisión semanal.",
          "Detecté que el 18% de los pedidos tardíos salía de 4 cocinas que compartían repartidores, lo que llevó a un cambio de personal que recortó los retrasos un tercio.",
          "Escribí modelos SQL en BigQuery para las métricas diarias de pedidos, que reemplazaron 12 informes manuales de Excel y le ahorran al equipo 10 horas por semana.",
          "Dirigí una prueba A/B del mensaje sobre la tarifa de envío en 200,000 pedidos, que llevó a mantener un cambio que aumentó un 4% los pedidos repetidos.",
        ],
      },
      {
        title: "Analista de MIS",
        bullets: [
          "Automaticé el informe semanal de inventario con Python y Pandas, y lo bajé de 6 horas de copiar y pegar a 15 minutos.",
          "Creé un modelo en Excel de la tasa de venta por tienda que movió el inventario lento entre 45 tiendas antes de la liquidación de fin de temporada.",
        ],
      },
    ],
    projects: [
      {
        name: "Lluvia y pedidos en la ciudad",
        tech: "Python, Tableau",
        bullets: [
          "Crucé datos públicos de lluvia con 2 años de pedidos para mostrar cómo la lluvia mueve la demanda por hora, y lo publiqué como una historia de Tableau.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Estadística" }],
    skills: [
      {
        label: "Análisis",
        items: ["SQL", "Python", "Pandas", "Excel", "Estadística", "Pruebas A/B"],
      },
      { label: "Herramientas de BI", items: ["Power BI", "Tableau", "BigQuery", "Google Sheets"] },
    ],
    certifications: [{ name: "Microsoft Certified: Power BI Data Analyst Associate" }],
  },
  lines: [
    {
      weak: "Creé tableros e informes para la gerencia.",
      strong:
        "Creé un tablero de Power BI con los tiempos de entrega por zona que usan 30 gerentes de ciudad en su revisión semanal.",
    },
    {
      weak: "Analicé datos para encontrar hallazgos.",
      strong:
        "Detecté que el 18% de los pedidos tardíos salía de 4 cocinas que compartían repartidores, lo que llevó a un cambio de personal que recortó los retrasos un tercio.",
    },
    {
      weak: "Responsable de los informes semanales de Excel.",
      strong:
        "Automaticé el informe semanal de inventario con Python y Pandas, y lo bajé de 6 horas de copiar y pegar a 15 minutos.",
    },
  ],
  skills: [
    { label: "Consultas y código" },
    { label: "Hojas de cálculo y BI" },
    { label: "Métodos" },
  ],
  tips: [
    {
      title: "Termina cada línea con la decisión",
      text: "“Creé un tablero” es una tarea. “Creé un tablero que usan 30 gerentes para planificar el personal” es un resultado. La decisión es lo que paga quien contrata.",
    },
    {
      title: "Di qué herramienta, en la línea",
      text: "Las ofertas suelen nombrar SQL más una entre Power BI, Tableau o Looker. Si usaste la que nombran, dilo en la línea donde la usaste, para que la verificación de compatibilidad de Otto la encuentre demostrada, no solo listada.",
    },
    {
      title: "Los puestos de MIS cuentan",
      text: "En India, muchos analistas empiezan como ejecutivos de MIS. Deja el título como era y deja que las líneas muestren el análisis: automatizaciones, modelos e informes que cambiaron algo.",
    },
  ],
  mistakes: [
    {
      title: "Enumerar cada tipo de gráfico",
      text: "Los gráficos circulares y las tablas dinámicas no son habilidades por sí solos. Nombra las herramientas y luego muestra qué cambió un análisis.",
    },
    {
      title: "Hallazgos sin una cifra",
      text: "“Descubrí información que mejoró las ventas” no se puede comprobar. Di qué encontraste, de qué tamaño era y qué hizo el equipo después.",
    },
    {
      title: "Una lista de Kaggle en lugar de trabajo",
      text: "Un proyecto con datos reales y desordenados y una pregunta clara vale más que cinco notebooks de tutorial. Pon primero el trabajo de tus empleos si lo tienes.",
    },
  ],
  faq: [
    {
      question: "¿Qué habilidades debe mostrar un currículum de analista de datos?",
      answer:
        "SQL y una herramienta de tableros casi siempre, Excel casi siempre también, y a menudo Python o R. La estadística y las pruebas A/B importan para los equipos de producto y de marketing. Muestra cada una dentro de una línea donde la usaste.",
    },
    {
      question: "¿Debo incluir un portafolio como analista de datos?",
      answer:
        "Sí, si tienes un proyecto que puedas explicar bien. Enlaza un informe breve o un tablero con la pregunta, los datos, lo que encontraste y qué debería hacer alguien al respecto.",
    },
    {
      question: "¿Un currículum de analista de datos es distinto del de un científico de datos?",
      answer:
        "Sobre todo en el énfasis. Los analistas muestran decisiones tomadas a partir de informes y análisis; los científicos de datos muestran modelos, experimentos y cómo llegaron a producción.",
    },
  ],
};
