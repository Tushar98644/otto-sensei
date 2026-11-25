import { describe, expect, it } from "vitest";
import { classify, isAlert } from "./classify";
import { extractJob } from "./extract";
import { parseSender } from "./text";

type Read = ReturnType<typeof classify> | "alert";
type Sample = [name: string, subject: string, body: string, kind: Read];

function read(subject: string, body: string, listed = false): Read {
  const kind = classify(subject, body);
  return kind === "unknown" && isAlert(subject, body, listed) ? "alert" : kind;
}

const SPANISH: Sample[] = [
  [
    "applied: thanks, interview only if the profile fits (tú)",
    "Gracias por postularte a Lumen Labs",
    `¡Hola Ana!

Gracias por postularte al puesto de Analista de Datos en Lumen Labs. Hemos recibido tu postulación y nuestro equipo la revisará en los próximos días.

Si tu perfil coincide con lo que buscamos, te contactaremos para agendar una entrevista con el equipo.

Saludos,
Equipo de Talento de Lumen Labs`,
    "applied",
  ],
  [
    "applied: application received (usted)",
    "Confirmación de su postulación - Ingeniero de Software",
    `Estimado Carlos Ramírez:

Le confirmamos que su solicitud para el puesto de Ingeniero de Software (R-10234) ha sido recibida correctamente.

Nuestro equipo de Recursos Humanos revisará su candidatura. En caso de que su perfil se ajuste a los requisitos de la vacante, nos pondremos en contacto con usted para coordinar una entrevista.

Atentamente,
Banco Andino - Adquisición de Talento`,
    "applied",
  ],
  [
    "applied: si eres seleccionado, te contactaremos",
    "¡Recibimos tu postulación!",
    "Gracias por postularte. Si eres seleccionado, te contactaremos para una entrevista.",
    "applied",
  ],
  [
    "applied: LinkedIn sent",
    "Ana, tu solicitud se ha enviado a Orbit Analytics",
    "Tu solicitud se ha enviado a Orbit Analytics\n\nCientífico de Datos\nOrbit Analytics · Bogotá",
    "applied",
  ],
  [
    "interview: invitation and availability (tú)",
    "Lumen Labs - Próximos pasos para Analista de Datos",
    `¡Hola Ana!

¡Buenas noticias! Al equipo le encantó tu perfil y nos gustaría invitarte a una entrevista por videollamada de 30 minutos con nuestra Head of Data.

Por favor, compártenos tu disponibilidad para esta semana.

¡Saludos!
Mariana, Talento Lumen Labs`,
    "interview",
  ],
  [
    "interview: confirmed time (usted)",
    "Entrevista - Ingeniero de Software",
    `Estimado Carlos:

Su entrevista con el gerente de Ingeniería quedó programada para el martes 1 de diciembre a las 10:00 (hora de Ciudad de México).

La reunión será por Microsoft Teams. Le pedimos conectarse cinco minutos antes.

Atentamente,
Banco Andino`,
    "interview",
  ],
  [
    "interview: next stage, asks availability (Spain)",
    "Tu candidatura en Nubia Tech",
    `Hola Javier:

Enhorabuena, has pasado a la siguiente fase del proceso de selección para el puesto de Desarrollador Backend.

La siguiente fase es una charla técnica con dos personas del equipo. ¿Cuál es tu disponibilidad la próxima semana?

Un saludo,
Lucía (People Team)`,
    "interview",
  ],
  [
    "rejected: polite thanks, then no (tú)",
    "Actualización sobre tu postulación a Lumen Labs",
    `Hola Ana:

Gracias por tu interés en Lumen Labs y por el tiempo que dedicaste a nuestro proceso.

Lamentablemente, no continuaremos con tu postulación para el puesto de Analista de Datos. Decidimos avanzar con otros candidatos cuyo perfil se ajusta más a lo que buscamos en este momento.

Guardaremos tu CV en nuestra base de datos y, si surge una vacante acorde a tu perfil, te contactaremos.

Te deseamos mucho éxito,
Equipo de Talento de Lumen Labs`,
    "rejected",
  ],
  [
    "rejected: lamentamos informarle (usted)",
    "Proceso de selección - Ingeniero de Software",
    `Estimado Carlos Ramírez:

Agradecemos su participación en el proceso de selección para la vacante de Ingeniero de Software.

Lamentamos informarle que, después de una cuidadosa evaluación, su candidatura no ha sido seleccionada para continuar en el proceso.

Cordialmente,
Banco Andino`,
    "rejected",
  ],
  [
    "offer: carta oferta (tú)",
    "Oferta de trabajo - Analista de Datos",
    `¡Felicidades, Ana!

Nos complace ofrecerte el puesto de Analista de Datos en Lumen Labs. Adjunto encontrarás la carta oferta con el salario, los beneficios y la fecha de inicio propuesta.

¡Bienvenida al equipo!`,
    "offer",
  ],
  [
    "offer: formal offer (usted)",
    "Propuesta laboral",
    "Estimado Carlos: Nos es grato extenderle una oferta formal para ocupar la posición de Gerente de Proyectos en Banco Andino. Le agradeceremos confirmar su aceptación antes del viernes.",
    "offer",
  ],
  [
    "assessment: technical test",
    "Siguiente paso: prueba técnica",
    "Hola Ana: Como siguiente paso, te invitamos a completar una prueba técnica en HackerRank. Tienes 72 horas para resolverla desde que recibas el enlace.",
    "assessment",
  ],
  [
    "alert: job alert",
    "Nuevas ofertas de empleo para ti",
    "Alerta de empleo: Analista de datos en Bogotá\n\nAnalista de Datos Jr.\nFinanzaPlus · Bogotá\n\nCientífico de Datos\nRappi · Bogotá\n\nVer todas las ofertas",
    "alert",
  ],
  [
    "unknown: lamentablemente alone",
    "Cambio de planes",
    "Hola Ana, lamentablemente no podré ir a la cena del viernes. ¿Lo dejamos para la próxima semana?",
    "unknown",
  ],
  [
    "unknown: entrevista alone",
    "Mira esto",
    "Te paso la entrevista que le hicieron a Shakira en El País, ¡está buenísima!",
    "unknown",
  ],
];

