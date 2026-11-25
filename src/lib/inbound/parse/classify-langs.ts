import type { Rule, Scored } from "./classify";

type Rules = Record<Scored, readonly Rule[]>;

const LETTER = String.raw`[\p{L}\p{N}_]`;
const EDGE = `(?:(?<=${LETTER})(?!${LETTER})|(?<!${LETTER})(?=${LETTER}))`;

// A regex literal whose \b counts accented letters as letters, so "postulación" is one word.
function w(strings: TemplateStringsArray, ...parts: string[]): RegExp {
  return new RegExp(String.raw(strings, ...parts).replaceAll(String.raw`\b`, EDGE), "u");
}

const UE = "(?:ü|ue?)";
const AE = "(?:ä|ae?)";
const OE = "(?:ö|oe?)";
const SS = "(?:ß|ss)";
const GA = String.raw`(?:\(a\)|\/a)?`;
const GE = String.raw`(?:\(e\))?`;

const ES_ON =
  "(?:continuar|seguir|avanzar|proseguir|continuaremos|seguiremos|avanzaremos|proseguiremos|continuamos|seguimos|avanzamos|avanzar[áa]|continuar[áa]|seguir[áa])";
const ES_APP = "(?:postulaci[óo]n|candidatura|solicitud|aplicaci[óo]n|proceso|perfil)";
const ES_OTHERS = "(?:otr[oa]s?|un[oa]? otr[oa]) (?:candidat|perfil|postulant|aspirant|persona)";
const ES_TALK =
  "(?:entrevistas?|llamada|videollamada|conversaci[óo]n|charla|reuni[óo]n|videoconferencia)";

