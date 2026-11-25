import type { ContentLang } from "@/lib/i18n/languages";

// The words Otto adds around a letter or message, in the language it's written in.
export type LetterWords = {
  dear: (company: string) => string;
  regards: string;
  // German closings take no comma: "Mit freundlichen Grüßen".
  closingComma: boolean;
  hi: (name: string) => string;
  formal: (name: string) => string;
  best: string;
  firstName: string;
  companyTeam: (company: string) => string;
  noteGreeting: (name: string) => string;
  openRole: string;
  roleAt: (role: string, company: string) => string;
  subjectLead: { first: string; follow_up: string; thank_you: string };
  theRole: (title: string) => string;
  yourRole: string;
  at: (company: string) => string;
  thanks: (role: string, at: string) => string;
  applied: (role: string, at: string) => string;
  applying: (role: string, at: string) => string;
};

const LETTER_WORDS: Record<ContentLang, LetterWords> = {
  en: {
    dear: (company) => (company ? `Dear ${company} team,` : "Dear hiring team,"),
    regards: "Best regards",
    closingComma: true,
    hi: (name) => `Hi ${name},`,
    formal: (name) => `Dear ${name},`,
    best: "Best",
    firstName: "[first name]",
    companyTeam: (company) => `${company} team`,
    noteGreeting: (name) => `Hi ${name}, `,
    openRole: "The open role",
    roleAt: (role, company) => `${role} at ${company}`,
    subjectLead: { first: "", follow_up: "Following up: ", thank_you: "Thank you: " },
    theRole: (title) => `the ${title} role`,
    yourRole: "your open role",
    at: (company) => ` at ${company}`,
    thanks: (role, at) => `Thank you for the conversation about ${role}${at}.`,
    applied: (role, at) => `I applied for ${role}${at} and would be glad to connect.`,
    applying: (role, at) => `I am applying for ${role}${at} and would be glad to connect.`,
  },
  es: {
    dear: (company) =>
      company ? `Estimado equipo de ${company}:` : "Estimado equipo de selección:",
    regards: "Saludos cordiales",
    closingComma: true,
    hi: (name) => `Hola, ${name}:`,
    formal: (name) => `Estimado/a ${name}:`,
    best: "Saludos",
    firstName: "[nombre]",
    companyTeam: (company) => `equipo de ${company}`,
    noteGreeting: (name) => `Hola, ${name}: `,
    openRole: "El puesto vacante",
    roleAt: (role, company) => `${role} en ${company}`,
    subjectLead: { first: "", follow_up: "Seguimiento: ", thank_you: "Gracias: " },
    theRole: (title) => `el puesto de ${title}`,
    yourRole: "el puesto vacante",
    at: (company) => ` en ${company}`,
    thanks: (role, at) => `Gracias por la conversación sobre ${role}${at}.`,
    applied: (role, at) => `Me postulé a ${role}${at} y me encantaría conectar.`,
    applying: (role, at) => `Me estoy postulando a ${role}${at} y me encantaría conectar.`,
  },
  pt: {
    dear: (company) => (company ? `Prezada equipe ${company},` : "Prezada equipe de recrutamento,"),
    regards: "Atenciosamente",
    closingComma: true,
    hi: (name) => `Olá, ${name},`,
    formal: (name) => `Prezado(a) ${name},`,
    best: "Abraços",
    firstName: "[nome]",
    companyTeam: (company) => `equipe ${company}`,
    noteGreeting: (name) => `Olá, ${name}, `,
    openRole: "A vaga em aberto",
    roleAt: (role, company) => `${role} – ${company}`,
    subjectLead: { first: "", follow_up: "Acompanhamento: ", thank_you: "Agradecimento: " },
    theRole: (title) => `a vaga de ${title}`,
    yourRole: "a vaga em aberto",
    at: (company) => ` na ${company}`,
    thanks: (role, at) => `Agradeço pela conversa sobre ${role}${at}.`,
    applied: (role, at) => `Me candidatei para ${role}${at} e gostaria de me conectar.`,
    applying: (role, at) => `Estou me candidatando para ${role}${at} e gostaria de me conectar.`,
  },
  fr: {
    dear: () => "Madame, Monsieur,",
    regards: "Cordialement",
    closingComma: true,
    hi: (name) => `Bonjour ${name},`,
    formal: (name) => `Bonjour ${name},`,
    best: "Bien à vous",
    firstName: "[prénom]",
    companyTeam: (company) => `l'équipe ${company}`,
    noteGreeting: (name) => `Bonjour ${name}, `,
    openRole: "Le poste à pourvoir",
    roleAt: (role, company) => `${role} chez ${company}`,
    subjectLead: { first: "", follow_up: "Relance : ", thank_you: "Merci : " },
    theRole: (title) => `le poste de ${title}`,
    yourRole: "votre poste à pourvoir",
    at: (company) => ` chez ${company}`,
    thanks: (role, at) => `Merci pour notre échange sur ${role}${at}.`,
    applied: (role, at) => `J'ai postulé pour ${role}${at} et j'aimerais échanger avec vous.`,
    applying: (role, at) => `Je postule pour ${role}${at} et j'aimerais échanger avec vous.`,
  },
  de: {
    dear: (company) =>
      company ? `Sehr geehrtes Team von ${company},` : "Sehr geehrte Damen und Herren,",
    regards: "Mit freundlichen Grüßen",
    closingComma: false,
    hi: (name) => `Hallo ${name},`,
    formal: (name) => `Guten Tag ${name},`,
    best: "Viele Grüße",
    firstName: "[Vorname]",
    companyTeam: (company) => `Team von ${company}`,
    noteGreeting: (name) => `Hallo ${name}, `,
    openRole: "Die offene Stelle",
    roleAt: (role, company) => `${role} bei ${company}`,
    subjectLead: { first: "", follow_up: "Nachfrage: ", thank_you: "Vielen Dank: " },
    theRole: (title) => `die Stelle als ${title}`,
    yourRole: "Ihre offene Stelle",
    at: (company) => ` bei ${company}`,
    thanks: (role, at) => `Vielen Dank für das Gespräch über ${role}${at}.`,
    applied: (role, at) => `Ich habe mich auf ${role}${at} beworben und würde mich gern vernetzen.`,
    applying: (role, at) => `Ich bewerbe mich auf ${role}${at} und würde mich gern vernetzen.`,
  },
};

export function letterWords(lang: ContentLang = "en"): LetterWords {
  return LETTER_WORDS[lang];
}
