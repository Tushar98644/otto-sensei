import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  gone: "Esas líneas ya no están aquí",
  goneNote: "Vuelve a escribirlas desde tu diario de carrera.",
  noResume: "Ese currículum ya no está en tu lista",
  alreadyOn: "Esas líneas ya están en este trabajo",
  added: {
    one: "Se agregó {count} línea de tu diario de carrera",
    other: "Se agregaron {count} líneas de tu diario de carrera",
  },
  changed: "Lo cambiaste desde entonces",
  useUndo: "Usa Deshacer arriba del editor.",
  title: "De tu diario de carrera",
  description: "Acepta las líneas que sean ciertas. Nada pasa a tu currículum hasta que lo hagas.",
  notNow: "Ahora no",
  addCount: {
    one: "Agregar {count} línea",
    other: "Agregar {count} líneas",
  },
  addLines: "Agregar líneas",
  fromNotes: {
    one: "{count} línea de tus notas",
    other: "{count} líneas de tus notas",
  },
  note: "Cada línea sale de lo que escribiste. Donde un número ayudaría y no me lo diste, dejé un espacio para ti.",
  addTo: "Agregarlas a",
  addingTo: "Se agregan a <b>{job}</b>",
  noJob: "Agrega primero el trabajo a este currículum y vuelve a intentarlo.",
  fromMonths: "De tus notas de {months}: “{quote}”",
  needsFact: "Otto necesita un dato: {blank}",
  onlyIfKnown: "Solo si lo sabes",
  accepted: "Aceptada",
  accept: "Aceptar",
  pressAgain: "Presiona de nuevo para dejarla fuera.",
  fillBlank: "Completa el espacio para aceptarla, o déjala fuera.",
  jobNumber: "Trabajo {number}",
} satisfies Translation<Messages["careerLogLines"]>;