const ES: Rules = {
  rejected: [
    [
      w`\bno (?:(?:podremos|podemos|vamos a|ser[áa] posible|es posible|ha sido posible|fue posible) )?${ES_ON}(?: adelante| avanzando)? (?:con|en) (?:(?:tu|su|la|el|esta|este) )?${ES_APP}`,
      3,
    ],
    [
      w`\bno (?:avanzar[áa]s|continuar[áa]s|seguir[áa]s|contin[úu]as|avanzas|sigues|pasar[áa]s|pasas|pasaste|avanzaste|continuaste|clasificaste)(?: adelante)? (?:en|a|al|con|para)\b`,
      3,
    ],
    [
      w`\b${ES_APP} no (?:avanzar[áa]|continuar[áa]|seguir[áa]|contin[úu]a|avanza|sigue|prosperar[áa]|ha prosperado|prosper[óo])\b`,
      3,
    ],
    [
      w`\b(?:decidido|decidimos|optado|optamos|elegido|elegimos|preferido)\b[^.]{0,40}?\b(?:con|por) ${ES_OTHERS}`,
      3,
    ],
    [w`\b${ES_ON}(?: adelante)? con ${ES_OTHERS}`, 3],
    [w`\bdecid(?:ido|imos) no ${ES_ON}`, 3],
    [
      w`\bno (?:has|ha|hemos|fuiste|fue|resultaste|result[óo]|has resultado|ha resultado) (?:sido )?(?:seleccionad|elegid|preseleccionad|escogid)`,
      3,
    ],
    [
      w`\b(?:lamentamos|sentimos|lamento|siento) (?:mucho )?(?:tener que )?(?:informar|comunicar|decir|notificar)(?:te|le|les)?\b`,
      3,
    ],
    [
      w`\b(?:la vacante|el puesto|la posici[óo]n|el cargo|la b[úu]squeda)\b[^.]{0,30}? (?:ha sido|ha|fue|ya fue|ya ha sido|se ha|se encuentra|est[áa]) (?:ya )?(?:cubiert|cerrad|ocupad|finalizad)`,
      3,
    ],
    [
      w`\b(?:tu|su) (?:perfil|experiencia|candidatura|postulaci[óo]n) no (?:se ajusta|encaja|coincide|cumple|se adecua|se alinea|corresponde)`,
      3,
    ],
    [
      w`\b(?:otr[oa]s (?:candidat\p{L}*|perfiles|postulantes|aspirantes)|otr[oa] (?:candidat[oa]|perfil|persona)) (?:cuy[oa]s? |que |con )[^.]{0,40}?\b(?:m[áa]s|mejor)\b`,
      3,
    ],
    [w`\b(?:no ha (?:tenido|sido) (?:[ée]xito|exitosa)|no fue exitosa)\b`, 3],
    [w`\b(?:lamentablemente|desafortunadamente|por desgracia|infortunadamente)\b`, 1],
    [
      w`\b(?:tras|despu[ée]s de) (?:una |un )?(?:(?:cuidados|detenid|minucios|exhaustiv|atent)[oa] (?:revisi[óo]n|an[áa]lisis|evaluaci[óo]n|consideraci[óo]n)|(?:revisi[óo]n|an[áa]lisis|evaluaci[óo]n) (?:cuidados|detenid|minucios|exhaustiv)[oa]|(?:revisar|analizar|evaluar) (?:cuidadosamente|detenidamente))`,
      1,
    ],
    [w`\botr[oa]s (?:candidat\p{L}*|postulantes|perfiles|aspirantes)\b`, 1],
    [
      w`\b(?:conservaremos|guardaremos|mantendremos|quedar[áa])\b[^.]{0,40}?\b(?:base de datos|cartera|banco de talento)`,
      1,
    ],
  ],
  offer: [
    [
      w`\b(?:ofrecerte|ofrecerle|te ofrecemos|le ofrecemos)(?: formalmente)? (?:el puesto|la posici[óo]n|el cargo|la vacante|el rol|una oferta|la oferta|nuestra oferta)\b`,
      3,
    ],
    [
      w`\b(?:complace|alegra|encanta|gusta|grato|placer|felices|contentos|emocionados|orgullo)\b[^.]{0,30}?\b(?:extenderte|extenderle|hacerte|hacerle|presentarte|presentarle|enviarte|enviarle|compartirte|compartirle|hacerte llegar|hacerle llegar)(?: formalmente)? (?:una|la|nuestra)(?: formal)? (?:oferta|propuesta)\b`,
      3,
    ],
    [w`\bcarta[- ](?:de )?(?:oferta|propuesta|proposta)\b`, 3],
    [
      w`\b(?:tu|su) (?:oferta|propuesta) (?:formal |laboral |de trabajo |de empleo )?(?:est[áa] lista|adjunta|se encuentra adjunta|va adjunta)`,
      3,
    ],
    [
      w`\b(?:has sido|ha sido|fuiste|fue|resultaste|result[óo]) (?:seleccionad|elegid|escogid)[oa]${GA} (?:para (?:ocupar )?|como )(?:el puesto|la posici[óo]n|el cargo|la vacante|el rol)\b`,
      3,
    ],
    [w`\bbienvenid[oa]s? (?:al equipo|a bordo|a la familia)`, 2],
  ],
  interview: [
    [
      w`\b(?:invitar(?:te|le|les|los|las)|te invitamos|le invitamos|les invitamos|te invito|le invito)\b (?:a|para) (?:(?:una|un|la|el|tu|su|nuestra|nuestro) )?(?:[\p{L}-]+ ){0,3}?${ES_TALK}\b`,
      3,
    ],
    [
      w`\b(?:has|ha|han) sido (?:invitad|convocad|citad|preseleccionad)[oa]s?${GA} (?:a|para) (?:(?:una|la|tu|su) )?(?:[\p{L}-]+ ){0,2}?${ES_TALK}\b`,
      3,
    ],
    [
      w`\b(?:agendar|programar|coordinar|concertar|fijar|confirmar|reservar|agendemos|coordinemos|programemos|agenda|agende|reserva|reserve)(?:nos)? (?:(?:una|la|tu|su|un|el|nuestra) )?(?:entrevista|llamada|videollamada|reuni[óo]n|conversaci[óo]n|charla|horario|cita)\b`,
      3,
    ],
    [
      w`\b(?:invitaci[óo]n|convocatoria|citaci[óo]n|confirmaci[óo]n) (?:a|de|para) (?:(?:una|la|tu|su) )?entrevista\b|\bentrevista (?:programada|agendada|confirmada|reservada|coordinada)\b`,
      3,
    ],
    [
      w`\b(?:tu|su) entrevista (?:con|para|en|el|ser[áa]|est[áa]|ha sido|es|queda|qued[óo]|fue)\b`,
      3,
    ],
    [
      w`\b(?:gustar[íi]a|encantar[íi]a|queremos|quisi[ée]ramos)\b (?:mucho )?(?:conocerte|conocerle|(?:conversar|hablar|charlar|platicar|reunirnos) (?:contigo|con usted))`,
      3,
    ],
    [
      w`\b(?:realizarte|realizarle|hacerte|hacerle) (?:una |la )?(?:entrevista|llamada|videollamada)\b`,
      3,
    ],
    [
      w`\b(?:compartir|enviar|indicar|confirmar|saber|comparte|comparta|comp[áa]rte(?:nos|me)|comp[áa]rta(?:nos|me)|env[íi]a(?:nos|me)?|env[íi]e(?:nos|me)?|ind[íi]ca(?:nos|me)?|ind[íi]que(?:nos|me)?|conf[íi]rma(?:nos|me)?|conf[íi]rme(?:nos|me)?|(?:compartir|enviar|indicar|confirmar)(?:nos|me)|cu[ée]nta(?:nos|me))\b[^.]{0,30}?\b(?:tu|su) disponibilidad\b|\bcu[áa]l (?:es|ser[íi]a) (?:tu|su) disponibilidad\b`,
      3,
    ],
    [w`\bdisponibilidad (?:horaria )?para (?:(?:una|la|un|el) )?${ES_TALK}\b`, 3],
    [
      w`\b(?:elige|elija|eleg[íi]|selecciona|seleccione|seleccion[áa]|escoge|escoja|reserva|reserve|reserv[áa]|agenda|agende|agend[áa])\b (?:(?:un|una|el|la|tu|su) )?(?:horario|hora|espacio|fecha y hora|d[íi]a y hora|turno|bloque)\b`,
      3,
    ],
    [
      w`\b(?:seleccionad[oa]|preseleccionad[oa]|elegid[oa]|avanzad[oa]|pasad[oa]|avanzas|avanzaste|pasas|pasaste|avanza|pasa|contin[úu]as|clasificad[oa]|clasificaste|calificad[oa])${GA} (?:a|para|en) (?:(?:la|el) )?(?:siguiente|pr[óo]xim[oa]|segund[oa]|tercer[oa]?|[úu]ltim[oa]|final|nueva) (?:etapa|fase|ronda|instancia|entrevista|paso)\b`,
      3,
    ],
    [w`\bpreseleccionad[oa]s?${GA} para (?:(?:una|la) )?entrevista`, 3],
    [
      w`\b(?:entrevista (?:t[ée]cnica|presencial|virtual|telef[óo]nica|por (?:video|videollamada|tel[ée]fono|zoom|teams|meet)|final|grupal|personal|en l[íi]nea|online|individual|con (?:rr\. ?hh|rrhh|recursos humanos|el equipo|la gerencia|el gerente|el l[íi]der|la l[íi]der))|(?:primera|segunda|tercera|nueva) entrevista|videoentrevista)\b`,
      2,
    ],
    [w`\bentrevistas?\b`, 1],
  ],
  assessment: [
    [
      w`\b(?:prueba|evaluaci[óo]n|examen|desaf[íi]o|reto|ejercicio|caso pr[áa]ctico)s? (?:t[ée]cnic[oa]s?|en l[íi]nea|online|de conocimientos?|psicom[ée]tric[oa]s?|psicot[ée]cnic[oa]s?|de habilidades|de ingl[ée]s|pr[áa]ctic[oa]s?|de programaci[óo]n|de c[óo]digo|de aptitud(?:es)?|cognitiv[oa]s?|de personalidad|de l[óo]gica)\b`,
      3,
    ],
    [
      w`\btests? (?:t[ée]cnic[oa]s?|psicom[ée]tric[oa]s?|psicot[ée]cnic[oa]s?|de (?:personalidad|conocimientos?|ingl[ée]s|l[óo]gica|aptitud(?:es)?|habilidades|programaci[óo]n))\b`,
      3,
    ],
    [
      w`\b(?:completar|realizar|resolver|rendir|responder|contestar|hacer|completa|realiza|realice|resuelve|resuelva|rinde|rinda|responde|responda)\b (?:(?:la|el|una|un|tu|su|nuestra|nuestro|esta|este|siguiente|breve|corta|corto) )*(?:prueba|test|examen|desaf[íi]o|reto|ejercicio|cuestionario|caso pr[áa]ctico)\b`,
      3,
    ],
    [
      w`\b(?:(?:enlace|acceso) (?:a|al|para|de|del)|link (?:al|para|de|del)) (?:(?:la|el) )?(?:prueba|evaluaci[óo]n|test|examen|desaf[íi]o|reto|ejercicio)\b`,
      3,
    ],
  ],
  applied: [
    [
      w`\b(?:gracias|agradecemos|agradecemos mucho|agradecemos sinceramente)\b(?: (?:mucho|de nuevo|nuevamente))? (?:por )?(?:postularte|postularse|postular|aplicar|enviar (?:tu|su) (?:cv|curr[íi]culum|hoja de vida|postulaci[óo]n|solicitud|candidatura|perfil)|presentar (?:tu|su) candidatura|participar en (?:nuestro|el) proceso|(?:tu|su) (?:postulaci[óo]n|solicitud|candidatura|aplicaci[óo]n|inter[ée]s (?:en|por) (?:formar|trabajar|unirte|unirse|ser parte|el|la|los|las|nuestr[oa]s?|est[ea]s?)))\b`,
      3,
    ],
    [
      w`\b(?:hemos recibido|recibimos|hemos registrado|registramos|confirmamos (?:la )?recepci[óo]n de)\b (?:(?:correctamente|con [ée]xito|exitosamente) )?(?:tu|su) (?:postulaci[óo]n|solicitud|candidatura|aplicaci[óo]n|cv|curr[íi]culum|hoja de vida)\b`,
      3,
    ],
    [
      w`\b(?:tu|su) (?:postulaci[óo]n|solicitud|candidatura|aplicaci[óo]n)\b(?: (?:para|a|al|en) [^.]{2,120}?)? (?:ha sido|fue|se ha|se) (?:(?:correctamente|exitosamente|con [ée]xito) )?(?:recibid|enviad|registrad|completad|realizad|presentad)[oa]`,
      3,
    ],
    [
      w`\b(?:postulaci[óo]n|solicitud|candidatura) (?:recibida|enviada|registrada|exitosa|confirmada|completada)\b|\bconfirmaci[óo]n de (?:(?:tu|su) )?(?:postulaci[óo]n|solicitud|candidatura)\b|\bacus(?:amos|e de) recibo\b`,
      3,
    ],
    [
      w`\b(?:te has postulado|te postulaste|te has inscrito|te inscribiste|has aplicado|aplicaste|postulaste|has postulado) (?:con [ée]xito|exitosamente|correctamente|a la (?:vacante|oferta|posici[óo]n)|al (?:puesto|cargo|empleo))`,
      3,
    ],
    [
      w`\b(?:tu|su) (?:postulaci[óo]n|solicitud|candidatura|aplicaci[óo]n|perfil|cv) (?:est[áa]|se encuentra|ya est[áa]) (?:siendo )?(?:en )?(?:revisad[oa]|revisi[óo]n|evaluad[oa]|evaluaci[óo]n|an[áa]lisis|analizad[oa]|proceso de (?:revisi[óo]n|evaluaci[óo]n|selecci[óo]n))`,
      3,
    ],
  ],
};

const PT_ON =
  "(?:seguir|prosseguir|avan[çc]ar|continuar|seguiremos|prosseguiremos|avan[çc]aremos|continuaremos|seguimos|prosseguimos|avan[çc]amos|continuamos|dar continuidade|dar sequ[êe]ncia|dar seguimento|daremos continuidade|daremos sequ[êe]ncia|daremos seguimento)";
const PT_APP = "(?:candidatura|perfil|processo|inscri[çc][ãa]o|aplica[çc][ãa]o|curr[íi]culo)";
const PT_OTHERS = "(?:outr[oa]s?|uma? outr[oa]) (?:candidat|perfi|profission|pessoa|participante)";
const PT_TALK = "(?:entrevista|conversa|bate-papo|reuni[ãa]o|liga[çc][ãa]o|chamada|videochamada)";