const PORTUGUESE: Sample[] = [
  [
    "applied: Gupy, interview only if selected",
    "Candidatura realizada com sucesso - Analista de Dados",
    `Olá, João!

Sua candidatura para a vaga de Analista de Dados na Acme Brasil foi realizada com sucesso.

Agora, nosso time de Recrutamento vai analisar o seu perfil. Caso você seja selecionado(a) para a próxima etapa, entraremos em contato para agendar uma entrevista.

Boa sorte!
Equipe Acme Brasil`,
    "applied",
  ],
  [
    "applied: received, talent pool mention",
    "Recebemos sua candidatura",
    `Prezada Mariana,

Agradecemos o seu interesse em fazer parte do time da Nuvem Pagamentos. Recebemos a sua candidatura para a posição de Engenheira de Software e ela já está em análise.

Manteremos seu currículo em nosso banco de talentos.`,
    "applied",
  ],
  [
    "interview: convite and availability",
    "Convite para entrevista - Analista de Dados",
    `Olá, João! Tudo bem?

Gostaríamos de convidá-lo(a) para uma entrevista com a nossa gestora de Dados. A conversa será por Google Meet e deve durar cerca de 45 minutos.

Por favor, nos envie sua disponibilidade para os próximos dias.

Abraços,
Camila - Recrutamento Acme Brasil`,
    "interview",
  ],
  [
    "interview: approved for the next stage",
    "Atualização do processo seletivo",
    "Oi, Mariana! Temos uma ótima notícia: você foi aprovada para a próxima etapa do processo seletivo! Em breve a recrutadora vai te mandar o convite.",
    "interview",
  ],
  [
    "interview: scheduled",
    "Entrevista agendada",
    "Olá, Pedro. Sua entrevista com o time de Produto está confirmada para quinta-feira, 3 de dezembro, às 14h (horário de Brasília).",
    "interview",
  ],
  [
    "rejected: polite thanks, then no",
    "Retorno sobre sua candidatura",
    `Olá, João,

Agradecemos o seu interesse em fazer parte da Acme Brasil e o tempo dedicado ao nosso processo seletivo.

Após uma análise cuidadosa, infelizmente não seguiremos com a sua candidatura para a vaga de Analista de Dados neste momento. Optamos por seguir com outros candidatos cujo perfil está mais alinhado aos requisitos da vaga.

Seu currículo continuará em nosso banco de talentos para futuras oportunidades.

Um abraço,
Equipe Acme Brasil`,
    "rejected",
  ],
  [
    "rejected: Gupy, not aligned",
    "Processo seletivo - Engenheira de Software",
    "Oi, Mariana! Queremos agradecer pela sua participação. Neste momento, seu perfil não está aderente aos requisitos da vaga e você não foi aprovada para a próxima etapa. Desejamos sucesso!",
    "rejected",
  ],
  [
    "offer: carta-oferta",
    "Proposta de trabalho - Desenvolvedor Backend",
    "Olá, Pedro! Temos o prazer de oferecer a você a vaga de Desenvolvedor Backend na Nuvem Pagamentos. Segue em anexo a carta-oferta com salário, benefícios e data de início.",
    "offer",
  ],
  [
    "offer: approved in the selection process",
    "Parabéns!",
    "Prezada Mariana, é com grande alegria que informamos que você foi aprovada no processo seletivo para o cargo de Engenheira de Software.",
    "offer",
  ],
  [
    "assessment: technical test",
    "Próxima etapa: teste técnico",
    "Olá, João! O próximo passo é um teste técnico online. Responda o desafio em até 3 dias pelo link enviado pela plataforma.",
    "assessment",
  ],
  [
    "alert: recommended jobs",
    "Vagas recomendadas para você",
    "Encontramos 12 novas vagas que combinam com o seu perfil:\n\nAnalista de Dados Pleno\nItaú · São Paulo\n\nCientista de Dados\nNubank · Remoto\n\nCandidate-se agora",
    "alert",
  ],
  [
    "unknown: infelizmente alone",
    "Almoço",
    "Oi! Infelizmente não vou conseguir ir ao almoço amanhã, podemos remarcar?",
    "unknown",
  ],
];

