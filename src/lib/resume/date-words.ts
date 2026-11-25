// Date words in Spanish, Portuguese, French and German CVs, for the import parser and the lint.

// Month names and short forms; "out", "set" and "ago" are English words too, so they need a "/" or "." after them.
export const MONTH_NAMES =
  "ene(?:ro)?|feb(?:rero)?|marzo|abr(?:il)?|mayo|jun(?:io)?|jul(?:io)?|agosto|sep(?:tiembre)?|setiembre|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?" +
  "|janeiro|fev(?:ereiro)?|mar[çc]o|maio|junho|julho|setembro|outubro|novembro|dez(?:embro)?" +
  "|janv(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|septembre|octobre|novembre|d[ée]c(?:embre)?" +
  "|j[äa]n(?:ner)?|januar|februar|m[äa]rz|m[äa]r|mrz|juni|juli|okt(?:ober)?|dezember";
export const SHORT_MONTH_WORDS = "out|set|ago";

// "Present" as Spanish, Portuguese, French and German CVs write it.
export const PRESENT_WORDS =
  "actualidad|actualmente|presente|hoy|(?:a |hasta )?la fecha|en curso" +
  "|atual|atualmente|hoje|(?:até )?o momento|em andamento|em curso" +
  "|présent|aujourd['’]hui|(?:à |a )?ce jour|en cours|maintenant" +
  "|heute|jetzt|aktuell|gegenwärtig|(?:bis )?dato|laufend";

// Words between two dates: "2019 a 2021", "2019 até 2021", "2019 au 2021", "2019 bis 2021".
export const RANGE_WORDS = "a|al|hasta|até|à|au|jusqu['’](?:à|au|en)|bis";