const PT: Rules = {
  rejected: [
    [
      w`\bn[ãa]o (?:(?:vamos|iremos|poderemos|podemos|conseguiremos|conseguimos|ser[áa] poss[íi]vel|foi poss[íi]vel|[ée] poss[íi]vel) )?${PT_ON}(?: adiante| em frente)? (?:com|a|ao|[àa]|em|no|na)(?: (?:sua|seu|a sua|o seu|tua|teu|o|a))? ${PT_APP}\b`,
      3,
    ],
    [
      w`\bn[ãa]o (?:seguir[áa]|avan[çc]ar[áa]|continuar[áa]|prosseguir[áa]|avan[çc]ou|seguiu|passou|prosseguiu)(?: (?:adiante|em frente))? (?:no|para|na|com|em|[àa]|a|ao)\b`,
      3,
    ],
    [
      w`\b(?:decidimos|optamos|escolhemos|preferimos|decidiu|optou)\b[^.]{0,40}?\b(?:com|por) ${PT_OTHERS}`,
      3,
    ],
    [w`\b${PT_ON}(?: adiante| em frente)? com ${PT_OTHERS}`, 3],
    [w`\bn[ãa]o (?:foi|foram|fomos|ter[áa] sido) (?:selecionad|aprovad|escolhid|classificad)`, 3],
    [w`\blamentamos (?:muito )?(?:em |por )?(?:lhe |te )?(?:informar|comunicar|dizer)`, 3],
    [
      w`\b(?:a vaga|o cargo|a posi[çc][ãa]o)\b (?:j[áa] )?(?:foi|est[áa]) (?:j[áa] )?(?:preenchid|encerrad|fechad)`,
      3,
    ],
    [
      w`\b(?:seu|o seu|sua|a sua) (?:perfil|experi[êe]ncia|curr[íi]culo|candidatura)\b (?:infelizmente )?n[ãa]o (?:est[áa] (?:alinhad|aderente|de acordo|compat[íi]vel)|atende|se encaixa|corresponde|[ée] (?:aderente|compat[íi]vel))`,
      3,
    ],
    [
      w`\b(?:outr[oa]s (?:candidat\p{L}*|perfis|profissionais)|outr[oa] (?:candidat[oa]|perfil|profissional|pessoa)) (?:cuj[oa]s? |que |com )[^.]{0,40}?\b(?:mais|melhor)\b`,
      3,
    ],
    [w`\bn[ãa]o foi bem[- ]sucedid`, 3],
    [w`\b(?:infelizmente|lamentavelmente)\b`, 1],
    [
      w`\bap[óo]s (?:uma )?(?:(?:cuidadosa|criteriosa|minuciosa|atenta) (?:an[áa]lise|avalia[çc][ãa]o|considera[çc][ãa]o|revis[ãa]o)|(?:an[áa]lise|avalia[çc][ãa]o|considera[çc][ãa]o|revis[ãa]o) (?:cuidadosa|criteriosa|minuciosa|detalhada|atenta))`,
      1,
    ],
    [w`\boutr[oa]s (?:candidat\p{L}*|perfis|profissionais)\b`, 1],
    [w`\bbanco de (?:talentos|curr[íi]culos)\b`, 1],
  ],
  offer: [
    [
      w`\b(?:prazer|alegria|satisfa[çc][ãa]o|felizes|contentes|animad[oa]s|honra)\b[^.]{0,20}?\b(?:em|de) (?:lhe |te )?(?:oferecer|fazer|apresentar|enviar|estender|formalizar|compartilhar)(?:-lhe|-te)? (?:a voc[êe] )?(?:uma|a|nossa|sua|esta) (?:proposta|oferta)\b`,
      3,
    ],
    [
      w`\b(?:oferecer|oferecemos|oferecer-lhe|oferecer-te)(?: a voc[êe]| formalmente)? (?:a vaga|o cargo|a posi[çc][ãa]o)\b`,
      3,
    ],
    [
      w`\b(?:sua|a sua|nossa) proposta (?:formal |oficial )?(?:de (?:trabalho|emprego|contrata[çc][ãa]o)|salarial)\b`,
      3,
    ],
    [
      w`\b(?:sua|a sua) (?:proposta|oferta)\b[^.]{0,30}?\b(?:em anexo|anexa|anexada|est[áa] pronta|est[áa] dispon[íi]vel)|\bsegue (?:(?:em anexo|anexa|abaixo) )?(?:a |sua |a sua |nossa )?(?:proposta|oferta|carta[- ]oferta)\b`,
      3,
    ],
    [
      w`\b(?:foi|voc[êe] foi|foste) (?:selecionad|aprovad|escolhid)[oa]${GA} (?:para (?:a vaga|o cargo|a posi[çc][ãa]o|a fun[çc][ãa]o|ocupar)|no processo seletivo)\b`,
      3,
    ],
    [
      w`\bbem[- ]vind[oa]s?${GA} (?:ao time|[àa] equipe|a bordo|ao nosso time|[àa] nossa equipe|[àa] fam[íi]lia)`,
      2,
    ],
  ],
  interview: [
    [
      w`\bconvid[\p{L}-]*${GA}(?: voc[êe])? (?:para|a) (?:(?:uma|um|a|o|sua|seu|nossa|nosso) )?(?:[\p{L}-]+ ){0,3}?${PT_TALK}\b`,
      3,
    ],
    [
      w`\b(?:agendar|marcar|agendarmos|marcarmos|confirmar|reservar|combinar|agende|marque|reserve|confirme)\b (?:(?:uma|um|a|o|sua|seu|nossa|nosso) )?(?:${PT_TALK}|hor[áa]rio)\b`,
      3,
    ],
    [
      w`\b(?:convite|confirma[çc][ãa]o|convoca[çc][ãa]o) (?:para|de|da) (?:(?:a|uma|sua) )?entrevista\b|\bentrevista marcada\b`,
      3,
    ],
    [w`\b(?:sua|a sua) entrevista (?:com|para|na|no|ser[áa]|est[áa]|foi|[ée]|acontecer[áa])\b`, 3],
    [
      w`\b(?:gostar[íi]amos|adorar[íi]amos|queremos|quer[íi]amos|gostaria|adoraria)\b (?:muito )?(?:de )?(?:conversar com voc[êe]|falar com voc[êe]|bater um papo|conhec[êe]-l[oa]|te conhecer|conhecer voc[êe]|conversar contigo|falar contigo|conhecer melhor)`,
      3,
    ],
    [
      w`\b(?:envie|informe|compartilhe|confirme|indique|mande|diga|passe|enviar|informar|compartilhar|confirmar|indicar)\b[^.]{0,20}?\b(?:sua|a sua) disponibilidade\b|\bqual (?:[ée]|seria) (?:a )?(?:sua|tua) disponibilidade\b|\bdisponibilidade (?:de hor[áa]rio )?para (?:(?:uma|a|um|o) )?${PT_TALK}\b`,
      3,
    ],
    [
      w`\b(?:escolha|selecione|reserve|agende|escolher|selecionar|reservar)\b (?:(?:um|o|seu|o seu|o melhor) )?(?:hor[áa]rio|dia e hor[áa]rio)\b`,
      3,
    ],
    [
      w`\b(?:selecionad|aprovad|classificad|convidad)[oa]${GA} (?:para|[àa]|a|na) (?:(?:a|o) )?(?:pr[óo]xim[oa]|segund[oa]|terceir[oa]|[úu]ltim[oa]|final|nova) (?:etapa|fase|rodada|entrevista)\b|\b(?:avan[çc]ou|avan[çc]a|passou|passa|seguiu|segue) (?:para|[àa]|a|na) (?:(?:a|o) )?(?:pr[óo]xim[oa]|segund[oa]|[úu]ltim[oa]|final|nova) (?:etapa|fase|rodada)\b`,
      3,
    ],
    [
      w`\b(?:entrevista (?:on-line|por v[íi]deo|por telefone|telef[ôo]nica|com (?:o gestor|a gestora|o rh|a lideran[çc]a|o time|a equipe)|comportamental|em grupo)|nova entrevista)\b`,
      2,
    ],
  ],
  assessment: [
    [
      w`\b(?:teste|avalia[çc][ãa]o|prova|exerc[íi]cio|question[áa]rio)s? (?:t[ée]cnic[oa]s?|online|on-line|de (?:l[óo]gica|conhecimentos?|ingl[êe]s|perfil|personalidade|programa[çc][ãa]o|c[óo]digo|racioc[íi]nio)|pr[áa]tic[oa]s?|comportamental|psicol[óo]gic[oa]|cognitiv[oa])\b|\bcase (?:t[ée]cnico|pr[áa]tico)\b`,
      3,
    ],
    [
      w`\b(?:realizar|responder|completar|concluir|fazer|resolver|realize|responda|conclua|fa[çc]a|resolva)\b (?:(?:o|a|um|uma|nosso|nossa|este|esta|seu|sua|breve|pequeno|pequena) )*(?:teste|desafio|prova|question[áa]rio|case|exerc[íi]cio)\b`,
      3,
    ],
    [
      w`\blink (?:do|da|para o|para a|de acesso ao|de acesso [àa]) (?:teste|avalia[çc][ãa]o|desafio|prova)\b`,
      3,
    ],
  ],
  applied: [
    [
      w`\b(?:obrigad[oa]|agradecemos)\b[^.]{0,20}?\b(?:por |pela |pelo |o |a )?(?:(?:se candidatar|candidatar-se|ter se candidatado|se inscrever|inscrever-se|participar (?:do|de nosso|do nosso) processo)\b|(?:sua|seu|o seu|a sua) (?:candidatura|inscri[çc][ãa]o|aplica[çc][ãa]o|curr[íi]culo|interesse (?:em|na|no|pela|pelo) (?:fazer parte|trabalhar|integrar|participar|nossa|nosso|vaga|esta|este|oportunidade)))`,
      3,
    ],
    [
      w`\b(?:recebemos|j[áa] recebemos|acabamos de receber|confirmamos o recebimento d[aoe]|registramos)\b (?:com sucesso )?(?:(?:a|o) )?(?:sua|seu|tua|teu) (?:candidatura|inscri[çc][ãa]o|aplica[çc][ãa]o|curr[íi]culo|cv)\b`,
      3,
    ],
    [
      w`\b(?:sua|seu|tua|teu) (?:candidatura|inscri[çc][ãa]o|aplica[çc][ãa]o|curr[íi]culo)\b(?: (?:para|[àa]|na|no|ao) [^.]{2,120}?)? (?:foi|j[áa] foi|est[áa]) (?:(?:enviad|recebid|registrad|realizad|conclu[íi]d|confirmad|efetuad|efetivad|feit)[oa]|com sucesso)`,
      3,
    ],
    [
      w`\b(?:candidatura|inscri[çc][ãa]o|aplica[çc][ãa]o) (?:recebida|enviada|realizada|confirmada|registrada|conclu[íi]da|efetuada|efetivada)\b|\bconfirma[çc][ãa]o de (?:candidatura|inscri[çc][ãa]o)\b`,
      3,
    ],
    [
      w`\b(?:voc[êe] se candidatou|candidatou-se|voc[êe] se inscreveu|inscreveu-se) (?:com sucesso|[àa] vaga|para a vaga|na vaga)`,
      3,
    ],
    [
      w`\b(?:sua|a sua|seu|o seu) (?:candidatura|inscri[çc][ãa]o|perfil|curr[íi]culo) (?:est[áa]|j[áa] est[áa]|segue|encontra-se|se encontra) (?:em an[áa]lise|sendo (?:analisad|avaliad)|em avalia[çc][ãa]o|em processo de)`,
      3,
    ],
  ],
};

