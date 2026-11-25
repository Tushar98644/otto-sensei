import type { ExampleWords } from "../../../examples";

export const uiUxDesigner: ExampleWords<"ui-ux-designer"> = {
  role: "Diseñador UI/UX",
  card: "Texto simple que enlaza el portafolio, con investigación y resultados en cada línea.",
  description:
    "Ejemplo de currículum de diseñador UI/UX en texto simple que el software de selección puede leer, con investigación, resultados, habilidades y consejos.",
  intro:
    "Los diseñadores sienten la tentación de convertir el currículum en una pieza de exhibición, pero el software de selección lee un diseño elaborado como texto revuelto. La solución es un currículum simple que enlace a tu portafolio, con líneas que muestren la investigación detrás de cada diseño y qué cambió después del lanzamiento.",
  person:
    "Hannah es inventada: una diseñadora de producto con 4 años en edtech y fintech en Denver. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de diseñadora UI/UX",
    basics: {
      headline: "Diseñadora de producto (UI/UX)",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Diseñadora de producto con 4 años diseñando apps de aprendizaje y de pagos que se usan en teléfonos Android de gama baja. Empieza con investigación, diseña en Figma y revisa las cifras después del lanzamiento.",
    experience: [
      {
        title: "Diseñadora de producto",
        bullets: [
          "Rediseñé el reproductor de cursos tras 18 pruebas de usabilidad con estudiantes en 3 ciudades, y subí la finalización de lecciones del 42% al 55%.",
          "Creé un sistema de diseño en Figma con 90 componentes y modo oscuro, y reduje a cerca de la mitad el tiempo de diseño a desarrollo de pantallas nuevas.",
          "Diseñé un flujo de onboarding en español e inglés que subió la retención al día 7 de los nuevos estudiantes del 21% al 27%.",
        ],
      },
      {
        title: "Diseñadora UI/UX",
        bullets: [
          "Rediseñé el flujo de pago de facturas de 7 pantallas a 4, lo que redujo un 30% las llamadas a soporte por pagos fallidos.",
          "Dirigí 2 rondas de card sorting con 40 clientes para rehacer el menú de la app, y luego lo probé con un prototipo clicable.",
          "Escribí guías de accesibilidad sobre contraste de color y áreas táctiles que hoy siguen los 3 equipos de la app.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Diseño de Interacción" }],
    skills: [
      {
        label: "Diseño",
        items: [
          "Diseño UX",
          "Diseño UI",
          "Diseño de interacción",
          "Sistemas de diseño",
          "Prototipado",
        ],
      },
      {
        label: "Investigación",
        items: ["Investigación de usuarios", "Pruebas de usabilidad", "Wireframes"],
      },
      { label: "Herramientas", items: ["Figma", "Framer", "Miro", "Adobe Illustrator"] },
    ],
  },
  lines: [
    {
      weak: "Diseñé pantallas para la app móvil.",
      strong:
        "Rediseñé el flujo de pago de facturas de 7 pantallas a 4, lo que redujo un 30% las llamadas a soporte por pagos fallidos.",
    },
    {
      weak: "Hice investigación de usuarios y pruebas de usabilidad.",
      strong:
        "Rediseñé el reproductor de cursos tras 18 pruebas de usabilidad con estudiantes en 3 ciudades, y subí la finalización de lecciones del 42% al 55%.",
    },
    {
      weak: "Creé un sistema de diseño.",
      strong:
        "Creé un sistema de diseño en Figma con 90 componentes y modo oscuro, y reduje a cerca de la mitad el tiempo de diseño a desarrollo de pantallas nuevas.",
    },
  ],
  skills: [{ label: "Diseño" }, { label: "Investigación" }, { label: "Herramientas" }],
  tips: [
    {
      title: "Deja lo visual al portafolio",
      text: "Pon el enlace al portafolio en el encabezado y deja el currículum en texto simple. Un reclutador hojea primero el currículum; en el portafolio es donde ve tu trabajo.",
    },
    {
      title: "Acompaña cada diseño con investigación y un resultado",
      text: "Con cuántas personas hiciste pruebas, qué cambiaste por eso y qué se movió después del lanzamiento. Esa línea en tres partes es lo que buscan los líderes de diseño.",
    },
    {
      title: "Di quiénes eran los usuarios",
      text: "Estudiantes con teléfonos económicos, clientes de un banco pagando facturas, personal de almacén con guantes puestos. El contexto muestra que diseñaste para personas reales, no para una captura de Dribbble.",
    },
  ],
  mistakes: [
    {
      title: "Un currículum hecho en una herramienta de diseño",
      text: "Las columnas, los cuadros de texto y los íconos de una herramienta de diseño suelen salir del software de selección en el orden equivocado, o no salir. La vista del reclutador de Otto te muestra exactamente lo que lee.",
    },
    {
      title: "Barras y calificaciones de habilidades",
      text: "El software no puede leer “Figma: 4 de 5 estrellas”, y para las personas no significa nada. Enumera las herramientas; muestra la habilidad en tus líneas.",
    },
    {
      title: "Solo pantallas, sin resultados",
      text: "“Diseñé el onboarding” es una tarea. Agrega qué cambió: finalización, retención, menos tickets de soporte o desarrollos más rápidos.",
    },
  ],
  faq: [
    {
      question: "¿Un diseñador UI/UX debe tener un currículum creativo?",
      answer:
        "Deja el currículum simple y que tu portafolio sea el creativo. Muchos empleadores leen los currículums primero con software de selección, y los diseños elaborados suelen salir revueltos.",
    },
    {
      question: "¿Debo poner el enlace a mi portafolio en el currículum?",
      answer:
        "Sí, arriba, junto a tu email. Asegúrate de que abra rápido en un teléfono y de que el primer caso de estudio sea el mejor.",
    },
    {
      question: "¿Diseñador de producto es lo mismo que diseñador UI/UX?",
      answer:
        "Los títulos se superponen mucho, y al buscarte empleos, Otto los trata como el mismo tipo de empleo. Usa en tu titular el título de la oferta a la que postulas.",
    },
  ],
};
