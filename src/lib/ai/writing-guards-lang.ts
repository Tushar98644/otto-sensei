import type { ContentLang } from "@/lib/i18n/languages";

// Spanish, Portuguese, French and German phrases for the writing guards; English lives in writing-guards.ts.

export type Phrase = { label: string; pattern: RegExp };
type Foreign = Exclude<ContentLang, "en">;

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

function phrase(label: string, source: string): Phrase {
  return { label, pattern: new RegExp(`${B}(?:${source})${E}`, "iu") };
}

export const FOREIGN_CLICHES: Record<Foreign, readonly Phrase[]> = {
  es: [
    phrase("por medio de la presente", "por medio de la presente"),
    phrase("me dirijo a ustedes", "me dirijo a (?:ustedes|usted)"),
    phrase("expresar mi interés", "expresar(?:les)? mi (?:\\p{L}+ )?inter[ée]s"),
    phrase("apasionado", "apasionad[oa]s?|me apasiona|pasi[óo]n por"),
    phrase("estaría encantado", "estar[ií]a encantad[oa]|me encantar[ií]a"),
    phrase("proactivo", "proactiv[oa]s?|proactividad"),
    phrase("orientado a resultados", "orientad[oa]s? (?:a|al) (?:resultados|logro)"),
    phrase("sinergia", "sinergias?"),
    phrase("dinámico", "din[aá]mic[oa]s?"),
    phrase("valor añadido", "valor (?:añadido|agregado)"),
    phrase("de vanguardia", "de vanguardia"),
    phrase("perfil ideal", "(?:perfil|candidat[oa]) ideal|encaje perfecto|encajo perfectamente"),
    phrase("estoy seguro de que", "estoy (?:segur[oa]|convencid[oa]) de que"),
    phrase("jugador de equipo", "jugador(?:a)? de equipo|capacidad de trabajo en equipo"),
    phrase("en el mundo actual", "en el mundo (?:actual|de hoy)"),
  ],
  pt: [
    phrase("venho por meio desta", "venho por meio dest[ae]"),
    phrase("expressar meu interesse", "expressar (?:o )?meu (?:\\p{L}+ )?interesse"),
    phrase("apaixonado", "apaixonad[oa]s?|paix[ãa]o por"),
    phrase("seria um prazer", "seria um (?:grande )?prazer"),
    phrase("proativo", "proativ[oa]s?|proatividade"),
    phrase("focado em resultados", "(?:focad[oa]|orientad[oa]) (?:em|a|para) resultados"),
    phrase("sinergia", "sinergias?"),
    phrase("dinâmico", "din[aâ]mic[oa]s?"),
    phrase("agregar valor", "agregar valor|valor agregado"),
    phrase("de ponta", "de ponta"),
    phrase("perfil ideal", "(?:perfil|candidat[oa]) ideal|encaixe perfeito"),
    phrase("tenho certeza de que", "tenho (?:certeza|convic[çc][ãa]o) de que"),
    phrase("vestir a camisa", "vestir a camisa"),
    phrase("no mundo atual", "no mundo (?:atual|de hoje)"),
  ],
  fr: [
    phrase("c'est avec un grand intérêt", "c['’]est avec (?:un )?(?:grand|vif) int[ée]r[eê]t"),
    phrase("je me permets", "je me permets"),
    phrase("je vous prie d'agréer", "je vous prie d['’]agr[ée]er|veuillez agr[ée]er"),
    phrase("passionné", "passionn[ée]e?s?|passion pour"),
    phrase("dynamique", "dynamique"),
    phrase("force de proposition", "force de proposition"),
    phrase("rigoureux", "rigoureu(?:x|se)"),
    phrase("synergie", "synergies?"),
    phrase("à la pointe", "[àa] la pointe"),
    phrase("valeur ajoutée", "valeur ajout[ée]e"),
    phrase(
      "profil idéal",
      "(?:profil|candidat) id[ée]al|parfaitement (?:adapt[ée]e?|en ad[ée]quation)",
    ),
    phrase("je suis convaincu", "je suis (?:convaincue?|s[ûu]re?) (?:que|de)"),
    phrase("n'hésitez pas", "n['’]h[ée]sitez pas"),
    phrase("dans le monde d'aujourd'hui", "dans le monde (?:actuel|d['’]aujourd['’]hui)"),
  ],
  de: [
    phrase("hiermit bewerbe ich mich", "hiermit bewerbe ich mich"),
    phrase("mit großem Interesse", "mit (?:gro(?:ß|ss)em|viel) interesse"),
    phrase("Leidenschaft", "leidenschaft(?:lich\\p{L}*)?|mit herzblut"),
    phrase("teamfähig", "teamf[äa]hig(?:keit)?"),
    phrase("belastbar", "belastbar(?:keit)?"),
    phrase("ergebnisorientiert", "(?:ergebnis|ziel|l[öo]sungs)orientiert\\p{L}*"),
    phrase("Synergie", "synergie\\p{L}*"),
    phrase("dynamisch", "dynamisch\\p{L}*"),
    phrase("hochmotiviert", "hoch ?motiviert\\p{L}*"),
    phrase("Mehrwert", "mehrwert"),
    phrase("spannende Herausforderung", "spannenden? herausforderung(?:en)?"),
    phrase("ideale Besetzung", "(?:ideale|perfekte)[rn]? (?:besetzung|kandidat\\p{L}*)"),
    phrase("ich bin überzeugt", "ich bin (?:mir )?(?:sicher|[üu]berzeugt)"),
    phrase("über den Tellerrand", "[üu]ber den tellerrand"),
    phrase("in der heutigen Zeit", "in der heutigen (?:zeit|welt)"),
  ],
};

