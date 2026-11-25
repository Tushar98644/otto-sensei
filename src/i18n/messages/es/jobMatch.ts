import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  list: "{items} y {count} más",
  roleMatch: "Puesto equivalente: {job} ≈ tu puesto de {person}. ",
  found: "Está en tu currículum: {list}.",
  notFound: "No está en tu currículum: {list}.",
  noTools: "La oferta no nombra herramientas para comparar.",
  kind: {
    same: "La misma ocupación que la tuya.",
    sameNamed: "La misma ocupación que la tuya: {name}.",
    close: "Una ocupación muy relacionada.",
    closeNamed: "Una ocupación muy relacionada: {name}.",
    group: "Un tipo de trabajo relacionado.",
    groupNamed: "Un tipo de trabajo relacionado: {name}.",
    neighbour: "Un tipo de puesto cercano.",
    sameRole: "El mismo tipo de puesto que el tuyo.",
    earlier: "Como un puesto anterior de tu currículum.",
  },
  nothing: "Nada de lo que nombra la oferta está en este currículum.",
  nothingToCheck: "Este currículum y esta oferta no tienen nada en común que yo pueda comprobar.",
  levels: {
    intern: "una pasantía",
    junior: "un puesto de nivel inicial",
    mid: "un puesto de nivel intermedio",
    senior: "un puesto sénior",
    lead: "un puesto de líder o staff",
    director: "un puesto de nivel director",
  },
  stepUp: "Es {level}, un paso por encima de tu último puesto.",
  stepDown: "Es {level}, de menor nivel que tu último puesto.",
  training: "Los trabajos así suelen pedir más formación o experiencia que tu último puesto.",
  years: "Pide {asked}+ años; tu currículum muestra cerca de {shown}.",
  yearsShown: { one: "{count} año", other: "{count} años" },
  visa: {
    ukSponsor: "En la lista de patrocinadores de visas del Reino Unido",
    h1b: "Peticiones de visa H-1B aprobadas en el año fiscal {year} (USCIS)",
  },
} satisfies Translation<Messages["jobMatch"]>;