const FRENCH: Sample[] = [
  [
    "applied: thanks, interview only if retained (vous)",
    "Votre candidature chez Maison Lumière",
    `Bonjour Claire,

Nous vous remercions pour votre candidature au poste de Chef de projet digital et pour l'intérêt que vous portez à Maison Lumière.

Notre équipe va étudier votre profil avec attention. Si votre candidature est retenue, nous vous contacterons afin de planifier un entretien.

Bien cordialement,
L'équipe Recrutement`,
    "applied",
  ],
  [
    "applied: LinkedIn sent",
    "Claire, votre candidature a été envoyée à Atelier Nova",
    "Votre candidature a été envoyée à Atelier Nova\n\nDéveloppeuse Front-end\nAtelier Nova · Lyon",
    "applied",
  ],
  [
    "applied: startup (tu)",
    "Merci pour ta candidature !",
    "Salut Hugo, merci d'avoir postulé chez Pixelle ! On a bien reçu ta candidature pour le poste de Product Designer. On revient vers toi très vite.",
    "applied",
  ],
  [
    "interview: invitation and availability (vous)",
    "Invitation à un entretien - Chef de projet digital",
    `Bonjour Claire,

Suite à l'étude de votre candidature, nous avons le plaisir de vous inviter à un premier entretien téléphonique avec notre responsable marketing.

Pourriez-vous nous communiquer vos disponibilités pour la semaine prochaine ?

Bien cordialement,
Sophie Martin - Maison Lumière`,
    "interview",
  ],
  [
    "interview: pick a slot (tu)",
    "On aimerait te rencontrer !",
    "Hello Hugo ! Ton profil nous a beaucoup plu et on aimerait échanger avec toi pendant 30 minutes. Choisis le créneau qui te convient dans l'agenda partagé.",
    "interview",
  ],
  [
    "interview: convocation",
    "Convocation",
    "Madame, Nous avons le plaisir de vous convier à un entretien dans nos locaux le mardi 1er décembre 2026 à 10h00. Votre entretien se déroulera avec Mme Durand, directrice des ressources humaines.",
    "interview",
  ],
  [
    "rejected: polite thanks, then no (vous)",
    "Votre candidature au poste de Chef de projet digital",
    `Bonjour Claire,

Nous vous remercions pour l'intérêt que vous portez à Maison Lumière et pour le temps consacré à votre candidature.

Après une étude attentive de votre dossier, nous sommes au regret de vous informer que nous ne pouvons pas y donner une suite favorable. Nous avons en effet retenu un autre profil dont l'expérience correspond davantage à nos besoins.

À l'avenir, si un poste correspondant à votre profil se libère, nous reviendrons vers vous.

Bien cordialement,
L'équipe Recrutement`,
    "rejected",
  ],
  [
    "rejected: other candidates (tu)",
    "Ta candidature chez Pixelle",
    "Salut Hugo, merci encore pour ta candidature et pour le temps passé avec l'équipe. Malheureusement, nous avons décidé de poursuivre avec d'autres candidats pour ce poste. On te souhaite plein de réussite pour la suite !",
    "rejected",
  ],
  [
    "offer: promesse d'embauche (vous)",
    "Votre arrivée chez Maison Lumière",
    "Bonjour Claire, Nous avons le plaisir de vous proposer le poste de Chef de projet digital au sein de Maison Lumière. Vous trouverez ci-joint votre promesse d'embauche précisant votre rémunération.",
    "offer",
  ],
  [
    "offer: informal (tu)",
    "Bonne nouvelle",
    "Hugo, on est ravis de te faire une offre pour rejoindre l'équipe Pixelle en tant que Product Designer ! Tous les détails sont dans le document joint.",
    "offer",
  ],
  [
    "assessment: online test",
    "Prochaine étape de votre candidature",
    "Bonjour Claire, La prochaine étape consiste en un test en ligne de logique. Merci de le réaliser avant le 2 décembre via le lien reçu.",
    "assessment",
  ],
  [
    "alert: offres d'emploi pour vous",
    "Nouvelles offres d'emploi pour vous",
    "Votre alerte emploi : Chef de projet à Paris\n\nChef de projet digital - Maison Lumière - Paris\n\nVoir toutes les offres",
    "alert",
  ],
  [
    "unknown: entretien as upkeep",
    "Rappel : entretien de votre véhicule",
    "Bonjour, l'entretien de votre véhicule est prévu le 3 décembre au garage Martin. Pensez à apporter votre carnet d'entretien.",
    "unknown",
  ],
];

