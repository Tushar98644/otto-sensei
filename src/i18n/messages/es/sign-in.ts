import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in form, dialog and terms line, in Spanish.
export default {
  google: "Continuar con Google",
  googleOff: "El inicio de sesión con Google funciona una vez que Supabase esté configurado.",
  or: "o",
  email: "Correo electrónico",
  emailPlaceholder: "tu@ejemplo.com",
  emailMe: "Envíame un código",
  badEmail: "Escribe tu correo electrónico, como nombre@ejemplo.com.",
  badCode: "Escribe el código de {length} dígitos del correo.",
  sent: "Enviamos un código de {length} dígitos a {email}.",
  sentNew: "Enviamos un código nuevo a {email}.",
  codeSent: "Enviamos un código de {length} dígitos a <b>{email}</b>.",
  codeSentNew: "Enviamos un código nuevo a <b>{email}</b>. Solo funciona el más reciente.",
  devCode: "Modo de desarrollo: tu código es <b>{code}</b>",
  codeLabel: "Código de {length} dígitos",
  codeHint: "Escríbelo o pégalo. Inicias sesión en cuanto estén los {length} dígitos.",
  signIn: "Iniciar sesión",
  sending: "Enviando…",
  resendIn: "Reenviar código en {seconds} s",
  resend: "Reenviar código",
  otherEmail: "Usar otro correo",
  done: "Iniciaste sesión.",
  terms:
    "¿Eres nuevo? Esto crea tu cuenta gratis. Al continuar, aceptas los <link>Términos</link> y la <link>Política de privacidad</link>.",
  newTab: "(se abre en una pestaña nueva)",
  dialog: {
    reason: "Una cuenta gratis le permite a Otto corregir líneas y adaptar tu currículum.",
    otto: "Usa Google o un código de 6 dígitos por correo, y volvemos a donde lo dejaste.",
  },
  upgrade: {
    trial: "Inicia sesión para empezar tu prueba",
    upgrade: "Inicia sesión para mejorar tu plan",
    otto: "Primero inicia sesión. Luego te llevo directo al pago.",
    description: "Usa Google o un código de 6 dígitos por correo. Sin contraseña.",
  },
  account: "Inicia sesión para ver tu plan y lo que usaste este mes.",
  signedOut: {
    safe: "Tus currículums están a salvo en tu cuenta. Vuelve a iniciar sesión para verlos aquí.",
    kept: {
      one: "1 currículum no terminó de respaldarse, así que sigue en este navegador.",
      other: "{count} currículums no terminaron de respaldarse, así que siguen en este navegador.",
    },
  },
  gate: {
    sessionEnded: "Se cerró tu sesión. Vuelve a iniciar sesión para continuar.",
    tryAgain: "Ahora inténtalo de nuevo.",
    backIn: "Ya entraste. Sigamos donde lo dejaste.",
    reasons: {
      fix: "Inicia sesión para corregir líneas conmigo. En Free tienes {limit} al mes.",
      tailor: "Inicia sesión y prueba {plan} por {days} días para adaptar conmigo.",
      letter: "Inicia sesión y prueba {plan} por {days} días para cartas, mensajes y respuestas.",
      import: "Inicia sesión y prueba {plan} por {days} días para lecturas con IA.",
      draft: "Inicia sesión y prueba {plan} por {days} días para crear borradores conmigo.",
      github: "Inicia sesión y prueba {plan} por {days} días para crear borradores desde GitHub.",
    },
  },
} satisfies Translation<Messages["signIn"]>;
