import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signOff: "{mascot}, de {brand}",
  linkLine: "{label}: {url}",
  unsubscribe: "Cancelar suscripción",
  unsubscribeLine: "Cancela la suscripción con un clic: {url}",
  emailSettings: "Ajustes de correo",
  signInCode: {
    subject: "Tu código de Otto Sensei: {token}",
    lead: "Tu código de Otto Sensei es",
    expires: "Vence en 10 minutos.",
    ignore: "Si no lo pediste, puedes ignorar este correo.",
  },
  trialEnding: {
    subject: "Tu prueba de {plan} termina el {day}",
    at: "{day} a las {time}",
    price: { month: "{price} al mes", year: "{price} al año" },
    noticeBody:
      "Termina el {when}. Después, {plan} cuesta {price}. Puedes cancelar cuando quieras antes de esa fecha desde la página de tu cuenta.",
    lead: "Un aviso rápido: tu prueba de {plan} termina el {when}.",
    charge:
      "Después, {plan} cuesta {price} (en dólares estadounidenses, más el impuesto sobre las ventas o IVA de donde vives) hasta que canceles. Si quieres quedarte con {plan}, no tienes que hacer nada.",
    cancel:
      "Si no quieres continuar, puedes cancelar cuando quieras antes de esa fecha desde la página de tu cuenta, y no se te cobrará nada más.",
    account: "Tu cuenta",
    button: "Ir a tu cuenta",
    footer:
      "Recibes este correo porque tu prueba de {plan} está por terminar. Es un aviso de facturación, así que llega aunque hayas desactivado los correos de recordatorio.",
  },
  checkin: {
    noticeTitle: "Tu repaso de {month}",
    noticeBody: "Un minuto: qué lanzaste, algún número y algo que aprendiste o lideraste.",
    subject: "Tu repaso de {month} en un minuto",
    lead: "¿Un minuto para {month}? Tres preguntas rápidas, por voz o por texto. Sáltate las que quieras.",
    prompts: {
      shipped: {
        label: "¿Qué lanzaste o mejoraste?",
        hint: "Una función, una corrección, un proceso, una venta.",
      },
      numbers: {
        label: "¿Algún número?",
        hint: "Usuarios, %, dinero, tiempo ahorrado. Aproximado está bien.",
      },
      learned: {
        label: "¿Algo que aprendiste o lideraste?",
        hint: "Una habilidad, una herramienta, una persona a la que ayudaste.",
      },
    },
    nothingNew: "¿Nada nuevo este mes? Es un solo toque en la página.",
    free: "Tus notas son gratis en todos los planes. Cuando busques tu próximo empleo, Pro las convierte en líneas de currículum que citan tus propios datos.",
    button: "Escribir mi repaso",
    reason:
      "Recibes esto porque activaste el repaso mensual del diario de carrera. Una vez al mes.",
  },
  processorNotice: {
    subject: "Dodo Payments recibe los pagos de {brand} desde el {day}",
    intro:
      "Un aviso breve sobre pagos: Dodo Payments ahora gestiona el pago de {brand} en lugar de Paddle, y recibe pagos reales desde el {day}.",
    reseller:
      "Dodo Payments es nuestro revendedor en línea y comerciante registrado (merchant of record). Cobra el pago cuando compras un plan y se encarga de los recibos, el impuesto sobre las ventas o IVA, los reembolsos y el soporte de facturación.",
    data: "Cuando inicias un pago, enviamos a Dodo Payments el correo de tu cuenta, nuestro identificador aleatorio de tu cuenta y el plan que eliges, los mismos datos que recibía Paddle. Dodo Payments trata tus datos de pago según su propia política de privacidad.",
    nothing:
      "No tienes que hacer nada. Todo lo que creaste en {brand} queda como está, y nuestros precios no cambian.",
    updated:
      "Actualizamos nuestros términos, la política de privacidad y la página de reembolsos para reflejarlo:",
    terms: "Términos",
    privacy: "Política de privacidad",
    refunds: "Reembolsos",
    questions: "¿Preguntas? Escribe a {email}.",
    footer:
      "Recibes este correo porque tienes una cuenta de {brand}. Es un aviso único sobre un cambio en nuestros términos y política de privacidad, así que llega aunque tengas desactivados otros correos.",
  },
  unsubscribePage: {
    title: "Cancelar suscripción",
    invalid:
      "Ese enlace ya no es válido. Otto ya no envía estos correos; tus recordatorios están en la campana de tu panel.",
    failed: "No se pudieron desactivar esos correos. Inténtalo de nuevo.",
    lists: {
      reminders: {
        name: "Correos de recordatorio de seguimiento",
        ask: "¿Desactivar los correos de recordatorio de seguimiento? Tus recordatorios siguen en la campana de tu panel.",
        press: "Desactivar los correos de recordatorio",
        done: "Listo. Ya no recibirás correos de recordatorio de seguimiento. La campana de tu panel los guarda.",
      },
      jobs: {
        name: "El correo semanal de empleos",
        ask: "¿Detener el correo semanal sobre empleos nuevos que coinciden con tu currículum? La pestaña Empleos los sigue mostrando.",
        press: "Detener el correo semanal",
        done: "Listo. Ya no recibirás el correo semanal de empleos. Las coincidencias nuevas aparecen en la campana de tu panel.",
      },
      tips: {
        name: "Consejos y recordatorios",
        ask: "¿Detener los correos de consejos y recordatorios, como el aviso cuando vuelven las correcciones de línea de Free? Los avisos de facturación de una prueba siguen llegando.",
        press: "Detener consejos y recordatorios",
        done: "Listo. Ya no recibirás correos de consejos y recordatorios.",
      },
      views: {
        name: "Correos de visitas",
        ask: "¿Detener los correos sobre personas que abren los enlaces de tu currículum y tu portafolio? La campana de tu panel los sigue mostrando.",
        press: "Detener los correos de visitas",
        done: "Listo. Ya no recibirás correos de visitas. La campana de tu panel los guarda.",
      },
      career: {
        name: "Correos del repaso del diario de carrera",
        ask: "¿Detener el correo mensual del diario de carrera? Tu diario se queda, gratis, y la campana de tu panel te sigue preguntando una vez al mes.",
        press: "Detener los correos de repaso",
        done: "Listo. Ya no recibirás correos del diario de carrera. Tu diario se queda, y puedes volver a activar el correo en los ajustes de tu cuenta.",
      },
    },
  },
  followUp: {
    title: "¿Es hora de hacer seguimiento con {company}?",
    titleBlank: "¿Es hora de hacer seguimiento?",
    titleMany: {
      one: "{count} postulación está lista para un seguimiento",
      other: "{count} postulaciones están listas para un seguimiento",
    },
    days: { one: "{count} día", other: "{count} días" },
    sinceInterview:
      "Hace {days} que tuviste tu entrevista con {company}. Una nota breve hace que te recuerden.",
    sinceInterviewBlank:
      "Hace {days} que tuviste tu entrevista. Una nota breve hace que te recuerden.",
    sinceApplied: "Hace {days} que te postulaste a {company}. Un seguimiento breve puede ayudar.",
    thatCompany: "esa empresa",
    many: "Puedes hacer seguimiento de {who}. Una nota breve puede ayudar.",
    applications: {
      one: "{count} postulación",
      other: "{count} postulaciones",
    },
    andMore: "{names} y {count} más",
    pair: "{first} y {second}",
  },
  interviewSoon: {
    title: "Tu entrevista con {company} es {day}",
    titleBlank: "Tu entrevista es {day}",
    today: "hoy",
    tomorrow: "mañana",
    onDay: "el {weekday}",
    role: "Para el puesto de {role}.",
    advice: "Repasa las preguntas probables en tu preparación antes de ir.",
  },
  views: {
    count: { one: "{count} visita", other: "{count} visitas" },
    shareTitle: "Alguien abrió el enlace de tu currículum",
    shareBody: "{link} lleva {views} hasta ahora.",
    namedLink: "Tu enlace de “{name}”",
    resumeLink: "El enlace de tu currículum",
    portfolioTitle: "Tu portafolio tuvo {views} {period}",
    thisWeek: "esta semana",
    since: "desde el {day}",
    portfolioBody: "Sin contarte a ti, las vistas previas de enlaces ni los buscadores.",
  },
  jobs: {
    title: {
      one: "{count} coincidencia nueva esta semana",
      other: "{count} coincidencias nuevas esta semana",
    },
    job: "{title} en {company}",
    andMore: "{names} y {count} más.",
    pair: "{first} y {second}.",
    single: "{name}.",
    free: "En Free, Empleos muestra tus coincidencias más cercanas.",
  },
} satisfies Translation<Messages["emails"]>;
