import type { ExampleWords } from "../../../examples";

export const dataScientist: ExampleWords<"data-scientist"> = {
  role: "Científico de datos",
  card: "Modelos ligados a un resultado de negocio, y cómo llegó cada uno a producción.",
  description:
    "Ejemplo de currículum de científico de datos: modelos de machine learning con su resultado de negocio y su paso a producción, y las habilidades clave.",
  intro:
    "Los currículums de ciencia de datos suelen leerse como listas de cursos: modelos, bibliotecas, métricas. Quien contrata quiere saber qué modelo llegó a producción y qué cambió. Este ejemplo liga cada modelo a un resultado que le importaría a alguien de fuera del equipo.",
  person:
    "Maya es inventada: una científica de datos con 4 años en seguros y fintech en Boston. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de científica de datos",
    basics: {
      headline: "Científica de datos",
      links: [{ label: "Portafolio" }],
    },
    summary:
      "Científica de datos con 4 años creando modelos de precios y de fraude en Python, desde el primer notebook hasta producción. Sabe explicar un modelo a las personas que tienen que confiar en él.",
    experience: [
      {
        title: "Científica de datos sénior",
        bullets: [
          "Creé en Python un modelo de fraude en siniestros con gradient boosting que marca 2 de 3 casos de fraude confirmados, frente a 1 de 3 con las reglas anteriores.",
          "Lancé el modelo como un servicio de FastAPI en AWS con monitoreo de drift, que puntúa 40,000 siniestros al día.",
          "Dirigí un experimento de precios en 6 regiones con un grupo de control, que mostró una ganancia de margen del 3% antes del lanzamiento completo.",
        ],
      },
      {
        title: "Científica de datos",
        bullets: [
          "Entrené un modelo de abandono con scikit-learn que permitió al equipo de soporte llamar a 500 clientes en riesgo al mes, y redujo un 11% el abandono en ese grupo.",
          "Creé un pipeline de variables en Spark y Airflow que bajó la preparación de los datos de entrenamiento de 2 días a 3 horas.",
          "Enseñé machine learning básico a 25 analistas en un curso interno de 6 semanas con ejercicios semanales.",
        ],
      },
    ],
    projects: [
      {
        name: "Pronóstico de retrasos del transporte público",
        tech: "PyTorch, Pandas",
        bullets: [
          "Pronostiqué retrasos de autobuses con datos abiertos de la ciudad y una red neuronal pequeña, y superé por un 14% una línea base estacional en un mes reservado.",
        ],
      },
    ],
    education: [
      { degree: "M.S.", field: "Estadística" },
      { degree: "B.S.", field: "Matemáticas" },
    ],
    skills: [
      { label: "Lenguajes", items: ["Python", "SQL", "R"] },
      {
        label: "Modelado",
        items: ["scikit-learn", "PyTorch", "Machine learning", "Estadística", "Pruebas A/B"],
      },
      { label: "Datos y despliegue", items: ["Spark", "Airflow", "AWS", "Docker", "MLOps"] },
    ],
  },
  lines: [
    {
      weak: "Creé modelos de machine learning con Python.",
      strong:
        "Creé en Python un modelo de fraude en siniestros con gradient boosting que marca 2 de 3 casos de fraude confirmados, frente a 1 de 3 con las reglas anteriores.",
    },
    {
      weak: "Desplegué modelos a producción.",
      strong:
        "Lancé el modelo como un servicio de FastAPI en AWS con monitoreo de drift, que puntúa 40,000 siniestros al día.",
    },
    {
      weak: "Trabajé con las partes interesadas en experimentos.",
      strong:
        "Dirigí un experimento de precios en 6 regiones con un grupo de control, que mostró una ganancia de margen del 3% antes del lanzamiento completo.",
    },
  ],
  skills: [{ label: "Código" }, { label: "Modelado" }, { label: "Datos y producción" }],
  tips: [
    {
      title: "Traduce la métrica",
      text: "Un AUC de 0.91 le dice poco a quien contrata fuera del equipo. “Marca 2 de cada 3 casos de fraude en lugar de 1 de cada 3” significa lo mismo y cualquiera lo entiende. Da las dos si quieres.",
    },
    {
      title: "Muestra el camino a producción",
      text: "Di cómo se servía el modelo, cada cuánto corre y cómo sabías que seguía funcionando. Eso es lo que separa a un científico de datos de un notebook.",
    },
    {
      title: "Nombra sin rodeos el trabajo con LLM",
      text: "Si has construido con modelos de lenguaje grandes, di qué hacía el sistema, cómo lo mediste y cuánto costaba. “Trabajé en IA generativa” no le dice nada a quien lee.",
    },
  ],
  mistakes: [
    {
      title: "Una lista de algoritmos",
      text: "Random forests, XGBoost, k-means y LSTM seguidos se leen como un temario. Menciona el método dentro de la línea donde resolvió un problema.",
    },
    {
      title: "Exactitud en un problema desbalanceado",
      text: "Un “98% de exactitud” en fraude es fácil si el fraude es el 1% de los casos, y quienes entrevistan lo saben. Usa la métrica que corresponde al problema y di por qué.",
    },
    {
      title: "Sin sentido de la escala",
      text: "Filas, usuarios, predicciones al día, dinero en juego. Sin ninguna de esas cifras, quien lee no puede distinguir un proyecto de clase de un sistema en producción.",
    },
  ],
  faq: [
    {
      question: "¿Un currículum de científico de datos debe incluir competencias de Kaggle?",
      answer:
        "Solo un buen puesto final, y solo si puedes hablar de él. El trabajo en tus empleos y un proyecto bien explicado suelen contar más.",
    },
    {
      question: "¿Necesito una maestría en mi currículum?",
      answer:
        "Pon tu título más alto y el área. Muchos equipos contratan sin maestría si el trabajo muestra las habilidades; la sección de experiencia es donde lo demuestras.",
    },
    {
      question: "¿Qué tan técnico debe ser un currículum de científico de datos?",
      answer:
        "Lo bastante técnico para quien te entrevista y lo bastante claro para el reclutador que lo lee primero. Nombra el método y las herramientas, y termina la línea con el resultado de negocio.",
    },
  ],
};
