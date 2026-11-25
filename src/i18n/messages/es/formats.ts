import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume formats, in Spanish.
export default {
  lead: {
    looks: "Un currículum, {count} estilos.",
    free: "{looks} {names} son gratis. Los otros {proCount} vienen con {pro}, y puedes probarlos antes en tu currículum.",
    paid: "{looks} Cambia cuando quieras: tus palabras siguen iguales.",
    and: "{first} y {last}",
  },
  gallery: {
    appliesTo: "Al elegir un formato, se aplica a <b>{name}</b> y se abre el paso de descarga.",
    noResume:
      "Aún no tienes currículum. Elige un formato y luego agrega tu currículum o pruébalo con un ejemplo.",
    applyTo: "Aplicar a",
    appliesHint: "Al elegir un formato, se aplica a este currículum y se abre el paso de descarga.",
    download: "Descargar",
    use: "Usar este formato",
    inUse: "En uso",
    preview: "Vista previa",
    close: "Cerrar",
    alt: "Página 1 de un currículum de ejemplo en el formato {name}",
  },
  chosen: {
    comesOut: "Tu currículum saldrá en {name}.",
    setTo: "Tu currículum quedará en {name}.",
    change: "Puedes cambiarlo en el paso de descarga.",
    proOnly: "{name} es un formato de {pro}, así que en {free} tu descarga sale en {fallback}.",
    sample: "Probar con un ejemplo",
  },
  templates: {
    classic: {
      description:
        "El diseño que recomiendan las oficinas de carrera de las universidades: letra sencilla, títulos centrados sin líneas y la empresa sobre tu cargo en cada empleo.",
      bestFor: "Cualquier empleo, en cualquier lugar. La opción segura si no estás seguro.",
    },
    modern: {
      description:
        "Un nombre grande en dos tonos, títulos que empiezan en color con una línea hasta el borde y cargos en versalitas.",
      bestFor: "Tecnología, startups y equipos con sensibilidad de diseño.",
    },
    compact: {
      description:
        "El formato de una página que las escuelas de negocios envían a los bancos: letra estilo Times, títulos en mayúsculas bajo líneas finas, viñetas cuadradas y solo años.",
      bestFor: "Finanzas, consultoría y trayectorias largas que deben caber en una página.",
    },
    executive: {
      description:
        "Serif estilo Palatino, tu nombre en color junto a tu titular, títulos en color sobre líneas suaves y espaciado amplio.",
      bestFor: "Puestos sénior, finanzas, derecho y consultoría.",
    },
    developer: {
      description:
        "La plantilla que comparten los ingenieros: serif de libro, títulos en versalitas sobre líneas completas, cargos en negrita sobre la empresa en cursiva. Habilidades y proyectos primero.",
      bestFor: "Ingenieros de software y otros perfiles técnicos.",
    },
    minimal: {
      description:
        "Solo negro: serif estilo Charter, un nombre grande y sencillo, títulos en negrita sobre líneas finas y cada empleo en una sola línea.",
      bestFor: "Ingenieros y cualquiera que quiera una página tranquila y sencilla.",
    },
  },
} satisfies Translation<Messages["formats"]>;