const GERMAN: Sample[] = [
  [
    "applied: thanks, interview only if shortlisted (Sie)",
    "Ihre Bewerbung als Data Analyst (m/w/d)",
    `Sehr geehrte Frau Weber,

vielen Dank für Ihre Bewerbung als Data Analyst (m/w/d) und Ihr Interesse an der Nordlicht GmbH. Ihre Unterlagen sind vollständig bei uns eingegangen.

Wir prüfen Ihre Bewerbung sorgfältig. Sollten Sie in die engere Auswahl kommen, werden wir uns bei Ihnen melden, um einen Termin für ein persönliches Gespräch zu vereinbaren.

Mit freundlichen Grüßen
Ihr Recruiting-Team der Nordlicht GmbH`,
    "applied",
  ],
  [
    "applied: startup (du)",
    "Danke für deine Bewerbung!",
    "Hi Lena, danke, dass du dich bei Kiezkraft beworben hast! Wir schauen uns deine Unterlagen in den nächsten Tagen an.",
    "applied",
  ],
  [
    "applied: LinkedIn sent",
    "Ihre Bewerbung wurde an Nordlicht GmbH gesendet",
    "Ihre Bewerbung wurde an Nordlicht GmbH gesendet\n\nData Analyst (m/w/d)\nNordlicht GmbH · Hamburg",
    "applied",
  ],
  [
    "interview: Einladung zum Vorstellungsgespräch (Sie)",
    "Einladung zum Vorstellungsgespräch",
    `Sehr geehrte Frau Weber,

vielen Dank für Ihre Bewerbung. Ihr Profil hat uns überzeugt und wir möchten Sie gerne zu einem persönlichen Gespräch in unser Büro in Hamburg einladen.

Bitte teilen Sie uns mit, an welchen der folgenden Termine Sie Zeit haben.

Mit freundlichen Grüßen
Julia Becker`,
    "interview",
  ],
  [
    "interview: book a slot (du)",
    "Kurzes Kennenlernen?",
    "Hey Lena, deine Bewerbung hat uns echt gefallen! Wir würden dich gerne in einem kurzen Video-Call kennenlernen. Buch dir einfach einen Termin über unser Buchungstool.",
    "interview",
  ],
  [
    "interview: confirmed",
    "Bestätigung Ihres Interviewtermins",
    "Guten Tag Herr Schulz, hiermit bestätigen wir Ihren Interviewtermin am Mittwoch, den 2. Dezember 2026 um 11:00 Uhr. Das Gespräch findet über Microsoft Teams statt.",
    "interview",
  ],
  [
    "rejected: polite thanks, then no (Sie)",
    "Ihre Bewerbung bei der Nordlicht GmbH",
    `Sehr geehrte Frau Weber,

vielen Dank für Ihre Bewerbung und das damit verbundene Interesse an unserem Unternehmen.

Nach sorgfältiger Prüfung Ihrer Unterlagen müssen wir Ihnen leider mitteilen, dass wir Ihre Bewerbung nicht weiter berücksichtigen können.

Wir wünschen Ihnen für Ihre berufliche Zukunft alles Gute.

Mit freundlichen Grüßen
Nordlicht GmbH`,
    "rejected",
  ],
  [
    "rejected: someone else (du)",
    "Deine Bewerbung bei Kiezkraft",
    "Hi Lena, danke nochmal für deine Zeit und die spannenden Gespräche! Leider haben wir uns am Ende für eine andere Person entschieden. Wir wünschen dir alles Gute für deine Suche!",
    "rejected",
  ],
  [
    "offer: Vertragsangebot (Sie)",
    "Ihr Angebot",
    "Sehr geehrte Frau Weber, wir freuen uns sehr, Ihnen ein Angebot für die Position als Data Analyst unterbreiten zu können. Den Arbeitsvertrag finden Sie im Anhang.",
    "offer",
  ],
  [
    "offer: chosen (du)",
    "Gute Nachrichten!",
    "Hi Lena, wir haben uns für dich entschieden! Wir möchten dir die Stelle als Junior Product Designerin anbieten. Alle Details schicken wir dir morgen.",
    "offer",
  ],
  [
    "assessment: online test",
    "Nächster Schritt",
    "Sehr geehrter Herr Schulz, als nächsten Schritt bitten wir Sie, unseren Online-Test zu absolvieren. Der Test dauert etwa 45 Minuten.",
    "assessment",
  ],
  [
    "alert: Neue Stellenangebote",
    "Neue Stellenangebote für Data Analyst in Hamburg",
    "3 neue Jobs passend zu deinem Suchauftrag:\n\nData Analyst (m/w/d)\nNordlicht GmbH · Hamburg\n\nJetzt bewerben",
    "alert",
  ],
  [
    "alert: Jobs für dich",
    "Jobs für dich",
    "Hallo Lena, diese Jobs könnten dich interessieren:\n\nUX Designer (m/w/d)\nKiezkraft · Berlin",
    "alert",
  ],
  [
    "unknown: leider alone",
    "Mittagessen",
    "Hi Lena, leider schaffe ich es heute nicht zum Mittagessen. Können wir auf Donnerstag verschieben?",
    "unknown",
  ],
  [
    "unknown: Wir freuen uns is not an offer",
    "Wir suchen dich!",
    "Wir freuen uns auf deine Bewerbung als Werkstudent (m/w/d) im Marketing. Bewirb dich ganz einfach online.",
    "unknown",
  ],
  [
    "unknown: Vorstellungsgespräch alone",
    "Karrieretipps",
    "So bereitest du dich richtig auf dein nächstes Vorstellungsgespräch vor.",
    "unknown",
  ],
];

