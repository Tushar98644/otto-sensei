import type { ExampleWords } from "../../../examples";

export const frontendDeveloper: ExampleWords<"frontend-developer"> = {
  role: "Desarrollador frontend",
  card: "React y TypeScript, con la velocidad y la accesibilidad en cifras.",
  description:
    "Ejemplo de currículum de desarrollador frontend: líneas de React y TypeScript con resultados, habilidades clave y cómo mostrar velocidad y accesibilidad.",
  intro:
    "Un currículum frontend tiene que probar dos cosas en pocos segundos: que construyes interfaces que la gente usa, y que te importa qué tan rápidas y accesibles son. Este ejemplo muestra ambas con cifras que quien contrata puede comprobar.",
  person:
    "Daniel es inventado: un desarrollador frontend con 5 años en empresas de producto, que trabaja en remoto desde Minneapolis. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de desarrollador frontend",
    basics: {
      headline: "Desarrollador frontend",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Desarrollador frontend con 5 años creando apps en React y TypeScript para tiendas en línea y tableros SaaS. Conocido por páginas rápidas, sistemas de diseño ordenados y formularios accesibles.",
    experience: [
      {
        title: "Desarrollador frontend sénior",
        bullets: [
          "Rehice la página de producto en Next.js con renderizado en el servidor, y bajé el Largest Contentful Paint de 3.9 s a 1.6 s en teléfonos de gama media.",
          "Lideré el paso de 120 componentes a un sistema de diseño compartido en Storybook, que usan 4 equipos de producto.",
          "Corregí 64 problemas de WCAG en el checkout tras una auditoría, y agregué pruebas de Playwright para que los nuevos hagan fallar el build.",
          "Guié a 2 desarrolladores junior con revisiones de código y programación en pareja; hoy ambos se hacen cargo de funciones de principio a fin.",
        ],
      },
      {
        title: "Desarrollador frontend",
        bullets: [
          "Creé el tablero de analítica en React, TypeScript y D3.js que abren 900 cuentas de clientes cada semana.",
          "Reduje el bundle principal de JavaScript de 780 KB a 310 KB dividiendo rutas y reemplazando dos bibliotecas de gráficos pesadas.",
          "Escribí pruebas unitarias en Jest para las pantallas de facturación, y subí la cobertura del 35% al 80% en 6 meses.",
        ],
      },
    ],
    projects: [
      {
        name: "Verificador de contraste de color",
        tech: "TypeScript, Vite",
        bullets: [
          "Creé una herramienta gratuita para el navegador que compara colores de texto con las proporciones de contraste de WCAG, con 2,000 visitantes al mes.",
        ],
      },
    ],
    education: [{ degree: "Licenciatura", field: "Ciencias de la Computación" }],
    skills: [
      { label: "Lenguajes", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Redux", "Tailwind CSS", "D3.js"],
      },
      { label: "Calidad", items: ["Jest", "Playwright", "Storybook", "WCAG", "Figma"] },
    ],
  },
  lines: [
    {
      weak: "Desarrollé varios componentes de UI para el sitio web.",
      strong:
        "Lideré el paso de 120 componentes a un sistema de diseño compartido en Storybook, que usan 4 equipos de producto.",
    },
    {
      weak: "Mejoré el rendimiento del sitio web.",
      strong:
        "Rehice la página de producto en Next.js con renderizado en el servidor, y bajé el Largest Contentful Paint de 3.9 s a 1.6 s en teléfonos de gama media.",
    },
    {
      weak: "Hice accesible el sitio.",
      strong:
        "Corregí 64 problemas de WCAG en el checkout tras una auditoría, y agregué pruebas de Playwright para que los nuevos hagan fallar el build.",
    },
  ],
  skills: [{ label: "Lenguajes" }, { label: "Frameworks" }, { label: "Pruebas y calidad" }],
  tips: [
    {
      title: "Mide la velocidad como lo hacen los equipos",
      text: "Nombra la métrica y el dispositivo: Largest Contentful Paint en un teléfono de gama media, tamaño del bundle en KB, tiempo hasta la interactividad. “La hice más rápida” no le da a quien te entrevista nada sobre qué preguntar.",
    },
    {
      title: "Enlaza algo en vivo",
      text: "Un portafolio o un proyecto en vivo le permite a quien lee hacer clic en lugar de creerte. Pon el enlace en el encabezado y asegúrate de que cargue en un teléfono.",
    },
    {
      title: "Nombra el framework que nombra la oferta",
      text: "Si la oferta pide React y tu trabajo fue en React, di React en la línea, no solo “frameworks de JavaScript”. La verificación de compatibilidad de Otto busca las palabras de la propia oferta.",
    },
  ],
  mistakes: [
    {
      title: "Un portafolio de capturas dentro del currículum",
      text: "Las imágenes y los diseños armados en herramientas de diseño se ven bien para las personas, pero el software de selección no lee nada en ellos. Deja el currículum en texto y enlaza lo visual.",
    },
    {
      title: "Cada biblioteca que alguna vez importaste",
      text: "Lodash y Axios no te consiguen entrevistas. Enumera los frameworks y las herramientas que elegiste y puedes defender, y deja el resto para la conversación.",
    },
    {
      title: "Palabras vagas como “varios” y “diversos”",
      text: "La revisión de líneas de Otto las marca porque esconden el tamaño. En su lugar, cuenta los componentes, las páginas o los equipos.",
    },
  ],
  faq: [
    {
      question: "¿Un currículum de desarrollador frontend debe tener diseño?",
      answer:
        "Mantenlo simple. Tu portafolio muestra tu sentido del diseño; el currículum tiene que leerse bien en el software de selección, que mezcla columnas, íconos y cuadros de texto. Una sola columna de texto real es lo más seguro.",
    },
    {
      question: "¿Basta con React o necesito otros frameworks?",
      answer:
        "Sigue a la oferta. Muchos equipos contratan para React con TypeScript, pero algunos piden Vue o Angular. Nombra lo que de verdad usaste, y adapta el orden a cada puesto.",
    },
    {
      question: "¿Necesito un portafolio como desarrollador frontend?",
      answer:
        "Ayuda mucho. Uno o dos proyectos en vivo con una nota breve sobre qué construiste y por qué valen más que una larga lista de tutoriales.",
    },
  ],
};