// "Entretien" is also upkeep: "l'entretien de votre véhicule" never counts.
const FR_TALK = String.raw`(?:entretien(?! (?:de (?:votre|ton|ta|vos|la)|du|des)\b)|[ée]change|appel|rencontre|entrevue|rendez-vous|rdv|visio(?:conf[ée]rence)?)`;

const FR: Rules = {
  rejected: [
    [
      w`\b(?:pas|ne (?:pouvons|pourrons)(?: malheureusement)?) (?:(?:en mesure|possible) de |y )?(?:donner |de )?(?:une )?suite\b`,
      3,
    ],
    [
      w`\bn'(?:a|avez|as|ont|avons|ai) (?:malheureusement |donc )?pas (?:[ée]t[ée] )?(?:retenue?s?|s[ée]lectionn[ée]e?s?|choisie?s?|pr[ée]s[ée]lectionn[ée]e?s?|abouti)`,
      3,
    ],
    [
      w`\b(?:ne pas|ne pouvons pas|ne pourrons pas|pas pu) retenir (?:votre|ta)\b|\bne (?:retiendrons|retenons) pas (?:votre|ta)\b`,
      3,
    ],
    [
      w`\b(?:retenu|retenir|retenons|s[ée]lectionn[ée]r?|s[ée]lectionnons|choisi|choisir|privil[ée]gi[ée]r?|privil[ée]gions|poursuivre|poursuivons|poursuivi|continuer|continuons|opt[ée]r? pour|port[ée]r? notre choix sur|orient[ée]r? notre choix vers)\b(?: (?:le|notre) processus)?(?: avec)? (?:d'autres|un autre|une autre) (?:candidat|profil|candidature|personne)`,
      3,
    ],
    [
      w`\b(?:d'autres|un autre|une autre) (?:candidat\p{L}*|profils?|candidatures?)${GE}s? (?:dont|qui|plus|correspondant|davantage|mieux)\b[^.]{0,60}?\b(?:davantage|plus|mieux)\b`,
      3,
    ],
    [
      w`\b(?:au regret|regrettons|regrette|avons le regret|d[ée]sol[ée]e?s?) de (?:vous |te )?(?:informer|annoncer|faire part|indiquer|communiquer)\b|\b(?:sommes|suis) au regret\b|\bavons le regret\b`,
      3,
    ],
    [
      w`\b(?:le poste|l'offre|la position|le recrutement|ce poste|cette offre)\b (?:a (?:d[ée]j[àa] )?[ée]t[ée]|est (?:d[ée]sormais |d[ée]j[àa] |maintenant )?) ?(?:pourvue?|cl[ôo]tur[ée]e?|ferm[ée]e?)`,
      3,
    ],
    [
      w`\bne correspond(?:ait|ent|aient)? (?:pas|malheureusement pas|plus)\b(?: (?:tout [àa] fait|enti[èe]rement|exactement|pleinement|suffisamment))? (?:[àa]|aux|au|avec) (?:(?:nos|les|notre|ce|cette|la|le) |l')?(?:attentes|besoins|crit[èe]res|exigences|profil|poste|recherche)`,
      3,
    ],
    [
      w`\bpas (?:poursuivre|continuer|avancer|aller plus loin)\b|\b(?:poursuivrons|continuerons|irons) pas\b`,
      3,
    ],
    [w`\b(?:infructueuse|infructueux)\b`, 3],
    [w`\b(?:malheureusement|h[ée]las)\b`, 1],
    [
      w`\bapr[èe]s (?:une |un )?(?:(?:[ée]tude|analyse|examen|lecture) (?:attenti(?:ve|f)|approfondie?|minutieuse?|d[ée]taill[ée]e?)|m[ûu]re r[ée]flexion|(?:attentive|minutieuse) (?:[ée]tude|analyse))`,
      1,
    ],
    [w`\bd'autres (?:candidat\p{L}*|profils|candidatures)\b`, 1],
    [
      w`\b(?:conserver|conserverons|garder|garderons|gardons|conservons)\b[^.]{0,30}?\b(?:votre|ton) (?:cv|candidature|dossier|profil)\b|\bvivier\b`,
      1,
    ],
  ],
  offer: [
    [
      w`\b(?:heureux|heureuse|ravie?s?|plaisir|joie|fiers?|fi[èe]res?|enchant[ée]e?s?)\b[^.]{0,30}?\b(?:proposer|offrir)\b (?:officiellement |formellement )?(?:le poste|ce poste|la position|le r[ôo]le)\b`,
      3,
    ],
    [
      w`\b(?:heureux|heureuse|ravie?s?|plaisir|joie|fiers?|fi[èe]res?|enchant[ée]e?s?)\b[^.]{0,30}?\b(?:proposer|offrir|faire|adresser|transmettre|envoyer|soumettre|faire parvenir)\b (?:(?:une|notre|cette|votre) |l')(?:offre|proposition)\b(?! d'entretien| de rendez-vous)`,
      3,
    ],
    [
      w`\b(?:promesse d'embauche|lettre d'(?:offre|embauche|engagement)|proposition (?:formelle |officielle |[ée]crite )?d'embauche|offre d'embauche|offre (?:formelle|ferme))\b`,
      3,
    ],
    [
      w`\b(?:avez|as) [ée]t[ée] (?:retenue?|s[ée]lectionn[ée]e?|choisie?)${GE} (?:pour|au) (?:le poste|la position|le r[ôo]le|la fonction|poste)\b`,
      3,
    ],
    [w`\bbienvenue (?:dans (?:l'|notre )[ée]quipe|[àa] bord|parmi nous)`, 2],
  ],
  interview: [
    [
      w`\b(?:inviter|invitons|convier|convions|convie|convoquer|convoquons|convoque|invit(?:é|ée|és|ées)|convi(?:é|ée|és|ées)|convoqu(?:é|ée|és|ées))${GE} (?:[àa]|pour) (?:(?:un|une|le|la|votre|ton|notre|ce|cet) |l')?(?:[\p{L}'-]+ ){0,3}?${FR_TALK}|\binvite (?:à|pour) (?:(?:un|une|le|la|votre|ton|notre|ce|cet) |l')?(?:[\p{L}'-]+ ){0,3}?${FR_TALK}`,
      3,
    ],
    [
      w`\b(?:proposer|proposons|organiser|organisons|planifier|planifions|programmer|programmons|fixer|fixons|caler|calons|prendre|confirmer|confirmons|r[ée]server|r[ée]servez|r[ée]servons|choisir|choisissez)\b(?: avec (?:vous|toi))? (?:(?:un|une|le|la|votre|ton|notre) |l')?(?:(?:premier|court|bref|petit|nouvel|nouveau) )?${FR_TALK}`,
      3,
    ],
    [
      w`\b(?:invitation|convocation|confirmation|demande) (?:(?:[àa]|pour|de) (?:(?:un|une|votre|ton|le|la) |l')?|d')entretien\b|\bentretien (?:pr[ée]vu|programm[ée]|planifi[ée]|confirm[ée]|fix[ée]|cal[ée]|r[ée]serv[ée])`,
      3,
    ],
    [
      w`\b(?:votre|ton) entretien (?:avec|pour|chez|le|aura lieu|est|a [ée]t[ée]|se d[ée]roulera|se tiendra|de demain|du)\b`,
      3,
    ],
    [
      w`\b(?:aimerions|aimerais|aimerait|souhaiterions|souhaitons|souhaiterais|souhaiterait|voudrions|voudrais|voudrait|ravie?s? de|heureux de|heureuse de)\b (?:beaucoup |vivement )?(?:vous|te) (?:rencontrer|parler|appeler|t[ée]l[ée]phoner)\b|\b(?:aimerions|aimerais|aimerait|souhaiterions|souhaitons|souhaiterais|souhaiterait|voudrions|voudrais|voudrait|ravie?s? d'|heureux d'|heureuse d'|ravie?s? de|heureux de)\s?(?:[ée]changer|discuter|parler|nous entretenir|en savoir plus)\b[^.]{0,30}?\bavec (?:vous|toi)\b`,
      3,
    ],
    [
      w`\b(?:communiquer|indiquer|transmettre|envoyer|partager|donner|faire part de|confirmer|pr[ée]ciser|communiquez|indiquez|transmettez|envoyez|partagez|donnez|confirmez|pr[ée]cisez|communique|indique|transmets|envoie|partage|donne)\b[^.]{0,20}?\b(?:vos|tes) disponibilit[ée]s\b|\bquelles (?:sont|seraient) (?:vos|tes) disponibilit[ée]s\b|\bdisponibilit[ée]s? pour (?:(?:un|une|le|notre|votre) |l')?(?:entretien|[ée]change|appel|rendez-vous|visio|rencontre)\b`,
      3,
    ],
    [
      w`\b(?:choisir|choisissez|choisis|s[ée]lectionner|s[ée]lectionnez|r[ée]server|r[ée]servez|r[ée]serve)\b (?:(?:un|le|votre|ton) )?(?:cr[ée]neau|horaire)\b`,
      3,
    ],
    [
      w`\b(?:retenue?|s[ée]lectionn[ée]e?|pr[ée]s[ée]lectionn[ée]e?|qualifi[ée]e?|passez|passes|passe|passer|acc[ée]dez|acc[ée]der|avancez|avancer)${GE} (?:pour|[àa]|au) (?:(?:la|le) |l')?(?:prochaine (?:[ée]tape|phase)|[ée]tape suivante|phase suivante|deuxi[èe]me (?:[ée]tape|tour|entretien)|second (?:tour|entretien)|derni[èe]re [ée]tape|prochain tour|un (?:premier )?entretien|entretien)\b`,
      3,
    ],
    [
      w`\b(?:entretien (?:t[ée]l[ée]phonique|en visio(?:conf[ée]rence)?|vid[ée]o|en pr[ée]sentiel|technique|final|rh|individuel|physique|en ligne|de recrutement|d'embauche|avec (?:le|la|notre|un|une) (?:manager|responsable|directeur|directrice|[ée]quipe|rh))|(?:premier|second|deuxi[èe]me|dernier) entretien)\b`,
      2,
    ],
    [w`\b(?:entretiens?|entrevues?)\b`, 1],
  ],
  assessment: [
    [
      w`\b(?:tests?|[ée]valuations?|exercices?|cas pratiques?|[ée]tudes? de cas|questionnaires?) (?:techniques?|en ligne|de personnalit[ée]|de logique|d'aptitudes?|de comp[ée]tences|d'anglais|psychom[ée]triques?|de code|de programmation|de raisonnement|pratiques?|[àa] r[ée]aliser|[àa] domicile)\b`,
      3,
    ],
    [
      w`\b(?:r[ée]aliser|compl[ée]ter|passer|effectuer|remplir|r[ée]pondre [àa]|r[ée]alisez|compl[ée]tez|passez|effectuez|remplissez)\b (?:(?:le|la|un|une|ce|cette|notre|votre|ton|ta|court|courte|bref|br[èe]ve|petit) |l')*(?:tests?|exercice|questionnaire|cas pratique|[ée]tude de cas)\b`,
      3,
    ],
    [
      w`\blien (?:vers|du|pour|de|d'acc[èe]s) (?:(?:le|la|au|[àa] la) |l')?(?:test|[ée]valuation|exercice|questionnaire)\b`,
      3,
    ],
  ],
  applied: [
    [
      w`\b(?:merci|remercions|remercie)\b[^.]{0,25}?\b(?:pour|de) (?:votre|ta|ton) (?:candidature|postulation|int[ée]r[êe]t (?:pour|envers) (?:notre|nos|le|la|l'|ce|cette|rejoindre))`,
      3,
    ],
    [
      w`\b(?:merci|remercions|remercie)\b[^.]{0,25}?\bd'avoir (?:postul[ée]|candidat[ée]|soumis|envoy[ée]|transmis|d[ée]pos[ée]|pris le temps de postuler|r[ée]pondu [àa] notre (?:offre|annonce))`,
      3,
    ],
    [
      w`\b(?:merci|remercions|remercie)\b[^.]{0,25}?\bl'int[ée]r[êe]t que (?:vous|tu) (?:portez|avez port[ée]|manifestez|avez manifest[ée]|portes|as port[ée])`,
      3,
    ],
    [
      w`\b(?:avons|ai|a) (?:bien |correctement )?re[çc]u (?:votre|ta|ton) (?:candidature|cv|dossier|postulation)\b`,
      3,
    ],
    [
      w`\b(?:votre|ta) candidature\b(?: (?:pour|au poste de|au poste d'|[àa]|chez|au sein de) [^.]{2,120}?)? (?:a (?:bien )?[ée]t[ée]|est (?:bien )?) ?(?:re[çc]ue|envoy[ée]e|transmise|enregistr[ée]e|prise en compte|soumise|d[ée]pos[ée]e|valid[ée]e)\b`,
      3,
    ],
    [
      w`\b(?:candidature|postulation) (?:re[çc]ue|envoy[ée]e|enregistr[ée]e|confirm[ée]e|transmise|valid[ée]e)\b|\bconfirmation (?:de|d'envoi de) (?:(?:votre|ta) )?candidature\b|\baccus[ée] de r[ée]ception\b`,
      3,
    ],
    [
      w`\b(?:vous avez|tu as) (?:bien )?postul[ée] (?:avec succ[èe]s|au poste|[àa] l'offre|pour le poste|chez)\b`,
      3,
    ],
    [
      w`\b(?:votre|ta) candidature (?:est|sera|va [êe]tre) (?:en cours d'(?:examen|[ée]tude|analyse|traitement)|[àa] l'[ée]tude|[ée]tudi[ée]e|examin[ée]e|analys[ée]e|trait[ée]e|en cours de traitement)`,
      3,
    ],
  ],
};

