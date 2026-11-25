import type { ExampleWords } from "../../../examples";

export const financialAnalyst: ExampleWords<"financial-analyst"> = {
  role: "Analista financiero",
  card: "Pronósticos, modelos y presupuestos ligados a una decisión que tomó la empresa.",
  description:
    "Ejemplo de currículum de analista financiero: pronósticos, presupuestos y modelos de FP&A que guiaron decisiones, y habilidades de Excel y finanzas.",
  intro:
    "A un analista financiero se le juzga por si los líderes confían en sus cifras lo suficiente para actuar con ellas. Por eso cada línea de este ejemplo nombra el modelo o el pronóstico, qué tan cerca estuvo y la decisión que alimentó: un precio, un presupuesto o una tienda que nunca abrió.",
  person:
    "Ryan es inventado: un analista de FP&A con 4 años en una cadena de artículos para el hogar en Dallas, que empezó con una pasantía de verano en un banco. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de analista financiero",
    basics: {
      headline: "Analista financiero, FP&A",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Analista financiero con 4 años en FP&A para una cadena minorista de USD 600 M, creando los pronósticos, presupuestos y modelos de precios con los que deciden los líderes. Trabaja en Excel, SQL y NetSuite, y explica las cifras en un memo de una página.",
    experience: [
      {
        title: "Analista financiero sénior",
        bullets: [
          "Creé el pronóstico mensual de ventas de 85 tiendas en Excel y SQL, y bajé el error del 9% al 3.5% al sumar promociones y clima al modelo.",
          "Modelé la recuperación de la inversión de 6 tiendas propuestas y recomendé descartar las 2 que no la lograban en 3 años, lo que ahorró USD 7 M de capital.",
          "Dirigí la revisión mensual de presupuesto frente a cifras reales con 9 jefes de área, y expliqué cada desvío de más de USD 50,000 en un memo de una página.",
          "Automaticé el paquete de variaciones del cierre de mes con Power Query, y lo bajé de 3 días a 4 horas.",
        ],
      },
      {
        title: "Analista financiero",
        bullets: [
          "Fijé una nueva tarifa de envío con un modelo de 400,000 pedidos, lo que sumó USD 2.1 M al año en margen sin una caída medible de pedidos.",
          "Preparé el presupuesto anual de 4 áreas por un total de USD 38 M y lo entregué 2 semanas antes de la fecha límite del directorio.",
        ],
      },
      {
        title: "Pasante de análisis financiero",
        bullets: [
          "Creé un modelo de flujo de caja para 25 revisiones de préstamos a pequeñas empresas que 3 oficiales de crédito usaron en sus memos de aprobación.",
        ],
      },
    ],
    education: [{ degree: "B.B.A.", field: "Finanzas" }],
    skills: [
      {
        label: "Finanzas",
        items: [
          "Modelado financiero",
          "Pronósticos",
          "Presupuestos",
          "Análisis de variaciones",
          "FP&A",
        ],
      },
      { label: "Herramientas", items: ["Excel", "SQL", "Power Query", "NetSuite", "Power BI"] },
    ],
    certifications: [{ name: "CFA Level I (aprobado)" }],
  },
  lines: [
    {
      weak: "Preparé informes mensuales de variaciones.",
      strong:
        "Dirigí la revisión mensual de presupuesto frente a cifras reales con 9 jefes de área, y expliqué cada desvío de más de USD 50,000 en un memo de una página.",
    },
    {
      weak: "Encargado de crear el pronóstico de ventas.",
      strong:
        "Creé el pronóstico mensual de ventas de 85 tiendas en Excel y SQL, y bajé el error del 9% al 3.5% al sumar promociones y clima al modelo.",
    },
    {
      weak: "Ayudé con el modelado financiero de nuevas tiendas.",
      strong:
        "Modelé la recuperación de la inversión de 6 tiendas propuestas y recomendé descartar las 2 que no la lograban en 3 años, lo que ahorró USD 7 M de capital.",
    },
  ],
  skills: [
    { label: "Finanzas" },
    { label: "Hojas de cálculo y datos" },
    { label: "Sistemas y credenciales" },
  ],
  tips: [
    {
      title: "Di qué tan cerca estuvo el pronóstico",
      text: "El error del pronóstico, la variación del presupuesto, qué tan seguido los líderes usaron el modelo. La precisión es la cifra que más le importa a un gerente de finanzas, y pocos currículums la dan.",
    },
    {
      title: "Une cada modelo a una decisión",
      text: "Un modelo que nadie usó para actuar es una tarea escolar. Nombra lo que hizo la empresa gracias a él: un precio que cambió, una tienda que descartó, un presupuesto que movió.",
    },
    {
      title: "Muestra el tamaño de lo que cubriste",
      text: "Los ingresos, el presupuesto o el tamaño del portafolio le dicen a quien lee tu nivel de inmediato. Escríbelo como una cifra en dólares dentro de la línea, como un presupuesto de USD 38 M entre 4 áreas.",
    },
  ],
  mistakes: [
    {
      title: "“Preparé informes financieros”",
      text: "Todos los analistas lo hacen. Di qué informe, quién lo leyó y qué cambió esa persona después de leerlo.",
    },
    {
      title: "Poner Excel y quedarte ahí",
      text: "En este trabajo, Excel se da por hecho. Di qué construiste con él, como un pronóstico basado en drivers, un modelo de tres estados financieros o un paquete de variaciones automatizado, y qué ahorró.",
    },
    {
      title: "Atribuirte los resultados de la empresa",
      text: "Si la empresa superó sus metas, esa no es tu línea. Quédate con el pronóstico, el análisis o la decisión que fueron tuyos, con su propia cifra.",
    },
  ],
  faq: [
    {
      question: "¿Qué habilidades debe mostrar un currículum de analista financiero?",
      answer:
        "Modelado financiero, pronósticos y presupuestos, casi siempre Excel, y a menudo SQL, una herramienta de BI y el ERP de la empresa, como NetSuite o SAP. Muestra cada una dentro de una línea donde produjo una cifra.",
    },
    {
      question: "¿Debo poner mi avance en el CFA en el currículum?",
      answer:
        "Sí, si encaja con el puesto. Escribe el nivel que aprobaste y el año, o que eres candidato al Level II con la fecha del examen. Cuenta más en puestos de inversiones que en FP&A.",
    },
    {
      question: "¿FP&A es lo mismo que un puesto de analista financiero?",
      answer:
        "FP&A es un tipo de analista financiero: planificación, presupuestos y pronósticos dentro de una empresa. Los analistas de inversiones y de crédito son otros tipos. Usa el título de la oferta si tu trabajo coincide con él.",
    },
  ],
};
