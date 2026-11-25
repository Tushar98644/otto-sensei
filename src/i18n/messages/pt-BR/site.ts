import type { Messages } from "..";
import type { Translation } from "../../types";

// Header, footer, navigation, the language hint and the 404 page, in Brazilian Portuguese.
export default {
  nav: {
    label: "Principal",
    howItWorks: "Como funciona",
    jobs: "Vagas",
    pricing: "Preços",
    signIn: "Entrar",
    dashboard: "Painel",
    menu: "Menu",
  },
  checkMyResume: "Revisar meu currículo",
  footer: {
    label: "Rodapé",
    tagline: "Feito para quem busca emprego, em qualquer lugar.",
    groups: {
      product: "Produto",
      guides: "Guias",
      legal: "Jurídico",
    },
    links: {
      resumeBuilder: "Criador de currículo",
      jobMatch: "Verificação de compatibilidade",
      coverLetters: "Cartas de apresentação",
      applicationTracker: "Controle de candidaturas",
      interviewPrep: "Preparação para entrevistas",
      portfolioWebsite: "Site de portfólio",
      pricing: "Preços",
      resumeExamples: "Exemplos de currículo",
      resumeTemplates: "Modelos de currículo",
      atsGuides: "Guias de ATS",
      comparisons: "Comparativos",
      privacy: "Privacidade",
      terms: "Termos",
      refunds: "Reembolsos",
      acceptableUse: "Uso aceitável",
    },
    payments: "Pagamentos via {merchant}",
    language: "Idioma",
  },
  languageHint: {
    text: "Esta página também está em português.",
    link: "Ler em português",
    dismiss: "Fechar",
  },
  notFound: {
    title: "Página não encontrada",
    otto: "Otto, a lontra, com cara de preocupação",
    text: "Procurei em todo lugar, mas esta página não está aqui. O link pode estar desatualizado ou com erro de digitação.",
    home: "Ir para a página inicial",
  },
} satisfies Translation<Messages["site"]>;