describe.each([
  ["Spanish", SPANISH],
  ["Portuguese", PORTUGUESE],
  ["French", FRENCH],
  ["German", GERMAN],
])("reading %s hiring email", (_, samples) => {
  it.each(samples)("%s", (_, subject, body, kind) => {
    expect(read(subject, body)).toBe(kind);
  });
});

describe("accents, sentences and alerts", () => {
  it("tolerates the unaccented spelling people type", () => {
    expect(read("Postulacion", "Lamentablemente no continuaremos con tu postulacion.")).toBe(
      "rejected",
    );
    expect(read("Bewerbung", "Vielen Dank fuer Ihre Bewerbung bei uns.")).toBe("applied");
    expect(read("Einladung zum Vorstellungsgespraech", "Bis bald.")).toBe("interview");
    expect(read("Retorno", "Infelizmente nao seguiremos com sua candidatura.")).toBe("rejected");
    expect(read("Candidature", "Nous avons bien recu votre candidature.")).toBe("applied");
  });

  it("treats accented letters as part of a word", () => {
    expect(read("Entrevista", "Tu entrevista será el martes 3 de diciembre a las 10:00.")).toBe(
      "interview",
    );
    expect(read("Entrevista", "Sua entrevista é amanhã às 10h.")).toBe("interview");
  });

  it("starts a new sentence at ¿ and at an accented capital", () => {
    expect(
      read(
        "Tu postulación",
        "Lamentablemente no continuaremos con tu postulación. ¿Te gustaría que te escribamos si surge una vacante para tu perfil?",
      ),
    ).toBe("rejected");
    expect(
      read(
        "Votre candidature",
        "Nous ne pouvons pas donner suite à votre candidature. À l'avenir, si un poste correspond à votre profil, nous reviendrons vers vous.",
      ),
    ).toBe("rejected");
  });

  it("counts a listed mailing's unsubscribe line, unless it is about your application", () => {
    const digest =
      "Las empresas que sigues publicaron nuevos puestos. Para darte de baja, haz clic aquí.";
    expect(isAlert("Novedades", digest, true)).toBe(true);
    expect(isAlert("Novedades", digest, false)).toBe(false);
    expect(isAlert("Ihre Bewerbung", "Ihre Bewerbung ist eingegangen. Abmelden", true)).toBe(false);
  });
});

