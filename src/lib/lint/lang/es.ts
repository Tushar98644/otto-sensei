import { indexPhrases, vagueOf, wordSet, type LintLanguage } from "./types";

// Spanish CVs often lead with a noun ("Gestión de…", "Desarrollo de…"); those read as strong, not weak.

const STOCK_PHRASES = [
  "alta capacidad de",
  "altamente motivada",
  "altamente motivado",
  "amplia experiencia",
  "apasionada por",
  "apasionado por",
  "atención a los detalles",
  "atención al detalle",
  "automotivada",
  "automotivado",
  "buenas habilidades de comunicación",
  "capacidad de adaptación",
  "capacidad de trabajo en equipo",
  "capacidad para trabajar bajo presión",
  "don de gentes",
  "excelente comunicador",
  "excelente comunicadora",
  "excelentes habilidades de comunicación",
  "fuera de la caja",
  "gran capacidad de",
  "habilidades comunicativas",
  "jugador de equipo",
  "líder nata",
  "líder nato",
  "muy motivada",
  "muy motivado",
  "orientada a objetivos",
  "orientada a resultados",
  "orientada al logro",
  "orientado a objetivos",
  "orientado a resultados",
  "orientado al logro",
  "pasión por",
  "pensar fuera de la caja",
  "persona proactiva",
  "persona responsable",
  "polivalente",
  "ponerse la camiseta",
  "proactiva",
  "proactividad",
  "proactivo",
  "probada experiencia",
  "resolutiva",
  "resolutivo",
  "sinergia",
  "sinergias",
  "tolerancia a la presión",
  "trabajar bajo presión",
  "trabajo bajo presión",
  "trabajo en equipo",
  "trayectoria comprobada",
  "valor agregado",
  "valor añadido",
];

const DUTY_STARTS = [
  "a cargo de",
  "a cargo del",
  "encargada de",
  "encargada del",
  "encargado de",
  "encargado del",
  "entre mis funciones",
  "estuve a cargo de",
  "estuve a cargo del",
  "fui responsable de",
  "fui responsable del",
  "me encargaba de",
  "me encargué de",
  "me encargué del",
  "mis funciones",
  "mis responsabilidades",
  "mis tareas",
  "responsable de",
  "responsable del",
  "trabajando en",
  "trabajé en",
];

const WEAK_STARTS = [
  "apoyando",
  "apoyé",
  "apoyé a",
  "apoyé en",
  "apoyo a",
  "apoyo al",
  "apoyo en",
  "asistencia en",
  "asistí en",
  "ayuda con",
  "ayuda en",
  "ayudando",
  "ayudé",
  "ayudé a",
  "ayudé con",
  "ayudé en",
  "colaboración con",
  "colaboración en",
  "colaborando en",
  "colaboré con",
  "colaboré en",
  "estuve involucrada en",
  "estuve involucrado en",
  "formé parte de",
  "formé parte del",
  "fui",
  "fui parte de",
  "fui parte del",
  "hice",
  "involucrada en",
  "involucrado en",
  "manejé",
  "manejando",
  "participación en",
  "participando en",
  "participé en",
  "trabajé con",
];

const RESULT_WORDS = wordSet(`
  aceleración aceleré aceleró acelerando acortando acorté acortó ahorrando ahorré ahorró ahorro
  ahorros alcancé alcanzó aseguré aseguró aumentado aumentada aumentando aumenté aumentó
  consiguiendo conseguí consiguió convertí convirtió crecí creció creciendo crecimiento
  disminución disminuí disminuyendo disminuyó dupliqué duplicó eliminación eliminando eliminé
  eliminó evitando evité evitó expandí expandió expansión gané ganó generando generé generó
  impulsando impulsé impulsó incrementado incrementando incrementé incrementó incremento
  logrando logré logró logro logros maximicé maximizó mejora mejorado mejorada mejorando
  mejoras mejoré mejoró minimicé minimizó permitió permitiendo previne previno recorte
  recortando recorté recortó recuperando recuperé recuperó reducción reducido reducida
  reducidos reducidas reduciendo reduje redujo redujimos retuve retuvo superando superé superó
  tripliqué triplicó
`);
const RESULT_PHRASES = indexPhrases([
  "adoptada por",
  "adoptado por",
  "con lo que",
  "dando como resultado",
  "de modo que",
  "hice crecer",
  "lo cual permitió",
  "lo que permitió",
  "más rápida",
  "más rápido",
  "para que",
  "usada por",
  "usado por",
  "utilizada por",
  "utilizado por",
]);
const RESULT_OPENERS = wordSet(`
  aceleré aceleró ahorré ahorró ahorro aumenté aumentó aumento disminuí disminuyó dupliqué
  duplicó generé generó impulsé impulsó incrementé incrementó incremento mejoré mejoró mejora
  recorté recortó reducción reduje redujo tripliqué triplicó
`);

const NUMBER_WORDS = wordSet(`
  cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince
  dieciséis diecisiete dieciocho diecinueve veinte treinta cuarenta cincuenta sesenta setenta
  ochenta noventa cien ciento cientos doscientos trescientos quinientos mil miles millón
  millones docena docenas doble triple mitad centenar centenares porcentaje
`);

export const es: LintLanguage = {
  lang: "es",
  openerSkips: wordSet("yo nosotros nosotras he hemos"),
  elisions: false,
  abbreviations: wordSet("etc aprox sr sra dr dra ing lic cia ltda num pag vs"),
  stock: indexPhrases(STOCK_PHRASES),
  duty: indexPhrases(DUTY_STARTS),
  weakStart: indexPhrases(WEAK_STARTS),
  // "me" and "nos" are left out: CVs use them in verbs like "me especialicé".
  firstPerson: {
    words: wordSet("yo mi mis mío mía conmigo nosotros nosotras nuestro nuestra nuestros nuestras"),
    team: wordSet("nosotros nosotras nuestro nuestra nuestros nuestras"),
  },
  result: { words: RESULT_WORDS, phrases: RESULT_PHRASES, suffixes: [], openers: RESULT_OPENERS },
  method: {
    words: wordSet("con mediante usando utilizando tras vía gracias"),
    phrases: indexPhrases(["a partir de", "a través de", "gracias a", "por medio de"]),
    gerund: /^(?!(?:cuando|comando|mando)$).{2,}(?:ando|iendo|yendo)$/u,
    lead: null,
  },
  numberWords: NUMBER_WORDS,
  vague: vagueOf(
    {
      count: [
        "distintas",
        "distintos",
        "diversas",
        "diversos",
        "gran cantidad de",
        "muchas",
        "muchos",
        "múltiples",
        "numerosas",
        "numerosos",
        "un montón de",
        "una gran cantidad de",
        "una serie de",
        "varias",
        "varios",
      ],
      list: ["entre otras", "entre otros", "etc", "y demás"],
      thing: ["cosas"],
    },
    ["etc"],
  ),
};
