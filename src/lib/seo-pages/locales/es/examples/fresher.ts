import type { ExampleWords } from "../../../examples";

export const fresher: ExampleWords<"fresher"> = {
  role: "Recién egresado",
  card: "Un egresado de ciencias de la computación con una pasantía y dos proyectos, en una página.",
  description:
    "Ejemplo de currículum de una página para recién egresados, con proyectos, pasantías y GPA bien presentados, qué habilidades poner y errores que evitar.",
  intro:
    "Sin un empleo de tiempo completo todavía, un currículum de recién egresado se apoya en proyectos, pasantías, notas y pruebas de que terminas lo que empiezas. Este ejemplo es de un egresado de ciencias de la computación que postula a puestos de ingeniero trainee y asociado, y la misma estructura sirve para cualquier egresado.",
  person:
    "Noah es inventado: un egresado de ciencias de la computación de 2026 en Raleigh, con una pasantía y dos proyectos. Los nombres, las universidades, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de recién egresado",
    basics: {
      headline: "Egresado de Ciencias de la Computación",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Egresado de Ciencias de la Computación (2026) en busca de un puesto de ingeniero de software trainee o asociado. Creó y lanzó dos proyectos full-stack y pasó un verano corrigiendo errores reales en una startup.",
    education: [
      {
        degree: "B.S.",
        field: "Ciencias de la Computación",
        bullets: ["GPA 3.7/4.0. Proyecto final: rastreador de autobuses del campus (abajo)."],
      },
      {
        degree: "Diploma de secundaria",
        field: "",
        bullets: ["GPA 3.9/4.0"],
      },
    ],
    experience: [
      {
        title: "Pasante de ingeniería de software",
        bullets: [
          "Corregí 14 errores en el tablero de React, entre ellos uno de fechas que mostraba días de entrega equivocados a 3,000 usuarios.",
          "Escribí 40 pruebas unitarias en Jest para el formulario de reservas, y subí su cobertura del 20% al 75%.",
        ],
      },
    ],
    projects: [
      {
        name: "Rastreador de autobuses del campus",
        tech: "React, Node.js, MongoDB",
        bullets: [
          "Creé con un equipo de 3 un rastreador en vivo para 6 autobuses del campus, que hoy usan unos 900 estudiantes cada mañana.",
          "Reduje el intervalo de actualización del mapa de 30 a 5 segundos enviando puntos GPS por WebSockets en lugar de hacer consultas periódicas.",
        ],
      },
      {
        name: "Divisor de gastos",
        tech: "Python, Django, PostgreSQL",
        bullets: [
          "Desarrollé una app web para dividir gastos de la residencia y de viajes, con enlaces de pago de Venmo, que usan 120 amigos y compañeros de clase.",
        ],
      },
    ],
    skills: [
      { label: "Lenguajes", items: ["Java", "Python", "JavaScript", "SQL"] },
      { label: "Web", items: ["React", "Node.js", "Django", "HTML", "CSS"] },
      { label: "Herramientas", items: ["Git", "Linux", "MongoDB", "PostgreSQL"] },
    ],
    certifications: [{ name: "freeCodeCamp: JavaScript Algorithms and Data Structures" }],
  },
  lines: [
    {
      weak: "Hice un proyecto sobre rastreo de autobuses.",
      strong:
        "Creé con un equipo de 3 un rastreador en vivo para 6 autobuses del campus, que hoy usan unos 900 estudiantes cada mañana.",
    },
    {
      weak: "Recién egresado proactivo y apasionado por aprender.",
      strong:
        "Corregí 14 errores en el tablero de React, entre ellos uno de fechas que mostraba días de entrega equivocados a 3,000 usuarios.",
    },
    {
      weak: "Aprendí React y Node.js durante la pasantía.",
      strong:
        "Escribí 40 pruebas unitarias en Jest para el formulario de reservas, y subí su cobertura del 20% al 75%.",
    },
  ],
  skills: [{ label: "Lenguajes" }, { label: "Web" }, { label: "Herramientas" }],
  tips: [
    {
      title: "La educación va primero",
      text: "Hasta que tengas un empleo de tiempo completo, tu título, tu universidad y tu GPA son los datos más fuertes que tienes. Pon Educación arriba de Experiencia, y conserva tus notas de secundaria mientras las ofertas para egresados las sigan pidiendo.",
    },
    {
      title: "Trata los proyectos como empleos",
      text: "Cada proyecto lleva el mismo tipo de línea que un empleo: qué construiste, quién lo usó y una cifra. Un proyecto con 10 usuarios reales le gana a una copia de un tutorial que nadie usa.",
    },
    {
      title: "Una página, sin excepciones",
      text: "Los reclutadores de las jornadas de reclutamiento universitario y de las contrataciones masivas leen cientos de currículums de recién egresados. Limítate a una página; Compact acomoda más contenido sin achicar el texto.",
    },
  ],
  mistakes: [
    {
      title: "Un objetivo lleno de adjetivos",
      text: "“Recién egresado proactivo y apasionado por aprender” aparece en miles de currículums. La revisión de líneas de Otto marca frases hechas como “proactivo”. Di el puesto que buscas y una cosa que hayas construido.",
    },
    {
      title: "Datos personales y una declaración",
      text: "El nombre de tu padre, la fecha de nacimiento, una foto y “Por la presente declaro que la información anterior es verdadera” vienen de plantillas viejas. Los empleadores no los necesitan, y le quitan espacio a tus proyectos.",
    },
    {
      title: "Poner materias como habilidades",
      text: "“Sistemas Operativos, DBMS, Redes de Computadoras” son materias, no habilidades. Enumera los lenguajes y las herramientas que usaste en un proyecto o una pasantía.",
    },
  ],
  faq: [
    {
      question: "¿Cuál es el mejor formato de currículum para recién egresados?",
      answer:
        "Una página, una columna, con Educación primero, y luego pasantías, proyectos, habilidades y certificaciones. Classic y Compact funcionan bien y se descargan gratis en PDF.",
    },
    {
      question: "¿Un recién egresado debe poner su CGPA en el currículum?",
      answer:
        "Sí, si te ayuda. Muchas ofertas universitarias y de trainee fijan un promedio mínimo, así que omitirlo puede parecer que lo escondes. Escríbelo como lo hace tu universidad, por ejemplo 3.7/4.0 u 8.4/10.",
    },
    {
      question: "¿Puedo hacer un currículum de recién egresado sin pasantía?",
      answer:
        "Sí. Empieza con dos o tres proyectos escritos como empleos, agrega hackatones, clubes universitarios o trabajo freelance con cifras, y deja Educación arriba.",
    },
  ],
};
