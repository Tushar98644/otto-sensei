import type { ExampleWords } from "../../../examples";

export const accountant: ExampleWords<"accountant"> = {
  role: "Contador",
  card: "Un cierre más rápido y limpio: conciliaciones, auditorías y los controles detrás.",
  description:
    "Ejemplo de currículum de contador: cierre mensual, conciliaciones y auditorías en cifras, y las habilidades de GAAP, ERP y Excel que piden las ofertas.",
  intro:
    "La mayoría de los currículums de contabilidad enumeran las mismas tareas: asientos contables, conciliaciones, cierre mensual. Lo que distingue a uno es qué tan bien salieron. Este ejemplo mide el cierre en días, las conciliaciones en cuentas y dólares, y la auditoría en ajustes.",
  person:
    "Megan es inventada: una CPA con 6 años, primero en auditoría en una firma pequeña y luego en un fabricante de Indianápolis. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de contadora",
    basics: {
      headline: "Contadora sénior, CPA",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "CPA con 6 años en auditoría y contabilidad corporativa; hoy lleva el cierre mensual de un fabricante de USD 240 M. Mantiene las conciliaciones limpias, los archivos de auditoría claros y el cierre dentro de su calendario.",
    experience: [
      {
        title: "Contadora sénior",
        bullets: [
          "Reduje el cierre mensual de 9 días hábiles a 5 pasando 120 asientos recurrentes a plantillas de NetSuite y fijando un calendario diario de cierre.",
          "Concilié 65 cuentas del balance cada mes y depuré USD 410,000 en partidas antiguas que llevaban más de un año sin explicación.",
          "Lideré la auditoría de cierre de año con una firma externa y entregué 180 solicitudes a tiempo, sin ningún ajuste de auditoría.",
          "Creé un modelo de costeo de inventario en Excel para 3 plantas y detecté USD 260,000 de producción en proceso sobrevaluada antes de la auditoría.",
        ],
      },
      {
        title: "Contadora",
        bullets: [
          "Registré altas y depreciación de 1,400 activos fijos, y corregí un error de USD 95,000 en un calendario de arrendamientos bajo ASC 842.",
          "Escribí guías paso a paso para 14 tareas de cierre, de modo que 2 nuevas contrataciones cerraran sus cuentas sin ayuda ya en su segundo mes.",
        ],
      },
      {
        title: "Asociada de auditoría",
        bullets: [
          "Audité a 11 clientes manufactureros y sin fines de lucro con ingresos de USD 5 M a USD 90 M, con pruebas de ingresos, inventario y nómina.",
          "Detecté un pago duplicado de USD 70,000 a un proveedor en un cliente sin fines de lucro, hallazgo que llevó a un nuevo control de aprobación para pagos sobre USD 10,000.",
        ],
      },
    ],
    education: [
      { degree: "M.Acc.", field: "Contabilidad" },
      { degree: "B.S.", field: "Contabilidad" },
    ],
    skills: [
      {
        label: "Contabilidad",
        items: [
          "GAAP",
          "Cierre mensual",
          "Conciliación de cuentas",
          "Asientos contables",
          "Apoyo en auditorías",
          "ASC 842",
        ],
      },
      { label: "Sistemas", items: ["NetSuite", "Excel", "BlackLine", "QuickBooks"] },
    ],
    certifications: [{ name: "Certified Public Accountant (CPA)" }],
  },
  lines: [
    {
      weak: "Responsable del cierre mensual.",
      strong:
        "Reduje el cierre mensual de 9 días hábiles a 5 pasando 120 asientos recurrentes a plantillas de NetSuite y fijando un calendario diario de cierre.",
    },
    {
      weak: "Realicé conciliaciones de cuentas.",
      strong:
        "Concilié 65 cuentas del balance cada mes y depuré USD 410,000 en partidas antiguas que llevaban más de un año sin explicación.",
    },
    {
      weak: "Ayudé con la auditoría anual.",
      strong:
        "Lideré la auditoría de cierre de año con una firma externa y entregué 180 solicitudes a tiempo, sin ningún ajuste de auditoría.",
    },
  ],
  skills: [
    { label: "Contabilidad" },
    { label: "Sistemas" },
    { label: "Hojas de cálculo y licencias" },
  ],
  tips: [
    {
      title: "Mide el cierre",
      text: "Días para cerrar, cuentas conciliadas, asientos automatizados. El cierre es el pulso del trabajo, así que dale una cifra de antes y después.",
    },
    {
      title: "Nombra las normas y el sistema",
      text: "Di qué temas de GAAP manejaste, como ingresos bajo ASC 606 o arrendamientos bajo ASC 842, y el ERP en el que cerraste. Las ofertas suelen nombrar los dos, y que coincidan ayuda a un reclutador a ubicarte.",
    },
    {
      title: "Pon el CPA donde se vea",
      text: "Agrega CPA después de tu nombre o en el titular, y anota la licencia con su estado y su año. Si todavía estás presentando los exámenes, di qué secciones aprobaste.",
    },
  ],
  mistakes: [
    {
      title: "Copiar la descripción del puesto",
      text: "“Preparé asientos contables y conciliaciones” es lo que ya dice la oferta. Agrega cuántos, qué tan rápido y qué detectaste en el camino.",
    },
    {
      title: "Omitir los resultados de auditoría",
      text: "Las auditorías son donde se califica el trabajo de un contador. Si la tuya terminó sin ajustes, o con menos hallazgos que el año anterior, dilo con las cifras.",
    },
    {
      title: "Cada programa que alguna vez usaste",
      text: "Una lista larga de software contable empuja hacia abajo el que importa. Empieza con el ERP que nombra la oferta, y menciona brevemente los sistemas más antiguos o déjalos fuera.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de contador?",
      answer:
        "Tu estatus de CPA, el tamaño de los libros que llevaste, el trabajo de cierre y conciliación a tu cargo, los resultados de auditoría y tus habilidades de ERP y Excel. Usa cifras para días, cuentas y dólares.",
    },
    {
      question: "¿Debo poner las secciones del examen CPA que aprobé?",
      answer:
        "Sí. Escribe “Candidato a CPA” con las secciones aprobadas, como AUD y FAR, y el año, para que los reclutadores vean que vas en camino. Cuando tengas la licencia, pon la licencia en su lugar.",
    },
    {
      question: "¿Cómo paso de una firma de contadores públicos a una empresa?",
      answer:
        "Conserva el empleo de auditoría y muestra el trabajo con clientes en cifras: cuántos clientes, de qué tamaño, qué probaste. Luego agrega cualquier trabajo de cierre, conciliación o sistemas, para que un contralor vea que puedes llevar los libros.",
    },
  ],
};
