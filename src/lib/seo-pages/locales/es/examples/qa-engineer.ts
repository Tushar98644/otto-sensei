import type { ExampleWords } from "../../../examples";

export const qaEngineer: ExampleWords<"qa-engineer"> = {
  role: "Ingeniero de QA",
  card: "Bugs detectados antes del lanzamiento, pruebas más rápidas y una cobertura que creció.",
  description:
    "Ejemplo de currículum de ingeniero de QA: Playwright, Selenium y pruebas de API con bugs escapados, tiempos y cobertura, más habilidades y errores.",
  intro:
    "Las buenas pruebas se miden por lo que nunca llega a los clientes. Un currículum de QA tiene que mostrarlo: bugs detectados antes del lanzamiento, ejecuciones de pruebas más cortas y cuánto del producto cubren hoy tus pruebas. Este ejemplo le pone una cifra a cada cosa.",
  person:
    "Kevin es inventado: un ingeniero de QA con 5 años probando apps de pagos y de reservas de viajes, con base en Austin, Texas. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de ingeniero de QA",
    basics: {
      headline: "Ingeniero de QA",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Ingeniero de QA con 5 años probando apps web y móviles de pagos y viajes. Crea suites automatizadas en Playwright y Java que detectan bugs antes del lanzamiento y mantienen cortas las ejecuciones de pruebas.",
    experience: [
      {
        title: "Ingeniero de QA",
        bullets: [
          "Creé una suite de Playwright con 640 pruebas end-to-end para reservas y checkout, y bajé la regresión de 3 días de pruebas manuales a 40 minutos.",
          "Sumé pruebas de API para 85 endpoints REST al pipeline de CI/CD, y bajé los bugs encontrados en producción de 14 al mes a 4.",
          "Rastreé las pruebas inestables en un tablero de Jira y corregí las 30 peores, con lo que la tasa de éxito en builds limpios subió del 82% al 99%.",
        ],
      },
      {
        title: "Analista de QA",
        bullets: [
          "Escribí 400 casos de prueba manuales para una app de pagos con tarjeta y automaticé en Selenium con Java los 150 más usados.",
          "Encontré un bug de redondeo en la conversión de divisas 3 días antes del lanzamiento, que habría cobrado de más al 2% de los pagos con tarjetas extranjeras.",
          "Ejecuté pruebas de accesibilidad en 25 pantallas de checkout y registré 60 problemas, todos cerrados antes de la auditoría anual del banco.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Sistemas de Información" }],
    skills: [
      {
        label: "Automatización",
        items: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript"],
      },
      { label: "Pruebas", items: ["Pruebas de API", "Pruebas de regresión", "Accesibilidad"] },
      { label: "Herramientas", items: ["Jira", "Postman", "Git", "Jenkins"] },
    ],
    certifications: [{ name: "ISTQB Certified Tester Foundation Level" }],
  },
  lines: [
    {
      weak: "Hice pruebas manuales y automatizadas para la app de reservas.",
      strong:
        "Creé una suite de Playwright con 640 pruebas end-to-end para reservas y checkout, y bajé la regresión de 3 días de pruebas manuales a 40 minutos.",
    },
    {
      weak: "Probé APIs y reporté bugs a los desarrolladores.",
      strong:
        "Sumé pruebas de API para 85 endpoints REST al pipeline de CI/CD, y bajé los bugs encontrados en producción de 14 al mes a 4.",
    },
    {
      weak: "Trabajé en corregir pruebas inestables.",
      strong:
        "Rastreé las pruebas inestables en un tablero de Jira y corregí las 30 peores, con lo que la tasa de éxito en builds limpios subió del 82% al 99%.",
    },
  ],
  skills: [
    { label: "Automatización" },
    { label: "Lenguajes y APIs" },
    { label: "Procesos y herramientas" },
  ],
  tips: [
    {
      title: "Cuenta los bugs escapados, no los casos de prueba",
      text: "Escribir 400 casos de prueba es esfuerzo; que lleguen menos bugs a producción es el resultado. Acompaña la suite que creaste con la baja de bugs en producción o de tickets de soporte que vino después.",
    },
    {
      title: "Muestra cuánto tarda una ejecución de pruebas",
      text: "Los equipos esperan las pruebas de regresión antes de cada lanzamiento. Pasar de días a minutos es un resultado que cualquier gerente de ingeniería nota, así que da el antes y el después.",
    },
    {
      title: "Nombra el bug del que más te enorgulleces",
      text: "Una línea sobre un bug grave que detectaste, y lo que habría costado, muestra el criterio que una cifra de cobertura no puede mostrar.",
    },
  ],
  mistakes: [
    {
      title: "Enumerar cada tipo de prueba",
      text: "Smoke, sanity, regresión, UAT, caja negra, caja blanca: la lista ocupa espacio sin mostrar habilidad. Nombra los tipos de prueba dentro de líneas que muestren qué detectaron.",
    },
    {
      title: "Trabajo manual primero en una oferta de automatización",
      text: "Si la oferta pide automatización, pon tus suites automatizadas arriba, aunque sean pequeñas. Las pruebas manuales siguen contando, pero empieza con el código que escribiste.",
    },
    {
      title: "“Aseguré la calidad del producto”",
      text: "Nadie puede comprobar algo así. Di qué probaste, cuánto y qué cambió: menos bugs escapados, una ejecución más corta, una tasa de éxito más alta.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de ingeniero de QA?",
      answer:
        "Los productos que probaste, tus herramientas y lenguajes de automatización, y cifras de bugs detectados, bugs escapados a producción, tiempo de ejecución de pruebas o cobertura. Agrega un certificado ISTQB si lo tienes, pero deja que tus líneas lleven el peso.",
    },
    {
      question: "¿Cómo paso de pruebas manuales a automatización en mi currículum?",
      answer:
        "Muestra la automatización que ya hiciste, aunque haya sido una tarea secundaria: scripts que escribiste, casos manuales que automatizaste, un paso del pipeline que agregaste. Un proyecto público pequeño ayuda si el código de tu trabajo es privado.",
    },
    {
      question: "¿Un SDET es un trabajo distinto de un ingeniero de QA?",
      answer:
        "Un SDET escribe más código y a menudo construye el propio framework de pruebas, pero al buscarte empleos, Otto trata ambos como el mismo tipo de empleo. Si postulas a puestos de SDET, pon primero tus líneas con más código.",
    },
  ],
};
