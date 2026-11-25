import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume templates page, in Spanish; format names stay as they are.
export default {
  meta: {
    title: "Plantillas de currículum ATS: {count} formatos, {free} gratis",
    description:
      "{count} plantillas de currículum, todas en una columna de texto real y probadas releyendo el PDF. {freeFormats} son gratis en PDF; {proCount} más vienen con {pro}.",
  },
  crumb: "Plantillas de currículum",
  eyebrow: "Plantillas de currículum",
  title: "{count} formatos de currículum,",
  titleEm: "cada uno en una columna de texto real.",
  intro:
    "Cada uno copia un diseño de currículum muy usado, y cada PDF se prueba leyéndolo de nuevo. {freeFormats} se descargan gratis en PDF; los otros {proCount} vienen con {pro}, y puedes probarlos primero en tu currículum.",
  tip: "¿No sabes cuál? Classic sirve para cualquier empleo. Compact deja una carrera larga en una página.",
  formatsTitle: "Formatos",
  listName: "Formatos de currículum",
  preview: "Ver la página completa de {name}",
  use: "Usar este formato",
  close: "Cerrar",
  imageAlt: "Página 1 de un currículum de muestra en el formato {name}",
  formats: {
    classic: {
      description:
        "El diseño que recomiendan las oficinas de empleo de las universidades: tipografía sencilla, títulos centrados sin líneas y el empleador encima de tu puesto en cada empleo.",
      bestFor: "Cualquier empleo, en cualquier lugar. La opción segura si tienes dudas.",
    },
    modern: {
      description:
        "Un nombre grande en dos tonos, títulos que empiezan en color con una línea hasta el borde y los puestos en versalitas.",
      bestFor: "Tecnología, startups y equipos atentos al diseño.",
    },
    compact: {
      description:
        "El formato de una página que las escuelas de negocios envían a los bancos: tipografía estilo Times, títulos en mayúsculas bajo líneas finas, viñetas cuadradas y solo años.",
      bestFor: "Finanzas, consultoría y carreras largas que deben caber en una página.",
    },
    executive: {
      description:
        "Serifa estilo Palatino, tu nombre en color junto a tu titular, títulos en color sobre líneas claras y un espaciado amplio.",
      bestFor: "Puestos sénior, finanzas, derecho y consultoría.",
    },
    developer: {
      description:
        "La plantilla que comparten los ingenieros: serifa de estilo libro, títulos en versalitas sobre líneas completas y puestos en negrita sobre líneas de empresa en cursiva. Habilidades y proyectos primero.",
      bestFor: "Ingenieros de software y otros puestos técnicos.",
    },
    minimal: {
      description:
        "Solo negro: serifa estilo Charter, un nombre grande y sencillo, títulos en negrita sobre líneas finas y cada empleo en una sola línea.",
      bestFor: "Ingenieros y cualquiera que quiera una página tranquila y sencilla.",
    },
  },
  commonTitle: "Lo que todos los formatos tienen en común",
  common: {
    oneColumn: {
      title: "Una columna de texto real",
      text: "El texto se lee de arriba abajo en el orden correcto, con cada título en su propia línea. Cada formato se prueba leyendo de nuevo su PDF, en papel Carta y A4.",
    },
    unscrambled: {
      title: "Nada que desordene las palabras",
      text: "Sin íconos, sin líneas justificadas y sin espaciado ancho entre letras que se lea como “R E S U M E N”.",
    },
    sameWords: {
      title: "Las mismas palabras, cualquier estilo",
      text: "Cambia de formato cuando quieras. Tu currículum sigue igual; solo cambia la página a su alrededor.",
    },
    pdfFree: {
      title: "PDF gratis, Word con {pro}",
      text: "Descarga {freeFormats} en PDF gratis, todas las veces que quieras. Los otros {proCount} formatos y las descargas en Word (.docx) vienen con {pro}.",
    },
  },
  faq: {
    free: {
      question: "¿Estas plantillas de currículum son gratis?",
      answer:
        "{freeFormats} son gratis, sin muro de pago al descargar y sin necesidad de cuenta. Los otros {proCount} formatos vienen con {pro}. En {free}, un currículum con un formato de {pro} se descarga en {fallback}.",
    },
    ats: {
      question: "¿El software de selección podrá leerlas?",
      answer:
        "Cada una es una sola columna de texto real en orden de lectura, y cada PDF se prueba leyéndolo de nuevo. Cada empleador configura su sistema de selección de forma distinta, así que nadie puede prometer cómo tratará tu currículum un sistema concreto. Las <link>guías de ATS</link> muestran lo que se sabe que hacen los más comunes.",
    },
    pick: {
      question: "¿Cuál debería elegir?",
      answer:
        "{classic} sirve para cualquier empleo, en cualquier lugar: la opción segura si tienes dudas. {compact} deja una carrera larga en una página, y {developer} pone primero las habilidades y los proyectos. Cambia cuando quieras: tus palabras siguen iguales.",
    },
    own: {
      question: "¿Puedo usar mi propio currículum?",
      answer:
        "Sí. Sube un archivo PDF o Word en el estudio, o empieza de cero. “Usar este formato” aplica el formato al currículum que tienes abierto. Si no tienes ninguno abierto, el estudio te pide tu currículum con el formato ya elegido. Puedes probar un formato de {pro} en {free}; se descarga en {fallback} hasta que tengas {pro}.",
    },
  },
} satisfies Translation<Messages["resumeTemplates"]>;