const DE_TALK = `(?:gespr${AE}ch|vorstellungsgespr${AE}ch|bewerbungsgespr${AE}ch|interview|telefonat|kennenlernen|kennenlerngespr${AE}ch|video-?call|telefoninterview|videointerview|online-interview)`;

const DE: Rules = {
  rejected: [
    [
      w`\b(?:ihre|deine|eure|ihrer|deiner) (?:bewerbung|kandidatur)\b[^.]{0,60}?\bnicht (?:(?:weiter|l${AE}nger|weiterhin|mehr|n${AE}her) )?(?:ber${UE}cksichtig|verfolg|weiterverfolg|in betracht)`,
      3,
    ],
    [
      w`\b(?:sie|dich|euch) (?:(?:leider|im weiteren [\p{L}-]+|f${UE}r (?:die|diese) (?:stelle|position)) )*nicht (?:(?:weiter|l${AE}nger|weiterhin|mehr) )?ber${UE}cksichtig`,
      3,
    ],
    [
      w`\b(?:f${UE}r (?:(?:eine?n?|die|den) )?(?:andere[nr]?|weitere[nr]?) (?:kandidat|bewerber|person|profil)[\p{L}:*/]*|anderweitig) entschieden\b`,
      3,
    ],
    [
      w`\bentschieden,? (?:uns )?(?:mit|f${UE}r) (?:(?:eine?[nm]?|den|die) )?(?:anderen?|weiteren?) (?:kandidat|bewerber|profil|person)`,
      3,
    ],
    [w`\bnicht f${UE}r (?:sie|dich|euch) entschieden\b`, 3],
    [
      w`\b(?:eine |die )?absage (?:erteilen|geben|mitteilen|aussprechen)\b|\b(?:ihnen|dir|euch) (?:(?:leider|heute) )*(?:eine )?absage\b|\babsage (?:(?:auf|zu|bez${UE}glich|f${UE}r) (?:ihre|deine|eure)|ihrer|deiner) bewerbung`,
      3,
    ],
    [
      w`\b(?:keine|nicht die) (?:positive|positiven|erfreuliche|erfreulichen|gute|guten|bessere|besseren) (?:r${UE}ckmeldung|nachricht|nachrichten|antwort)`,
      3,
    ],
    [w`\bnicht (?:in die|f${UE}r die) (?:n${AE}chste|zweite|dritte|finale|letzte|engere[n]?)\b`, 3],
    [
      w`\bleider (?:m${UE}ssen|muss) (?:wir|ich) (?:ihnen|dir|euch) mitteilen|\b(?:ihnen|dir|euch) leider mitteilen|\bbedauer\p{L}*,? (?:ihnen|dir|euch) mitteilen`,
      3,
    ],
    [
      w`\b(?:stelle|position|vakanz|rolle)\b (?:wurde|ist) (?:(?:bereits|inzwischen|mittlerweile|schon) )?(?:anderweitig )?(?:besetzt|vergeben)\b`,
      3,
    ],
    [
      w`\b(?:profil|qualifikation\p{L}*|erfahrung\p{L}*|hintergrund)\b (?:passt|passen|entspricht|entsprechen|deckt sich|decken sich) (?:(?:leider|aktuell|derzeit) )*nicht\b`,
      3,
    ],
    [
      w`\b(?:bewerbung|kandidatur)\b (?:war|ist) (?:(?:leider|diesmal) )*nicht erfolgreich\b|\berfolglos\b`,
      3,
    ],
    [w`\b(?:leider|bedauerlicherweise)\b`, 1],
    [
      w`\bnach (?:sorgf${AE}ltiger|eingehender|reiflicher|gr${UE}ndlicher|intensiver|genauer) (?:pr${UE}fung|${UE}berlegung|abw${AE}gung|durchsicht|sichtung|betrachtung)`,
      1,
    ],
    [w`\b(?:andere|anderen|weitere|weiteren) (?:kandidat|bewerber)[\p{L}:*/]*`, 1],
    [w`\b(?:talent-?pool|bewerberpool|in evidenz)\b`, 1],
    [w`\babsage\b`, 1],
  ],
  offer: [
    [
      w`\b(?:ihnen|dir|euch) (?:(?:hiermit|gerne|gern|heute) )*(?:ein|das|unser)\b[^.]{0,30}?\b(?:vertragsangebot|arbeitsvertragsangebot|jobangebot|arbeitsangebot|angebot)\b[^.]{0,80}?\b(?:machen|unterbreiten|zukommen|senden|schicken|vorlegen|${UE}bermitteln|${UE}bersenden)\b`,
      3,
    ],
    [
      w`\b(?:ihnen|dir|euch) (?:(?:hiermit|gerne|gern) )*(?:die|diese) (?:stelle|position|rolle)\b[^.]{0,60}?\banbieten\b`,
      3,
    ],
    [
      w`\b(?:vertragsangebot|angebotsschreiben|arbeitsvertragsangebot)\b|\banbei\b[^.]{0,40}?\b(?:arbeitsvertrag|vertragsangebot|vertragsentwurf)|\b(?:ihr|dein) (?:arbeitsvertrag|vertragsentwurf)\b[^.]{0,20}?\b(?:im anhang|anbei|beigef${UE}gt|liegt bei)`,
      3,
    ],
    [w`\b(?:ihnen|dir|euch) (?:(?:heute|hiermit|gerne|gern) )*(?:eine|die) zusage\b`, 3],
    [w`(?<!nicht )\bf${UE}r (?:sie|dich|euch) entschieden\b`, 3],
    [w`\bwillkommen (?:im team|an bord|in unserem team)`, 2],
  ],
  interview: [
    [
      w`\beinladung (?:zu[mr]?|f${UE}r) (?:(?:einem|einer|ein|einen|dem|den|unserem|ihrem|deinem) )?(?:[\p{L}-]+ ){0,2}?${DE_TALK}`,
      3,
    ],
    [
      w`\b(?:sie|dich|euch) (?:(?:gerne|gern|herzlich|hiermit|nun|daher|deshalb|jetzt|sehr) )*(?:zu|zum|zur) (?:(?:einem|einer|unserem|unserer|dem|der|einen) )?(?:[\p{L}-]+ ){0,3}?${DE_TALK}`,
      3,
    ],
    [
      w`\b(?:termin|gespr${AE}chstermin|interviewtermin)\b (?:(?:f${UE}r|zu) (?:ein|das|einen|den|einem|dem) [\p{L}-]+ )?(?:zu )?(?:vereinbaren|ausmachen|abstimmen|buchen|best${AE}tigen|festlegen|finden|planen|koordinieren)\b`,
      3,
    ],
    [
      w`\b(?:vereinbaren|buchen|w${AE}hlen|best${AE}tigen|vereinbare|buche|buch|w${AE}hle|best${AE}tige)\b (?:(?:sie|du) )?(?:[\p{L}-]+ ){0,4}?(?:(?:einen|den|ihren|deinen) )?(?:termin|zeitfenster|zeitslot|slot|gespr${AE}chstermin|interviewtermin)\b`,
      3,
    ],
    [
      w`\b(?:ihr|dein|euer|ihres|deines) (?:vorstellungsgespr${AE}ch|interview|gespr${AE}ch|telefoninterview|videointerview|kennenlerngespr${AE}ch|bewerbungsgespr${AE}ch)(?:e?s)? (?:am|mit|bei|f${UE}r|ist|wurde|findet|beginnt|wird)\b`,
      3,
    ],
    [
      w`\b(?:interview|gespr${AE}chs|vorstellungsgespr${AE}chs|bewerbungsgespr${AE}chs)termin|\bbest${AE}tigung (?:ihres|deines|des|zum|zu ihrem|zu deinem) (?:vorstellungsgespr${AE}ch|interview|gespr${AE}ch)|\b(?:vorstellungsgespr${AE}ch|gespr${AE}ch)\b (?:ist |wurde )?(?:best${AE}tigt|vereinbart|geplant|terminiert|angesetzt)\b`,
      3,
    ],
    [
      w`\b(?:w${UE}rden|m${OE}chten|m${OE}chte|w${UE}rde|wollen)\b (?:sie|dich|euch) (?:[\p{L}-]+ ){0,5}?kennenlernen\b|\b(?:w${UE}rden|m${OE}chten|m${OE}chte|w${UE}rde)\b (?:(?:gerne|gern) )?mit (?:ihnen|dir|euch) (?:\p{L}+ ){0,3}?(?:sprechen|telefonieren|austauschen|ein gespr${AE}ch f${UE}hren)\b`,
      3,
    ],
    [
      w`\b(?:teilen|nennen|senden|schicken|geben|mitteilen|lassen|nenne|teile|schicke|sende|gib)\b[^.]{0,30}?\b(?:ihre|deine|eure|einige|m${OE}gliche|passende) (?:verf${UE}gbarkeit\p{L}*|terminvorschl${AE}ge|zeitfenster|termine|zeiten|zeitslots)\b|\bverf${UE}gbarkeit\p{L}* f${UE}r (?:ein|einen|das|den) (?:[\p{L}-]+ )?(?:gespr${AE}ch|interview|telefonat|call|termin|kennenlern\p{L}*)|\bwann (?:h${AE}tten|haben|w${AE}ren|hast|h${AE}ttest|w${AE}rst|passt es) (?:sie|du|ihnen|dir) (?:zeit|am besten)\b`,
      3,
    ],
    [
      w`\bin die (?:n${AE}chste|zweite|dritte|finale|letzte) (?:runde|phase|stufe|auswahlrunde|gespr${AE}chsrunde|interviewrunde)\b|\bf${UE}r die (?:n${AE}chste|zweite|finale|letzte) (?:runde|phase|stufe|auswahlrunde)\b[^.]{0,30}?\b(?:ausgew${AE}hlt|eingeladen|vorgesehen|qualifiziert)\b`,
      3,
    ],
    [
      w`\b(?:(?:pers${OE}nlich|telefonisch|virtuell|technisch|erst|zweit|kurz)(?:e[nmrs]?)? (?:gespr${AE}ch|interview|vorstellungsgespr${AE}ch|kennenlernen|telefonat)|telefoninterview|videointerview|kennenlerngespr${AE}ch)\b`,
      2,
    ],
    [w`\b(?:vorstellungsgespr${AE}ch|bewerbungsgespr${AE}ch)\p{L}*`, 1],
  ],
  assessment: [
    [
      w`\b(?:online-?assessment|online-?test|eignungstest|einstufungstest|pers${OE}nlichkeitstest|leistungstest|f${AE}higkeitstest|wissenstest|programmieraufgabe|programmiertest|coding-?challenge|probeaufgabe|testaufgabe|arbeitsprobe|logiktest|sprachtest|assessment-?center)\b`,
      3,
    ],
    [
      w`\b(?:den|das|die|einen|ein|eine|unseren|unser|unsere|diesen|dieses|diese|folgenden|folgende)\b (?:[\p{L}-]+ ){0,2}?(?:test|assessment|eignungstest|online-?test|online-?assessment|fragebogen|challenge|coding-?challenge|testaufgabe|probeaufgabe)\b.{0,60}?\b(?:zu )?(?:absolvieren|durchf${UE}hren|bearbeiten|ausf${UE}llen|abschlie${SS}en|l${OE}sen|machen)\b`,
      3,
    ],
    [
      w`\blink zu[mr]? (?:[\p{L}-]+ )?(?:test|assessment|online-?test|online-?assessment|eignungstest|fragebogen)\b`,
      3,
    ],
  ],
  applied: [
    [
      w`\b(?:dank|danke|bedanken uns|bedanke mich)\b[^.]{0,20}?\bf${UE}r (?:ihre|deine|eure) (?:online-?)?(?:bewerbung|kandidatur)\b`,
      3,
    ],
    [
      w`\b(?:dank|danke|bedanken uns|bedanke mich)\b[^.]{0,20}?\bf${UE}r (?:ihr|dein|euer) interesse an (?:unserem|unserer|unseren|der|dem|den|einer|einem|uns|unser|diesem|dieser)\b`,
      3,
    ],
    [
      w`\b(?:dank|danke)\b[^.]{0,10}?\b(?:dass|da${SS}) (?:sie|du) (?:sich|dich)\b[^.]{0,80}?\bbeworben\b`,
      3,
    ],
    [
      w`\b(?:ihre|deine|eure) (?:online-?)?bewerbung\b(?: (?:f${UE}r|als|auf|um|bei|zur?) [^.]{2,120}?)? (?:(?:ist|wurde) (?:(?:bei uns|erfolgreich|gut|soeben|heute) )*(?:(?:an|bei) [^.]{2,80}? )?(?:eingegangen|angekommen|${UE}bermittelt|versendet|versandt|gesendet|eingereicht|${UE}bertragen|abgeschickt|erhalten|registriert)|erhalten|bekommen)\b`,
      3,
    ],
    [
      w`\b(?:eingangsbest${AE}tigung|bewerbungseingang|bewerbungsbest${AE}tigung)\b|\bbewerbung (?:eingegangen|erhalten|best${AE}tigt|${UE}bermittelt|versendet|abgeschickt|erfolgreich)\b|\bbest${AE}tigung (?:ihrer|deiner|eurer) (?:online-?)?bewerbung\b`,
      3,
    ],
    [w`\b(?:haben sich|hast dich|habt euch)\b[^.]{0,100}?\bbeworben\b`, 3],
    [
      w`\b(?:ihre|deine|eure) (?:bewerbung|unterlagen|bewerbungsunterlagen)\b (?:wird|werden|befindet sich|befinden sich) (?:(?:derzeit|aktuell|gerade|momentan|nun|jetzt) )?(?:gepr${UE}ft|in pr${UE}fung|in bearbeitung|bearbeitet|gesichtet|durchgesehen|in der pr${UE}fung)\b`,
      3,
    ],
  ],
};

