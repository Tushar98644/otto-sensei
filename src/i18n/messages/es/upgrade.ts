import type { Messages } from "..";
import type { Translation } from "../../types";

// The upgrade and add-credit dialogs, in Spanish.
export default {
  otto: {
    pitch:
      "Adaptaciones, cartas y correcciones de línea cada mes, para una búsqueda de empleo intensa.",
    billingOff: "Los pagos aún no están activos, pero igual puedes escribirnos sobre un plan.",
    alreadyMax: "Estás en Max, el plan más grande. Escríbenos si necesitas más.",
    biggest: "Estás en {plan}, el plan más grande a la venta aquí. Escríbenos si necesitas más.",
    hasMore: "{line} {plan} tiene más.",
    monthCredit:
      "Este mes agregaste {spent} de crédito, más de los {extra} que {max} cuesta por encima de {pro}.",
  },
  title: {
    reached: {
      month: "Llegaste al límite de este mes",
      trial: "Llegaste al límite de esta prueba",
    },
    onPlan: "Estás en {plan}",
    updateCard: "Actualiza tu tarjeta",
    upgradeTo: "Pásate a {plan}",
    choose: "Elige tu plan",
    trial: "Prueba {plan} por {days} días",
  },
  resets: "Se reinicia {when}. ¿Necesitas más antes? Escríbenos.",
  resetsCredit: "Se reinicia {when}. ¿Necesitas más antes? Agrega crédito o escríbenos.",
  cancelAnytime: "Cancela cuando quieras desde tu cuenta.",
  inPlace: "Tu suscripción cambia en el momento: solo pagas la diferencia, nunca dos veces.",
  creditFrom: "O agrega crédito desde {min}: {buys}.",
  balance: "Tu saldo: {balance}.",
  replace:
    "O reemplaza “{title}” por el nuevo. El anterior espera en Eliminados recientemente {days} días, solo en este navegador.",
  buttons: {
    addCredit: "Agregar crédito",
    replace: "Reemplazarlo",
    notNow: "Ahora no",
    close: "Cerrar",
    emailUs: "Escríbenos",
    back: "Atrás",
    manageBilling: "Gestionar pagos",
  },
  toast: {
    alreadyOn: "Ya estás en {plan}.",
    backOn: "Estás en {plan}. Sigamos donde lo dejaste.",
  },
  trial: {
    notice: "{plan} empieza ahora y tu prueba de {trialPlan} termina. {charge}",
    charge:
      "Pagas {price} (más impuestos, si aplican) de inmediato, con la tarjeta que tienes registrada. El cargo de {trial} de la prueba no se descuenta.",
    paymentIssue:
      "Tu último pago no se procesó, así que por ahora estás en Free. Actualiza tu tarjeta en Gestionar pagos para recuperar tu plan.",
    resumeTrial:
      "Tu prueba está programada para terminar. Reanúdala en Gestionar pagos y luego empieza {plan}.",
    resumePlan:
      "Tu plan está programado para terminar. Reanúdalo en Gestionar pagos para cambiar de plan.",
  },
  offer: {
    howOften: "Cada cuánto pagar",
    intervals: { month: "Mensual", year: "Anual" },
    spoken: { month: "al mes", year: "al año" },
    per: { month: "/mes", year: "/año" },
    current: "Plan actual",
    popular: "Popular",
    save: "Ahorra {percent} %",
    referencePrice: "Precio de referencia",
    monthlyOnly: "Por ahora solo se vende mensual.",
    aboutMonth: "Unos {price} al mes.",
    everythingInPro: "Todo lo de Pro, y más:",
    highlight: {
      month: "{count} {label} al mes",
      trial: "{count} {label} durante la prueba",
    },
    labels: {
      fix: "correcciones de línea",
      tailor: "versiones adaptadas",
      letter:
        "cartas de presentación, mensajes de contacto, respuestas y preparaciones para entrevistas",
      import: "lecturas con IA de un currículum subido",
      draft: "borradores de Construir con Otto",
      github: "borradores de proyectos de GitHub",
    },
    proHighlight: "Los {formats} formatos, descargas en Word y todas las coincidencias de empleo",
    limitsHighlight: "Hasta {resumes} currículums y {applications} postulaciones registradas",
    tryPlan: "Prueba {plan} por {days} días",
    upgradeTo: "Pásate a {plan}",
    startNow: "Empezar {plan} ahora",
    resetRule: {
      month: "Los límites se reinician cada mes, cuando se renueva tu plan.",
      year: "Los límites se reinician cada mes, el mismo día del mes en que empezó tu plan.",
    },
    promises:
      "Las subidas siempre funcionan: después de las lecturas con IA, las lee el lector básico. Las descargas en PDF siguen gratis en todos los planes.",
    trialSentence:
      "{price} por {days} días, luego {planPrice} {perInterval}. Cancela cuando quieras antes de que termine la prueba.",
    perInterval: { month: "al mes", year: "al año" },
    endsTrial: "Termina hoy tu prueba de {trialPlan} y empieza {plan} a {priceLabel}.",
    monthly: "{price} al mes. Cancela cuando quieras.",
    yearly:
      "{price} una vez al año, unos {perMonth} al mes. {savings} % menos que pagar mes a mes.",
    yearlyFlat: "{price} una vez al año.",
  },
  billing: {
    testMode: "Modo de prueba",
    mockPlan: "Sin pago real. Tu plan cambia de inmediato.",
    offTitle: "Los pagos aún no están activos",
    off: "¿Quieres un plan de pago ya? Escribe a <link>{email}</link> y te lo activamos.",
  },
  credit: {
    title: "Agregar crédito",
    description:
      "Solo se usa cuando se agota lo incluido en tu plan del mes. No vence mientras exista tu cuenta.",
    amount: "Monto",
    other: "Otro",
    amountLabel: "Monto en dólares",
    hint: "Dólares enteros, de {min} a {max}.",
    add: "Agregar {amount}",
    pick: "Elige un monto en dólares enteros de {min} a {max}.",
    room: "Tu saldo admite hasta {cap}, así que ahora puedes agregar hasta {room}.",
    full: "Tu saldo admite hasta {cap}. Usa una parte y luego agrega más.",
    failed: "No se pudo agregar crédito",
    balanceNow: "Tu saldo ahora: {balance}.",
    mock: "Sin pago real. El crédito se agrega de inmediato.",
    tax: "Más impuestos al pagar, si aplican. Prepago y no reembolsable una vez usado.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versiones adaptadas",
      letter: "cartas",
      fix: "correcciones de línea",
      import: "lecturas de currículum con IA",
      draft: "borradores de Construir con Otto",
      github: "borradores de proyectos de GitHub",
    },
  },
} satisfies Translation<Messages["upgrade"]>;