describe("reading the job from es, pt, fr and de emails", () => {
  const job = (subject: string, body = "") =>
    extractJob({
      subject,
      body,
      sender: parseSender("no-reply@greenhouse.io"),
      system: "greenhouse",
    });

  it.each([
    [
      "Gracias por postularte al puesto de Analista de Datos en Lumen Labs",
      "Analista de Datos",
      "Lumen Labs",
    ],
    ["Ana, tu solicitud se ha enviado a Orbit Analytics", "", "Orbit Analytics"],
    [
      "Obrigado por se candidatar à vaga de Analista de Dados na Acme Brasil",
      "Analista de Dados",
      "Acme Brasil",
    ],
    ["Sua candidatura foi enviada para a Nuvem Pagamentos", "", "Nuvem Pagamentos"],
    [
      "Votre candidature au poste de Chef de projet chez Maison Lumière",
      "Chef de projet",
      "Maison Lumière",
    ],
    ["Claire, votre candidature a été envoyée à Atelier Nova", "", "Atelier Nova"],
    ["Vielen Dank für Ihre Bewerbung bei Kiezkraft", "", "Kiezkraft"],
    [
      "Ihre Bewerbung als UX Designer (w/m/d) bei der Nordlicht GmbH",
      "UX Designer",
      "Nordlicht GmbH",
    ],
  ])("%s", (subject, role, company) => {
    expect(job(subject)).toMatchObject({ role, company });
  });

  it("reads labelled lines", () => {
    expect(job("Hola", "Puesto: Analista de Datos\nEmpresa: Lumen Labs")).toMatchObject({
      role: "Analista de Datos",
      company: "Lumen Labs",
    });
    expect(job("Bonjour", "Poste : Développeur Full Stack (H/F)")).toMatchObject({
      role: "Développeur Full Stack",
    });
  });
});
