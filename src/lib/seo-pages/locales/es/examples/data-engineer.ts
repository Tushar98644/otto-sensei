import type { ExampleWords } from "../../../examples";

export const dataEngineer: ExampleWords<"data-engineer"> = {
  role: "Ingeniero de datos",
  card: "Pipelines con su volumen, frescura, fallas y costo en cada línea.",
  description:
    "Ejemplo de currículum de ingeniero de datos: líneas de Spark, Airflow y SQL con volumen, frescura y costo, habilidades que piden las ofertas y errores.",
  intro:
    "El trabajo de un ingeniero de datos se ve en tablas en las que otras personas confían. El currículum tiene que decir cuántos datos se movieron, qué tan frescos llegaron, cada cuánto fallaron y cuánto costó operarlo. Este ejemplo pone una de esas cifras en cada línea.",
  person:
    "Marcus es inventado: un ingeniero de datos con 5 años en analítica para banca y comercio minorista, con base en Charlotte, Carolina del Norte. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de ingeniero de datos",
    basics: {
      headline: "Ingeniero de datos",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Ingeniero de datos con 5 años creando pipelines batch y de streaming con Python, SQL y Spark. Se enfoca en tablas que llegan a tiempo, pasan sus controles y cuestan menos de operar cada trimestre.",
    experience: [
      {
        title: "Ingeniero de datos",
        bullets: [
          "Rehíce 40 pipelines nocturnos de Airflow en Spark y Snowflake, bajando la ejecución de 6 horas a 70 minutos, y los informes de finanzas llegan antes de las 7:00 cada mañana.",
          "Pasé los eventos de transacciones con tarjeta de cargas batch por hora a flujos de Kafka, y los tableros de fraude pasaron de 60 minutos de retraso a menos de 2.",
          "Sumé pruebas de dbt a 220 modelos, que detectan unas 35 cargas rotas por trimestre antes de que los analistas abran un informe.",
          "Reduje un 31% la factura de Snowflake con clustering en las 5 tablas más grandes y suspendiendo los warehouses inactivos tras 5 minutos.",
        ],
      },
      {
        title: "Desarrollador ETL",
        bullets: [
          "Escribí procesos ETL en Python que cargaban cada noche las ventas de 180 tiendas en Redshift y reemplazaron 12 exportaciones manuales de hojas de cálculo.",
          "Diseñé un esquema en estrella de pedidos y devoluciones que consultan 30 analistas en Tableau, reduciendo el tiempo de carga de los tableros de 40 a 6 segundos.",
          "Configuré alertas para cargas tardías y vacías, y bajé los informes matutinos fallidos de 9 al mes a 1.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ciencias de la Computación" }],
    skills: [
      { label: "Lenguajes", items: ["Python", "SQL", "Scala"] },
      { label: "Pipelines", items: ["Spark", "Airflow", "dbt", "Kafka"] },
      { label: "Almacenes de datos y nube", items: ["Snowflake", "Redshift", "PostgreSQL", "AWS"] },
    ],
    certifications: [{ name: "Databricks Certified Data Engineer Associate" }],
  },
  lines: [
    {
      weak: "Trabajé en pipelines de datos para el equipo de finanzas.",
      strong:
        "Rehíce 40 pipelines nocturnos de Airflow en Spark y Snowflake, bajando la ejecución de 6 horas a 70 minutos, y los informes de finanzas llegan antes de las 7:00 cada mañana.",
    },
    {
      weak: "Responsable de la calidad de los datos en todo el almacén de datos.",
      strong:
        "Sumé pruebas de dbt a 220 modelos, que detectan unas 35 cargas rotas por trimestre antes de que los analistas abran un informe.",
    },
    {
      weak: "Ayudé a pasar los informes a streaming en tiempo real.",
      strong:
        "Pasé los eventos de transacciones con tarjeta de cargas batch por hora a flujos de Kafka, y los tableros de fraude pasaron de 60 minutos de retraso a menos de 2.",
    },
  ],
  skills: [
    { label: "Lenguajes y procesamiento" },
    { label: "Pipelines y modelado" },
    { label: "Almacenes de datos y nube" },
  ],
  tips: [
    {
      title: "Dale a cada pipeline un tamaño y un reloj",
      text: "Filas al día, terabytes al mes, cuánto tarda una ejecución y cuándo llegan los datos. Quien lee no puede juzgar un pipeline sin su tamaño y su plazo, así que pon los dos en la línea.",
    },
    {
      title: "Nombra a quién lee tus tablas",
      text: "Informes de finanzas, tableros de fraude, un modelo de precios: decir quién usa los datos muestra por qué importaba el pipeline, y le da a quien te entrevista una buena primera pregunta.",
    },
    {
      title: "Cuenta las fallas que evitaste",
      text: "Cargas tardías, ejecuciones fallidas, datos rotos que las pruebas detectaron antes de que alguien los viera. Los equipos de datos siguen estas cifras, así que un antes y un después dice más que “mejoré la calidad de los datos”.",
    },
  ],
  mistakes: [
    {
      title: "Un stack sin datos",
      text: "Spark, Airflow, Kafka, Snowflake y dbt en una línea podrían describir a cualquier ingeniero de datos. Pon cada herramienta junto al trabajo que hizo y la cifra que movió.",
    },
    {
      title: "“Big data” sin tamaño",
      text: "Dos terabytes al día y 80 gigabytes a la semana son trabajos reales, y muy distintos. Escribe el volumen que manejaste en lugar de la etiqueta.",
    },
    {
      title: "Solo el camino feliz",
      text: "En las entrevistas preguntan por la noche en que falló un pipeline. Una línea sobre backfills, datos que llegaron tarde o un cambio de esquema que absorbiste muestra que has operado pipelines en producción, no solo que los escribiste.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de ingeniero de datos?",
      answer:
        "Los pipelines que creaste, las herramientas sobre las que corrían y cifras de volumen, tiempo de ejecución, frescura, fallas o costo. Agrega los equipos que usaban los datos, una lista corta de habilidades y una certificación si la tienes.",
    },
    {
      question: "¿Un currículum de ingeniero de datos es distinto del de un analista de datos?",
      answer:
        "Sí. Las líneas de un analista terminan con una decisión que alguien tomó a partir de las cifras; las de un ingeniero terminan con datos que llegaron más rápido, más limpios o más baratos. Si pasas del análisis a la ingeniería, empieza con los pipelines que creaste para tus propios informes.",
    },
    {
      question: "¿Necesito una certificación de nube como ingeniero de datos?",
      answer:
        "Ayuda cuando una oferta la nombra, pero las líneas que muestran que operaste pipelines en esa nube cuentan más. Una certificación vigente de la plataforma que más usas es suficiente.",
    },
  ],
};
