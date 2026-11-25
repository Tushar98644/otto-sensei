import type { ExampleWords } from "../../../examples";

export const digitalMarketing: ExampleWords<"digital-marketing"> = {
  role: "Marketing digital",
  card: "Presupuesto, canal y resultado juntos, en medios pagados, búsqueda y email.",
  description:
    "Ejemplo de currículum de marketing digital: SEO, anuncios y email con inversión, leads y retorno, y las habilidades y herramientas que piden las ofertas.",
  intro:
    "El marketing digital se mide al dólar, al clic y al lead, así que un currículum sin cifras llama la atención por la razón equivocada. Este ejemplo muestra presupuesto, canal y resultado en cada línea, como los lee quien dirige marketing.",
  person:
    "Rachel es inventada: una especialista en marketing digital con 4 años en marcas de venta directa al consumidor y edtech, que trabaja desde Los Ángeles. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de marketing digital",
    basics: {
      headline: "Gerente de marketing digital",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Especialista en marketing digital con 4 años gestionando medios pagados, búsqueda y email para marcas de consumo. Administra presupuestos, reporta con cifras claras y recorta lo que no se paga solo.",
    experience: [
      {
        title: "Gerente de marketing digital",
        bullets: [
          "Dirigí campañas de Google Ads y Meta con un presupuesto mensual de USD 21,000, y subí el retorno de la inversión publicitaria (ROAS) de 2.1 a 3.4 en 9 meses.",
          "Aumenté el tráfico orgánico de 40,000 a 110,000 visitas al mes con un plan de SEO basado en 60 páginas de producto y guías prácticas.",
          "Configuré en HubSpot correos de carrito abandonado que hoy recuperan el 9% de los carritos, unos 1,200 pedidos al mes.",
          "Pasé el reporte semanal de capturas de pantalla a un tablero de Looker Studio, ahorrando 4 horas de trabajo manual cada semana.",
        ],
      },
      {
        title: "Ejecutiva de marketing digital",
        bullets: [
          "Reduje el costo por lead de las inscripciones a cursos de USD 4.80 a USD 3.00 rehaciendo las landing pages y pausando 30 palabras clave débiles.",
          "Planifiqué 3 campañas con creadores de Instagram y YouTube que trajeron 14,000 registros a la prueba gratuita.",
          "Escribí y probé 50 variantes de anuncios al mes, y conservé el 10% con mejor desempeño para la siguiente ronda.",
        ],
      },
    ],
    education: [{ degree: "BBA", field: "Marketing" }],
    skills: [
      {
        label: "Canales",
        items: [
          "SEO",
          "Google Ads",
          "Marketing de performance",
          "Marketing por email",
          "Redes sociales",
        ],
      },
      { label: "Herramientas", items: ["Google Analytics", "HubSpot", "Canva", "Excel"] },
    ],
    certifications: [{ name: "Google Ads Search Certification" }],
  },
  lines: [
    {
      weak: "Gestioné redes sociales y campañas pagadas.",
      strong:
        "Dirigí campañas de Google Ads y Meta con un presupuesto mensual de USD 21,000, y subí el retorno de la inversión publicitaria (ROAS) de 2.1 a 3.4 en 9 meses.",
    },
    {
      weak: "Manejé el SEO del sitio web de la empresa.",
      strong:
        "Aumenté el tráfico orgánico de 40,000 a 110,000 visitas al mes con un plan de SEO basado en 60 páginas de producto y guías prácticas.",
    },
    {
      weak: "Responsable del marketing por email.",
      strong:
        "Configuré en HubSpot correos de carrito abandonado que hoy recuperan el 9% de los carritos, unos 1,200 pedidos al mes.",
    },
  ],
  skills: [{ label: "Canales" }, { label: "Analítica" }, { label: "Plataformas" }],
  tips: [
    {
      title: "Muestra el presupuesto y el retorno juntos",
      text: "Una cifra de inversión sola suena a costo; un retorno solo suena a suerte. Juntos muestran que se te puede confiar dinero: presupuesto, canal, resultado.",
    },
    {
      title: "Escribe el dinero como lo lee el empleador",
      text: "Para empleos en India, lakh y rupias se leen con naturalidad. Para empleos en el extranjero, convierte a dólares estadounidenses o a la moneda local, o usa un porcentaje, para que nadie tenga que hacer cuentas.",
    },
    {
      title: "Nombra las herramientas de la oferta",
      text: "Google Ads, Meta, HubSpot, GA4: las ofertas de marketing nombran las herramientas con precisión, y la verificación de compatibilidad de Otto también. Di la herramienta dentro de la línea donde la usaste.",
    },
  ],
  mistakes: [
    {
      title: "Métricas de vanidad",
      text: "Seguidores e impresiones sin leads, ventas ni costo se leen como relleno. Acompaña el alcance con el resultado al que llevó.",
    },
    {
      title: "“Manejé redes sociales”",
      text: "La revisión de líneas de Otto marca arranques débiles como “Manejé” porque esconden lo que hiciste. Empieza con la acción y termina con la cifra.",
    },
    {
      title: "Cada certificado que tienes",
      text: "Dos o tres certificados vigentes de las plataformas que usas son suficientes. Una lista larga de cursos cortos empuja tus resultados hacia abajo en la página.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de marketing digital?",
      answer:
        "Los canales que manejaste, los presupuestos que gestionaste y un resultado para cada uno: leads, ventas, costo por lead o retorno de la inversión publicitaria. Agrega las herramientas que usaste y dos o tres certificados vigentes.",
    },
    {
      question: "¿Cómo muestro resultados si no sé las cifras exactas?",
      answer:
        "Usa lo que puedas sostener: un rango, un porcentaje o un antes y después de tus informes. Otto te pide la cifra cuando corrige una línea y nunca se inventa una.",
    },
    {
      question: "¿Debo incluir un portafolio para marketing digital?",
      answer:
        "Uno breve ayuda: dos o tres campañas con el objetivo, lo que hiciste y el resultado. Deja fuera todo lo que tu empleador no querría que se compartiera.",
    },
  ],
};