const merged = (kind: Scored): readonly Rule[] => [ES, PT, FR, DE].flatMap((lang) => lang[kind]);

export const LANG_RULES: Rules = {
  rejected: merged("rejected"),
  offer: merged("offer"),
  interview: merged("interview"),
  assessment: merged("assessment"),
  applied: merged("applied"),
};

// Spanish, Portuguese, French and German for "if you're shortlisted, we'll be in touch".
export const LANG_MAYBE: readonly RegExp[] = [
  w`\b(?:si|en caso (?:de )?(?:que )?|cuando|una vez que|en cuanto|tan pronto (?:como )?|siempre que|hasta que|a menos que|despu[ée]s de que)\b[^.]{0,80}?\b(?:t[úu]|tus?|usted|sus?|te|le|nosotros|nuestr[oa]s?|equipo|seleccionad\p{L}*|preseleccionad\p{L}*|elegid\p{L}*|perfil|encaj\p{L}*|coincid\p{L}*|ajust\p{L}*|cumpl\p{L}*|avanz\p{L}*)\b`,
  w`\b(?:te|le|les|los|las|la|lo) (?:contactaremos|contactar[áa]n?|llamaremos|escribiremos|avisaremos|informaremos|comunicaremos|responderemos|notificaremos)\b|\bnos (?:pondremos|comunicaremos|contactaremos|pondr[íi]amos|comunicar[íi]amos)\b|\b(?:pondremos|pondr[áa]n?|estaremos|entraremos) en contacto\b|\b(?:podr[íi]amos|podremos|vamos a|volveremos a) (?:contactar(?:te|le|les)?|ponernos en contacto|escribirte|escribirle|llamarte|llamarle)\b|\bser[áa]s? contactad[oa]\b|\b(?:revisaremos|evaluaremos|analizaremos|estudiaremos)\b`,
  w`\b(?:caso (?=voc[êe]|vc|seu|sua|o seu|a sua|haja|tenha|tenhamos|seja|sejam|n[ãa]o|surja|surjam|avance|o perfil|a candidatura|a equipe|o time)|quando|assim que|logo que|uma vez que|at[ée] que|a menos que|a n[ãa]o ser que|na hip[óo]tese de|no caso de)[^.]{0,80}?\b(?:voc[êe]|vc|seus?|suas?|te|n[óo]s|nossos?|nossas?|equipe|time|selecionad\p{L}*|aprovad\p{L}*|perfil|qualificad\p{L}*|encaix\p{L}*|adequ\p{L}*|atend\p{L}*|avan[çc]\p{L}*)\b`,
  w`(?<![\p{L}-])(?<!(?:por|para|de|ao|em|que|n[ãa]o|voc[êe]|j[áa]|ela|ele|lhe|me|nos) )se (?:voc[êe]|vc|o seu|a sua|seus?|suas?|for|forem|formos|houver|tiver|tivermos|o perfil|o candidato|a candidatura|a equipe|o time|nós|passar|avan[çc]ar|avan[çc]armos|aprovad\p{L}*|selecionad\p{L}*|surgir|surgirem|interessar|quiser|precisar|desejar|identificarmos)\b`,
  w`\b(?:entraremos|entrar[ãa]o|entrarei|vamos entrar|iremos entrar|poderemos entrar|podemos entrar) em contato\b|\bretornaremos\b|\bser[áa] (?:contatad|chamad|convocad|comunicad|avisad)\p{L}*|\b(?:te|lhe) (?:avisaremos|informaremos|chamaremos|contataremos|comunicaremos)\b|\bdaremos (?:um )?retorno\b|\b(?:analisaremos|avaliaremos|revisaremos)\b`,
  w`\b(?:si|s'ils?|au cas o[ùu]|dans le cas o[ùu]|lorsque|lorsqu'|quand|d[èe]s que|d[èe]s qu'|une fois que|une fois qu'|jusqu'[àa] ce que|jusqu'[àa] ce qu'|[àa] moins que|[àa] condition que|sous r[ée]serve|pour peu que)\b[^.]{0,80}?\b(?:vous|votre|vos|tu|ton|ta|tes|nous|notre|nos|l'[ée]quipe|retenue?s?|s[ée]lectionn[ée]e?s?|pr[ée]s[ée]lectionn[ée]e?s?|profil|correspondez|correspond [àa]|qualifi[ée]e?s?|ils?)\b`,
  w`\b(?:vous|te) (?:recontacterons|contacterons|rappellerons|tiendrons inform\p{L}*|informerons|ferons signe|r[ée]pondrons|recontactera|contactera|recontacteront|contacteront)\b|\b(?:reviendrons|reviendra|reviendront) (?:(?:rapidement|tr[èe]s rapidement|prochainement|tr[èe]s vite|vite|au plus vite|tr[èe]s prochainement) )?vers (?:vous|toi)\b|\b(?:manquerons pas de|allons) revenir vers (?:vous|toi)\b|\b(?:serez|seras) (?:re)?contact[ée]\p{L}*|\breprendrons contact\b|\b(?:[ée]tudierons|examinerons|analyserons)\b`,
  w`\b(?:falls|wenn|sofern|sobald|ob|soweit|insofern|es sei denn|im falle?|vorausgesetzt|sollten?)\b[^.]{0,80}?\b(?:sie|ihr|ihre[nmrs]?|du|dein|deine[nmrs]?|dich|dir|wir|uns|unser|unsere[nmrs]?|ausgew${AE}hlt|qualifiziert|profil|passt|passen|${UE}berzeug\p{L}*)\b`,
  w`\b(?:werden|wird|werde) (?:uns|sich|mich)\b[^.]{0,40}?\bmelden\b|\bmelden (?:uns|mich|sich) (?:(?:zeitnah|in k${UE}rze|schnellstm${OE}glich|bald|umgehend|baldm${OE}glichst|gerne|wieder) )*(?:bei (?:ihnen|dir|euch)|wieder)\b|\bwir melden uns\b|\bwerden (?:sie|dich|euch) (?:\p{L}+ ){0,3}?kontaktieren\b|\b(?:werden|wird) (?:ihnen|dir|euch) (?:\p{L}+ ){0,3}?(?:r${UE}ckmeldung|bescheid) geben\b|\bwerden (?:ihre|deine|eure) (?:bewerbung|unterlagen) (?:\p{L}+ ){0,3}?pr${UE}fen\b`,
];

