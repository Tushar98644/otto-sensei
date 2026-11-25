import type { ExampleWords } from "../../../examples";

export const accountExecutive: ExampleWords<"account-executive"> = {
  role: "Ejecutivo de cuentas",
  card: "Cuota, tasa de cierre, tamaño de los acuerdos y ciclo de venta en ventas de software.",
  description:
    "Ejemplo de currículum de ejecutivo de cuentas SaaS con cuota, tasa de cierre, tamaño de acuerdo y ciclo, y las habilidades de CRM que piden las ofertas.",
  intro:
    "A un ejecutivo de cuentas se le contrata para cerrar, así que un líder de ventas lee primero la cuota y su cumplimiento. Después vienen el tamaño de los acuerdos, la tasa de cierre y la duración del ciclo, porque muestran cómo cierras. Este ejemplo los pone todos donde quien lee los encuentra en segundos.",
  person:
    "Megan es inventada: una ejecutiva de cuentas con 5 años vendiendo software de finanzas y analítica, con base en Chicago. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de ejecutiva de cuentas",
    basics: {
      headline: "Ejecutiva de cuentas corporativas",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Ejecutiva de cuentas con 5 años vendiendo software a equipos de finanzas de empresas medianas y grandes. Cerró USD 2.4 M en nuevos ingresos anuales el año pasado, con un 120% de su cuota, y lleva cada acuerdo desde la primera llamada hasta el contrato firmado.",
    experience: [
      {
        title: "Ejecutiva de cuentas corporativas",
        bullets: [
          "Cerré USD 2.4 M en nuevos ingresos recurrentes anuales en 2025 frente a una cuota de USD 2.0 M, y terminé en el 2.º lugar entre 14 ejecutivos de cuentas.",
          "Aumenté la tasa de cierre de oportunidades calificadas del 22% al 31% con revisiones MEDDICC en cada acuerdo de más de USD 50,000.",
          "Acorté el ciclo de venta promedio de 120 a 84 días llevando las revisiones de seguridad y legales al primer mes.",
          "Generé el 40% del pipeline con llamadas en frío y contactos por LinkedIn, y agendé unas 25 primeras reuniones al mes.",
        ],
      },
      {
        title: "Ejecutiva de cuentas, empresas medianas",
        bullets: [
          "Superé la cuota en 8 de 10 trimestres, con un cumplimiento promedio del 112% sobre una meta anual de USD 780,000.",
          "Aumenté el tamaño promedio de los acuerdos de USD 18,000 a USD 29,000 presentando el complemento de nómina en cada primera demo.",
          "Mantuve el pronóstico trimestral en Salesforce a menos de un 10% de las ventas reales durante 8 trimestres seguidos.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Comunicación" }],
    skills: [
      {
        label: "Ventas",
        items: [
          "Negociación",
          "Gestión del pipeline",
          "Pronóstico de ventas",
          "Llamadas en frío",
          "MEDDICC",
        ],
      },
      { label: "Herramientas", items: ["Salesforce", "Gong", "Salesloft", "HubSpot", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Cumplí y superé las metas de ventas de forma constante.",
      strong:
        "Superé la cuota en 8 de 10 trimestres, con un cumplimiento promedio del 112% sobre una meta anual de USD 780,000.",
    },
    {
      weak: "Manejé acuerdos corporativos de principio a fin.",
      strong:
        "Cerré USD 2.4 M en nuevos ingresos recurrentes anuales en 2025 frente a una cuota de USD 2.0 M, y terminé en el 2.º lugar entre 14 ejecutivos de cuentas.",
    },
    {
      weak: "Formé parte de un equipo que mejoró las tasas de cierre.",
      strong:
        "Aumenté la tasa de cierre de oportunidades calificadas del 22% al 31% con revisiones MEDDICC en cada acuerdo de más de USD 50,000.",
    },
  ],
  skills: [
    { label: "Ventas" },
    { label: "Acuerdos y cuentas" },
    { label: "Herramientas de ventas" },
  ],
  tips: [
    {
      title: "Pon la cuota y el resultado en una línea",
      text: "“USD 2.4 M frente a una cuota de USD 2.0 M” le permite a un líder de ventas calcular de un vistazo el cumplimiento y el tamaño de tu meta. Un porcentaje solo esconde qué tan grande era la meta.",
    },
    {
      title: "Muestra el tamaño y el ciclo de tus acuerdos",
      text: "Vender acuerdos de USD 8,000 en dos semanas y acuerdos de USD 200,000 en seis meses son trabajos distintos. Da las dos cifras para que quien contrata sepa qué tipo de venta conoces.",
    },
    {
      title: "Di cuánto pipeline generaste",
      text: "La mayoría de los puestos de AE esperan que encuentres parte de tu propio pipeline. Una línea sobre reuniones agendadas por prospección o pipeline creado muestra que no esperas a que marketing te mande leads.",
    },
  ],
  mistakes: [
    {
      title: "Un premio sin cifras",
      text: "El President's Club le dice a quien lee que te fue bien; la cuota y el cumplimiento detrás le dicen qué tan bien. Conserva el premio y pon las cifras en la misma línea.",
    },
    {
      title: "Un puesto en el ranking sin el total",
      text: "“Mejor vendedor” dice más cuando quien lee sabe que fue el 2.º lugar entre 14. Indica el tamaño del equipo con el que te compararon y el período.",
    },
    {
      title: "Cada función que mostraste en una demo",
      text: "Las funciones del producto van en la presentación de ventas. El currículum necesita quién compró, cuánto pagó y qué lo llevó a firmar.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de ejecutivo de cuentas?",
      answer:
        "La cuota y el cumplimiento de cada año, el tamaño promedio de los acuerdos, el ciclo de venta, la tasa de cierre, el segmento al que vendiste y el CRM que usaste. Los líderes de ventas quieren dos o tres años de cifras, no un buen trimestre.",
    },
    {
      question: "¿Cómo paso de SDR a ejecutivo de cuentas en mi currículum?",
      answer:
        "Empieza con las cifras que predicen el cierre: reuniones agendadas, pipeline creado y cuánto de eso se convirtió en ingresos. Agrega los acuerdos que llevaste tú, aunque sean pequeños, y muestra el ascenso si lo tuviste.",
    },
    {
      question: "¿Debo mostrar mi cuota si no la cumplí?",
      answer:
        "Sí, con el contexto que la hace justa: un territorio nuevo, un período de rampa o un mercado que se achicó. Si dejas fuera la cuota, quien lee supone lo peor, y de todos modos te lo preguntará en la entrevista.",
    },
  ],
};
