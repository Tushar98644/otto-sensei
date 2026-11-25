import type { ExampleWords } from "../../../examples";

export const businessDevelopment: ExampleWords<"business-development"> = {
  role: "Desarrollo de negocios y ventas",
  card: "Cuota, pipeline y tamaño de los acuerdos, tal como los leen los gerentes de ventas.",
  description:
    "Ejemplo de currículum de desarrollo de negocios y ventas: cuota, pipeline y tamaño de acuerdo, las habilidades de CRM que piden las ofertas y errores.",
  intro:
    "Las ventas son el trabajo más fácil de poner en cifras y el lugar donde más se dejan fuera. Un gerente de ventas quiere tu cuota, qué tan seguido la cumples, el tamaño de tus acuerdos y cómo encontraste esos acuerdos. Este ejemplo da las cuatro cosas.",
  person:
    "Andre es inventado: un gerente de desarrollo de negocios con 5 años vendiendo software a empresas medianas, con base en Atlanta. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de desarrollo de negocios",
    basics: {
      headline: "Gerente de desarrollo de negocios",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Gerente de desarrollo de negocios con 5 años vendiendo software de recursos humanos y nómina a empresas de 50 a 1,000 empleados. Arma el pipeline con prospección en frío y cierra con los jefes de finanzas y de recursos humanos.",
    experience: [
      {
        title: "Gerente de desarrollo de negocios",
        bullets: [
          "Cerré el 128% de una cuota anual de nuevos negocios en el año fiscal 2025, con 31 cuentas nuevas y un acuerdo promedio de USD 10,500 al año.",
          "Generé el 60% del pipeline mediante LinkedIn y llamadas en frío, con 2 SDR que agendaban demos desde una lista compartida de cuentas objetivo.",
          "Reduje el ciclo de venta de los acuerdos medianos de 74 a 52 días sumando una prueba de nómina con los datos del propio cliente.",
          "Mantuve al día las notas y los próximos pasos en Salesforce, de modo que las llamadas de pronóstico pasaron de 45 a 20 minutos.",
        ],
      },
      {
        title: "Ejecutivo de desarrollo de negocios",
        bullets: [
          "Firmé 22 cuentas nuevas de clientes de carga en 2022, que sumaron USD 360,000 en ingresos anuales por fletes.",
          "Realicé 60 llamadas al día a nuevos clientes de carga y convertí el 8% de las primeras reuniones en pruebas.",
          "Recuperé 9 cuentas perdidas ofreciendo una revisión del servicio de 30 días con su equipo de operaciones.",
        ],
      },
    ],
    education: [
      { degree: "MBA", field: "Marketing" },
      { degree: "B.S.", field: "Administración de Empresas" },
    ],
    skills: [
      {
        label: "Ventas",
        items: [
          "Desarrollo de negocios",
          "Generación de leads",
          "Llamadas en frío",
          "Negociación",
          "Gestión de cuentas",
        ],
      },
      {
        label: "Herramientas",
        items: ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Excel"],
      },
    ],
  },
  lines: [
    {
      weak: "Generé leads y cerré acuerdos.",
      strong:
        "Cerré el 128% de una cuota anual de nuevos negocios en el año fiscal 2025, con 31 cuentas nuevas y un acuerdo promedio de USD 10,500 al año.",
    },
    {
      weak: "Excelentes habilidades de comunicación y trayectoria comprobada en ventas.",
      strong:
        "Reduje el ciclo de venta de los acuerdos medianos de 74 a 52 días sumando una prueba de nómina con los datos del propio cliente.",
    },
    {
      weak: "Hice llamadas en frío a clientes potenciales.",
      strong:
        "Realicé 60 llamadas al día a nuevos clientes de carga y convertí el 8% de las primeras reuniones en pruebas.",
    },
  ],
  skills: [{ label: "Ventas" }, { label: "Pipeline" }, { label: "Métodos" }],
  tips: [
    {
      title: "Primero la cuota, después el cómo",
      text: "Porcentaje de la cuota, el período, el número de acuerdos y el tamaño promedio. Después, una o dos líneas sobre cómo armaste el pipeline. Ese orden coincide con cómo leen los gerentes de ventas.",
    },
    {
      title: "Escribe el dinero para el mercado al que postulas",
      text: "Lakh y crore se leen con naturalidad para los empleadores indios. Para puestos en el extranjero, convierte a dólares estadounidenses o a la moneda local para que el tamaño de tus acuerdos se entienda de un vistazo.",
    },
    {
      title: "Di a quién le vendiste",
      text: "Tamaño de la empresa, industria y el puesto de quien compra. Venderles a jefes de recursos humanos en empresas de 200 personas es un trabajo distinto a venderle al área de compras de un banco.",
    },
  ],
  mistakes: [
    {
      title: "Rasgos en lugar de resultados",
      text: "“Excelentes habilidades de comunicación” es algo que dice todo el mundo. La revisión de líneas de Otto lo marca como frase hecha; un acuerdo cerrado lo demuestra.",
    },
    {
      title: "Ingresos sin una cuota",
      text: "“Generé 2 crore” puede ser excelente o estar por debajo de la meta. Da la cuota o tu posición en el equipo para que la cifra tenga una escala.",
    },
    {
      title: "Esconder las partes difíciles",
      text: "La prospección en frío, los ciclos largos y los acuerdos perdidos que recuperaste son lo que preguntan en las entrevistas. Muestra que sabes encontrar negocios, no solo recibirlos.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe mostrar un currículum de ventas o de desarrollo de negocios?",
      answer:
        "El cumplimiento de la cuota, la cantidad y el tamaño de los acuerdos, el ciclo de venta y cómo armaste el pipeline. Agrega el CRM que usaste y el tipo de cliente al que le vendiste.",
    },
    {
      question: "¿Debo mostrar mis metas en lakh o en dólares?",
      answer:
        "Usa la moneda con la que trabaja el empleador. Lakh y crore les sirven a los empleadores en India; para empleos en el extranjero, convierte a dólares o muestra porcentajes de la cuota.",
    },
    {
      question: "¿Puedo incluir premios como “mejor desempeño”?",
      answer:
        "Sí, con la escala: “Top 3 de 40 ejecutivos de cuentas en 2024” dice más que “Vendedor estrella”. Deja fuera los premios que no puedas explicar en una oración.",
    },
  ],
};