export const LANG_ALERT = w`\b(?:alertas? de (?:empleo|trabajo|vacantes?|ofertas)|(?:ofertas?|empleos?|vacantes?|trabajos?)(?: de (?:empleo|trabajo))? (?:para ti|para usted|recomendad[oa]s|que te (?:pueden|podr[íi]an) interesar|que coinciden|similares|sugerid[oa]s)|nuev[oa]s (?:ofertas|vacantes|empleos)|\d+ (?:nuev[oa]s )?(?:ofertas|vacantes|empleos)|est[áa]n? contratando|qui[ée]n(?:es)? (?:ha |han )?(?:visto|vieron|visitado) tu perfil|post[úu]late (?:ya|ahora)|bolet[íi]n|alertas? de vagas?|vagas? (?:para voc[êe]|recomendadas|sugeridas|que combinam|parecidas|similares|em destaque|compat[íi]veis)|novas vagas|\d+ (?:novas )?vagas|est[ãa]o contratando|quem (?:viu|visualizou) (?:o )?seu perfil|candidate-se (?:j[áa]|agora)|oportunidades para voc[êe]|alertes?[- ](?:emploi|offres?)|alerte d'emploi|(?:offres?|emplois?)(?: d'emploi)? (?:pour (?:vous|toi)|qui (?:pourraient|peuvent|pourrait) (?:vous |t')int[ée]resser|recommand[ée]e?s|similaires|correspondant [àa] (?:votre|ton) profil|sugg[ée]r[ée]e?s)|nouvelles offres|\d+ (?:nouvelles )?offres|recrute(?:nt)? (?:actuellement|en ce moment)|qui a consult[ée] (?:votre|ton) profil|postulez (?:d[èe]s maintenant|maintenant)|jobs? f${UE}r (?:dich|sie)|neue (?:stellenangebote|jobs|stellen|jobangebote)|\d+ neue (?:jobs|stellen|stellenangebote|jobangebote)|job-?alarm|jobagent|stellenalarm|suchauftrag|passende (?:jobs|stellen|stellenangebote|jobangebote)|empfohlene (?:jobs|stellen|stellenangebote)|${AE}hnliche (?:jobs|stellen|stellenangebote)|stellt (?:(?:gerade|jetzt|aktuell) )?ein|wer hat (?:ihr|dein) profil (?:angesehen|besucht)|profilaufrufe|jetzt bewerben)\b`;

export const LANG_UNSUBSCRIBE = w`\b(?:darte de baja|darse de baja|dar de baja|date de baja|cancelar (?:(?:la|tu|su) )?suscripci[óo]n|anular (?:la )?suscripci[óo]n|descadastr\p{L}*|cancelar (?:a )?(?:inscri[çc][ãa]o|assinatura)|d[ée]sinscri\p{L}*|d[ée]sabonn\p{L}*|abmelden|abbestellen|abmeldung)\b`;

export const LANG_YOURS = w`\b(?:(?:tu|su|sua) (?:postulaci[óo]n|solicitud|candidatura)|(?:votre|ta) candidature|(?:ihre|deine) bewerbung)\b`;