// Lessons, reasons and time spans only the person can state.
export const FOREIGN_UNBACKED: Record<Foreign, readonly Phrase[]> = {
  es: [
    phrase("me enseñó", "me ense[ñn][óo]"),
    phrase("aprendí", "aprend[íi]"),
    phrase("me di cuenta", "me di cuenta"),
    phrase("en retrospectiva", "en retrospectiva|mirando (?:hacia )?atr[áa]s"),
    phrase("en los últimos años", "(?:en|durante) (?:los|estos) [úu]ltimos (?:a[ñn]os|meses)"),
    phrase("a diario", "a diario|cada d[íi]a|d[íi]a a d[íi]a|diariamente"),
  ],
  pt: [
    phrase("me ensinou", "me ensinou"),
    phrase("aprendi", "aprendi"),
    phrase("percebi", "percebi"),
    phrase("em retrospecto", "em retrospect(?:o|iva)|olhando para tr[áa]s"),
    phrase("nos últimos anos", "nos [úu]ltimos (?:anos|meses)"),
    phrase("diariamente", "diariamente|todos os dias|no dia a dia"),
  ],
  fr: [
    phrase("m'a appris", "m['’]a appris"),
    phrase("j'ai appris", "j['’]ai appris"),
    phrase("j'ai compris", "j['’]ai (?:compris|r[ée]alis[ée])"),
    phrase("avec le recul", "avec le recul|r[ée]trospectivement"),
    phrase("ces dernières années", "(?:ces|les) derni[èe]res ann[ée]es"),
    phrase("au quotidien", "au quotidien|chaque jour|quotidiennement"),
  ],
  de: [
    phrase("hat mich gelehrt", "hat mich gelehrt"),
    phrase("ich habe gelernt", "(?:ich habe|habe ich) gelernt"),
    phrase("mir wurde klar", "mir wurde (?:klar|bewusst)"),
    phrase("im Nachhinein", "im nachhinein|r[üu]ckblickend"),
    phrase("in den letzten Jahren", "in den letzten (?:jahren|monaten)"),
    phrase("täglich", "t[äa]glich|jeden tag|im alltag"),
  ],
};

// A [bracket] that starts with one of these is a blank for the person, never a fact to unwrap.
export const FOREIGN_BLANK_WORDS: Record<Foreign, RegExp> = {
  es: new RegExp(
    `^(?:tu|tus|su|sus|el|la|los|las|un|una|nombre|empresa|fecha|cifra|n[úu]mero|cantidad|puesto|cargo|ciudad|insertar|agregar|a[ñn]adir|x)${E}`,
    "iu",
  ),
  pt: new RegExp(
    `^(?:seu|sua|seus|suas|o|a|os|as|um|uma|nome|empresa|data|n[úu]mero|quantidade|cargo|cidade|inserir|adicionar|x)${E}`,
    "iu",
  ),
  fr: new RegExp(
    `^(?:l['’]|(?:ton|ta|tes|votre|vos|le|la|les|un|une|nom|entreprise|soci[ée]t[ée]|date|chiffre|nombre|poste|ville|ins[ée]rer|ajouter|x)${E})`,
    "iu",
  ),
  de: new RegExp(
    `^(?:dein|deine|deinen|ihr|ihre|der|die|das|ein|eine|name|firma|unternehmen|datum|zahl|anzahl|stelle|position|stadt|einf[üu]gen|x)${E}`,
    "iu",
  ),
};

export function foreignOf(langs: readonly ContentLang[]): Foreign[] {
  return langs.filter((lang): lang is Foreign => lang !== "en");
}
