import type { Messages } from "..";
import type { Translation } from "../../types";

// Header, footer, navigation, the language hint and the 404 page, in Spanish.
export default {
  nav: {
    label: "Principal",
    howItWorks: "Cómo funciona",
    jobs: "Empleos",
    pricing: "Precios",
    signIn: "Ingresar",
    dashboard: "Panel",
    menu: "Menú",
  },
  checkMyResume: "Revisar mi CV",
  footer: {
    label: "Pie de página",
    tagline: "Hecho para quienes buscan empleo en todo el mundo.",
    groups: {
      product: "Producto",
      guides: "Guías",
      legal: "Legal",
    },
    links: {
      resumeBuilder: "Creador de currículum",
      jobMatch: "Verificación de compatibilidad",
      coverLetters: "Cartas de presentación",
      applicationTracker: "Seguimiento de postulaciones",
      interviewPrep: "Preparación para entrevistas",
      portfolioWebsite: "Sitio de portafolio",
      pricing: "Precios",
      resumeExamples: "Ejemplos de currículum",
      resumeTemplates: "Plantillas de currículum",
      atsGuides: "Guías de ATS",
      comparisons: "Comparativas",
      privacy: "Privacidad",
      terms: "Términos",
      refunds: "Reembolsos",
      acceptableUse: "Uso aceptable",
    },
    payments: "Pagos con {merchant}",
    language: "Idioma",
  },
  languageHint: {
    text: "Esta página también está en español.",
    link: "Leer en español",
    dismiss: "Cerrar",
  },
  notFound: {
    title: "Página no encontrada",
    otto: "Otto, la nutria, con cara de preocupación",
    text: "Busqué por todas partes, pero esta página no está aquí. Puede que el enlace sea antiguo o esté mal escrito.",
    home: "Ir a la página de inicio",
  },
} satisfies Translation<Messages["site"]>;
