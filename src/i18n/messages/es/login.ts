import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in page around the form, in Spanish.
export default {
  meta: {
    title: "Iniciar sesión",
    description:
      "Inicia sesión con Google o con tu correo. No necesitas contraseña: podemos enviarte un código de 6 dígitos.",
  },
  heading: {
    signIn: "Iniciar sesión",
    trial: "Inicia sesión para empezar tu prueba",
    upgrade: "Inicia sesión para mejorar tu plan",
    jobs: "Inicia sesión para ver tus empleos compatibles",
    portfolio: "Inicia sesión para crear tu portafolio",
  },
  otto: "Usa Google, o te envío por correo un código de 6 dígitos. Sin contraseñas que recordar.",
  studio: "¿Solo quieres revisar un currículum? <link>Abre el estudio</link>. No necesitas cuenta.",
  googleFailed: "El inicio de sesión con Google no terminó. Inténtalo de nuevo o usa tu correo.",
  signingIn: "Iniciando tu sesión",
} satisfies Translation<Messages["login"]>;
