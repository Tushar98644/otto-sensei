import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  results: {
    textReadable: {
      title: "El texto se puede leer",
      detail: "El software de selección puede sacar el texto de este archivo.",
    },
    textMissing: {
      title: "No hay texto legible",
      detail:
        "El software de selección no puede leer ningún texto en este archivo. Seguramente es un escaneo o una imagen.",
    },
    emailNotChecked: {
      title: "Correo sin revisar",
      detail: "No hay texto legible, así que no pudimos buscar un correo electrónico.",
    },
    emailFound: {
      title: "Correo encontrado",
      detail: "Encontramos {email}, así que los reclutadores pueden contactarte.",
    },
    emailMissing: {
      title: "No hay correo electrónico",
      detail:
        "No encontramos un correo en el texto principal. Sin él, los reclutadores no pueden contactarte.",
    },
    phoneNotChecked: {
      title: "Teléfono sin revisar",
      detail: "No hay texto legible, así que no pudimos buscar un número de teléfono.",
    },
    phoneFound: { title: "Teléfono encontrado", detail: "Encontramos {phone}." },
    phoneMissing: {
      title: "No hay teléfono",
      detail:
        "No encontramos un número de teléfono. Muchos reclutadores llaman o escriben antes de mandar un correo.",
    },
    headerPdf: {
      title: "Nada escondido en encabezados",
      detail:
        "En un PDF, el encabezado es parte de la página, así que el software de selección lo lee.",
    },
    headerClear: {
      title: "Nada escondido en encabezados",
      detail: "Ninguno de tus datos de contacto está escondido en un encabezado o pie de página.",
    },
    headerEmail: {
      title: "Datos de contacto en el encabezado",
      detail:
        "Tu correo solo está en el encabezado o el pie de página. Muchos sistemas se los saltan, así que nunca lo ven.",
    },
    headerPhone: {
      title: "Datos de contacto en el encabezado",
      detail:
        "Tu teléfono solo está en el encabezado o el pie de página. Muchos sistemas se los saltan, así que nunca lo ven.",
    },
    headerBoth: {
      title: "Datos de contacto en el encabezado",
      detail:
        "Tu correo y tu teléfono solo están en el encabezado o el pie de página. Muchos sistemas se los saltan, así que nunca los ven.",
    },
    sectionsNotChecked: {
      title: "Secciones sin revisar",
      detail: "No hay texto legible, así que no pudimos revisar los títulos de tus secciones.",
    },
    sectionsProjectsOnly: {
      title: "No hay sección de experiencia laboral",
      detail:
        "Encontramos Proyectos pero no un título de Experiencia. Está bien al principio, pero los trabajos van en Experiencia.",
    },
    sectionsNoWork: {
      title: "No hay sección de experiencia laboral",
      detail:
        "No encontramos un título como “Experiencia” o “Experiencia laboral”. Sin él, muchos sistemas no distinguen tus trabajos.",
    },
    sectionsNoSkillsOrEducation: {
      title: "No hay sección de Habilidades ni de Educación",
      detail:
        "No encontramos títulos de Habilidades ni de Educación. Muchos sistemas usan los dos para emparejarte con empleos.",
    },
    sectionsNoSkills: {
      title: "No hay sección de Habilidades",
      detail:
        "No encontramos un título de Habilidades. Muchos sistemas lo usan para emparejarte con empleos.",
    },
    sectionsNoEducation: {
      title: "No hay sección de Educación",
      detail:
        "No encontramos un título de Educación. Muchos sistemas esperan uno, aunque sea corto.",
    },
    sectionsFound: { title: "Títulos de sección claros", detail: "Encontramos {sections}." },
    layoutNotChecked: {
      title: "Diseño sin revisar",
      detail: "No hay texto legible, así que no pudimos revisar el diseño.",
    },
    singleColumn: {
      title: "Una sola columna",
      detail: "Tu texto se lee de arriba abajo en una columna.",
    },
    columnsPdf: {
      title: "Diseño a dos columnas",
      detail:
        "Tu página tiene columnas lado a lado. Algunos sistemas leen de corrido y las mezclan.",
    },
    columnsDocument: {
      title: "Diseño a dos columnas",
      detail:
        "Tu documento está armado en columnas. Algunos sistemas leen de corrido y las mezclan.",
    },
    tablesPdf: {
      title: "Sin problemas de tablas",
      detail:
        "Las tablas solo confunden al software de selección en archivos de Word. En un PDF son texto normal, y la revisión del diseño ya las cubre.",
    },
    tablesNone: {
      title: "Sin tablas",
      detail: "Tu texto no está dentro de tablas, que algunos sistemas leen mal.",
    },
    tablesFound: {
      title: "Hay tablas",
      detail: {
        one: "Tu archivo tiene {count} tabla. Algunos sistemas leen las celdas en desorden o se las saltan.",
        other:
          "Tu archivo tiene {count} tablas. Algunos sistemas leen las celdas en desorden o se las saltan.",
      },
    },
    textBoxesPdf: {
      title: "Sin problemas de cuadros de texto",
      detail:
        "En un PDF, los cuadros de texto se vuelven texto normal que el software de selección puede leer.",
    },
    textBoxesNone: {
      title: "Sin cuadros de texto",
      detail: "Todo tu texto está en la página principal.",
    },
    textBoxesFound: {
      title: "Hay cuadros de texto",
      detail: {
        one: "Tu archivo tiene {count} cuadro de texto. Muchos sistemas se saltan los cuadros de texto por completo, así que ese texto puede quedar sin leer.",
        other:
          "Tu archivo tiene {count} cuadros de texto. Muchos sistemas se saltan los cuadros de texto por completo, así que ese texto puede quedar sin leer.",
      },
    },
    imagesNone: { title: "Sin imágenes", detail: "Nada importante está escondido en una imagen." },
    imagePages: {
      title: "Las páginas son imágenes",
      detail: "Tus páginas son imágenes. El software de selección no puede ver lo que hay en ellas.",
    },
    imagesFound: {
      title: "Hay imágenes",
      detail: {
        one: "Encontramos {count} imagen. Logos, fotos y barras de habilidades son invisibles para el software de selección.",
        other:
          "Encontramos {count} imágenes. Logos, fotos y barras de habilidades son invisibles para el software de selección.",
      },
    },
    iconsNotChecked: {
      title: "Íconos sin revisar",
      detail: "No hay texto legible, así que no pudimos buscar caracteres de íconos.",
    },
    iconsNone: {
      title: "Sin caracteres de íconos",
      detail: "No hay símbolos que se vean como texto basura.",
    },
    iconsFound: {
      title: "Hay caracteres de íconos",
      detail: {
        one: "Encontramos {count} carácter de ícono, como símbolos de teléfono o correo. Muchos sistemas los muestran como cuadros o basura.",
        other:
          "Encontramos {count} caracteres de íconos, como símbolos de teléfono o correo. Muchos sistemas los muestran como cuadros o basura.",
      },
    },
    datesNotChecked: {
      title: "Fechas sin revisar",
      detail: "No hay texto legible, así que no pudimos revisar tus fechas.",
    },
    datesNone: {
      title: "No encontramos fechas",
      detail:
        "No encontramos fechas para tus trabajos. Muchos sistemas las usan para calcular tus años de experiencia.",
    },
    datesFound: {
      title: "Hay fechas",
      detail:
        "Encontramos fechas como “{sample}”, así que los sistemas pueden calcular tu experiencia.",
    },
    datesMixed: {
      title: "Formatos de fecha mezclados",
      detail:
        "Tus fechas mezclan estilos, como “{main}” y “{other}”. Algunos sistemas leen mal los formatos mezclados al sumar tu experiencia.",
    },
    datesConsistent: {
      title: "Fechas consistentes",
      detail: "Todas las fechas de tus trabajos usan un solo estilo, como “{sample}”.",
    },
    lengthNotChecked: {
      title: "Largo sin revisar",
      detail: "No hay texto legible, así que no pudimos revisar el largo.",
    },
    lengthShort: {
      title: "Muy poco texto",
      detail: {
        one: "Solo encontramos {count} palabra. Eso le da al software de selección poco para comparar con un empleo.",
        other:
          "Solo encontramos {count} palabras. Eso le da al software de selección poco para comparar con un empleo.",
      },
    },
    lengthLong: {
      title: "Más de dos páginas",
      detail: {
        one: "Tu currículum tiene {count} página. Los reclutadores leen por encima, y muchos esperan una o dos.",
        other:
          "Tu currículum tiene {count} páginas. Los reclutadores leen por encima, y muchos esperan una o dos.",
      },
    },
    lengthGood: {
      title: "Buen largo",
      detail:
        "{pages} y {words}: suficiente para coincidir con empleos, corto para leer por encima.",
    },
    bulletsNotChecked: {
      title: "Viñetas sin revisar",
      detail: "No hay texto legible, así que no pudimos revisar tus viñetas.",
    },
    bulletsParagraphs: {
      title: "Párrafos largos en tus trabajos",
      detail:
        "Los detalles de tus trabajos están en párrafos largos. Las viñetas cortas son más fáciles de leer y de emparejar.",
    },
    bulletsGood: {
      title: "Fácil de leer por encima",
      detail: "Sin párrafos largos, así que tus trabajos se revisan rápido.",
    },
  },
  fixes: {
    scan: "Sube un PDF exportado desde Word o Google Docs, no un escaneo ni una foto.",
    moveEmail: "Saca tu correo del encabezado y ponlo en el texto principal.",
    addEmail: "Agrega tu correo como texto normal cerca de la parte de arriba.",
    movePhone: "Saca tu teléfono del encabezado y ponlo en el texto principal.",
    addPhone: "Agrega tu teléfono junto a tu correo.",
    moveContact: "Pon tus datos de contacto en el cuerpo de la página.",
    addExperience:
      "Si tuviste trabajos o prácticas, ponlos bajo un título de “Experiencia”.",
    nameExperience: "Pon tus trabajos bajo un título claro, como “Experiencia”.",
    addSkillsAndEducation: "Agrega secciones cortas de “Habilidades” y “Educación”.",
    addSkills: "Agrega una sección de “Habilidades” con las herramientas que usas.",
    addEducation: "Agrega una sección de “Educación”, aunque sea de una línea.",
    oneColumn: "Cambia a un diseño de una sola columna.",
    noTables: "Cambia las tablas por líneas de texto normal.",
    noTextBoxes: "Saca el texto de los cuadros de texto y ponlo en la página principal.",
    noImages: "Quita las imágenes, o repite lo importante como texto normal.",
    noIcons: "Cambia los íconos por palabras como “Correo” y “Teléfono”.",
    addDates: "Agrega fechas de inicio y fin a cada trabajo, como “ene 2021 - mar 2023”.",
    oneDateStyle: "Escribe todas las fechas igual, como “{main}”.",
    addLines: "Agrega algunas viñetas sobre lo que hiciste en cada puesto.",
    trim: "Recorta los puestos más antiguos o menos relevantes para que quepa en dos páginas.",
    bullets: "Divide cada trabajo en 3 a 5 viñetas cortas que empiecen con un verbo.",
  },
  units: {
    pages: { one: "{count} página", other: "{count} páginas" },
    words: { one: "{count} palabra", other: "{count} palabras" },
  },
  sections: {
    summary: "Resumen",
    experience: "Experiencia",
    projects: "Proyectos",
    education: "Educación",
    skills: "Habilidades",
    certifications: "Certificaciones",
  },
} satisfies Translation<Messages["fileChecks"]>;
