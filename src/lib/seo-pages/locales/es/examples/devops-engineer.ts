import type { ExampleWords } from "../../../examples";

export const devopsEngineer: ExampleWords<"devops-engineer"> = {
  role: "Ingeniero DevOps",
  card: "Despliegues, tiempo de recuperación y costo de nube: las cifras con las que viven los equipos de guardia.",
  description:
    "Ejemplo de currículum de ingeniero DevOps: Kubernetes, Terraform y CI/CD con ritmo de despliegue, disponibilidad y costo de nube, habilidades y errores.",
  intro:
    "A DevOps se le juzga por lo que deja de pasar: despliegues fallidos, caídas largas, facturas de nube inesperadas. Un currículum tiene que convertir esa calma en cifras, como cada cuánto publican los equipos, qué tan rápido se recuperan y cuánto cuesta la plataforma. Este ejemplo muestra cada una.",
  person:
    "Sofia es inventada: una ingeniera DevOps con 5 años en software de salud y comercio en línea, con base en Salt Lake City, Utah. Los nombres, las empresas y las cifras son inventados.",
  resume: {
    title: "Currículum de ingeniera DevOps",
    basics: {
      headline: "Ingeniera DevOps",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Ingeniera DevOps con 5 años operando plataformas de AWS y Kubernetes para equipos de producto. Crea pipelines e infraestructura como código para que los equipos publiquen a diario y se recuperen de los incidentes en minutos.",
    experience: [
      {
        title: "Ingeniera DevOps",
        bullets: [
          "Migré 45 servicios de servidores EC2 armados a mano a Kubernetes con Helm, y los despliegues pasaron de 3 por semana a 20 por día.",
          "Escribí módulos de Terraform para redes, bases de datos y clústeres que hoy usan 9 equipos de producto, reduciendo la creación de un entorno nuevo de 2 semanas a 1 día.",
          "Configuré alertas de Prometheus y Grafana ligadas a objetivos de nivel de servicio, bajando el tiempo medio de recuperación de 75 a 18 minutos.",
          "Reduje la factura de AWS en USD 38,000 al mes moviendo los procesos batch a instancias spot y eliminando 600 volúmenes sin uso.",
        ],
      },
      {
        title: "Ingeniera de nube",
        bullets: [
          "Creé un pipeline de GitHub Actions con pruebas automatizadas y reversiones en un clic, y bajé las versiones fallidas de 1 de cada 8 a 1 de cada 40.",
          "Escribí playbooks de Ansible que parcharon 300 servidores Linux en una noche en lugar de en 2 fines de semana.",
          "Dirigí 4 simulacros de recuperación ante desastres al año, y bajé el tiempo de restauración de la base de datos de 6 horas a 45 minutos.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ingeniería en Computación" }],
    skills: [
      { label: "Nube", items: ["AWS", "Terraform", "Kubernetes", "Helm", "Docker"] },
      {
        label: "Entrega y monitoreo",
        items: ["GitHub Actions", "Jenkins", "Prometheus", "Grafana", "Datadog"],
      },
      { label: "Scripts", items: ["Python", "Bash", "Go", "Linux"] },
    ],
    certifications: [{ name: "Certified Kubernetes Administrator (CKA)" }],
  },
  lines: [
    {
      weak: "Estuve involucrada en la migración de servicios a Kubernetes.",
      strong:
        "Migré 45 servicios de servidores EC2 armados a mano a Kubernetes con Helm, y los despliegues pasaron de 3 por semana a 20 por día.",
    },
    {
      weak: "Manejé el monitoreo y las guardias de producción.",
      strong:
        "Configuré alertas de Prometheus y Grafana ligadas a objetivos de nivel de servicio, bajando el tiempo medio de recuperación de 75 a 18 minutos.",
    },
    {
      weak: "Responsable del pipeline de versiones.",
      strong:
        "Creé un pipeline de GitHub Actions con pruebas automatizadas y reversiones en un clic, y bajé las versiones fallidas de 1 de cada 8 a 1 de cada 40.",
    },
  ],
  skills: [
    { label: "Nube e infraestructura" },
    { label: "Contenedores y entrega" },
    { label: "Monitoreo y scripts" },
  ],
  tips: [
    {
      title: "Usa las cuatro cifras de entrega",
      text: "Cada cuánto despliegas, cuánto tarda un cambio en llegar a producción, cuántas versiones fallan y qué tan rápido te recuperas. Los líderes de ingeniería siguen estas cifras, así que una de ellas en una línea muestra que dominas el tema.",
    },
    {
      title: "Cuenta los equipos que desbloqueaste",
      text: "El trabajo de plataforma se hace para otros ingenieros. Di cuántos equipos o servicios usan lo que creaste, y cuánta espera les quitaste de la semana.",
    },
    {
      title: "Pon en dólares el ahorro en la nube",
      text: "Un ahorro mensual o anual en dólares es una línea que leen tanto finanzas como ingeniería. Nombra lo que cambiaste para lograrlo, como instancias spot, ajuste de tamaño o niveles de almacenamiento.",
    },
  ],
  mistakes: [
    {
      title: "Un muro de insignias de certificación",
      text: "Seis insignias de nube encima de tu trabajo empujan las pruebas hacia abajo en la página. Conserva una o dos que pida la oferta y deja que tus líneas muestren el resto.",
    },
    {
      title: "Ningún incidente a la vista",
      text: "Casi todas las entrevistas de DevOps preguntan por una caída. Una línea sobre el tiempo de recuperación, una corrección tras un postmortem o un simulacro que dirigiste muestra que has estado de guardia, no solo que escribiste YAML.",
    },
    {
      title: "La herramienta cambió, pero ¿qué mejoró?",
      text: "“Implementé Kubernetes” dice qué instalaste, no qué mejoró. Agrega la cantidad de despliegues, el tiempo de recuperación o el costo de antes y después.",
    },
  ],
  faq: [
    {
      question: "¿Qué debe incluir un currículum de ingeniero DevOps?",
      answer:
        "Las nubes y herramientas que operas, las plataformas que creaste y cifras de frecuencia de despliegue, disponibilidad, tiempo de recuperación o costo. Agrega los equipos que dependían de tu trabajo y una o dos certificaciones vigentes.",
    },
    {
      question:
        "¿Un ingeniero DevOps es lo mismo que un ingeniero de confiabilidad de sitios (SRE)?",
      answer:
        "El trabajo se superpone mucho, y al buscarte empleos, Otto trata los dos títulos como el mismo tipo de empleo. Usa en tu titular el título de la oferta, y empieza con líneas de disponibilidad y recuperación para puestos de SRE, y con líneas de entrega para puestos de DevOps.",
    },
    {
      question: "¿Cómo paso de la administración de sistemas a DevOps?",
      answer:
        "Muestra la automatización en tu empleo actual: scripts que reemplazaron pasos manuales, servidores que parchaste con Ansible, un pipeline que configuraste. Esas líneas se leen como trabajo de DevOps, sin importar cuál era tu título.",
    },
  ],
};
