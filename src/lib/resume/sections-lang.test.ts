import { describe, expect, it } from "vitest";
import { hasEnded } from "@/lib/lint/bullets";
import { heuristicParse } from "./heuristic-parse";
import { classifyHeading, extraKindOf, findDateRanges, findDates, isPresent } from "./sections";

describe("headings in other languages", () => {
  it.each([
    ["EXPERIENCIA LABORAL", "experience"],
    ["Experiencia profesional", "experience"],
    ["Formación académica", "education"],
    ["FORMACION", "education"],
    ["Conocimientos técnicos", "skills"],
    ["Perfil profesional", "summary"],
    ["Proyectos personales", "projects"],
    ["Certificaciones", "certifications"],
    ["Experiência Profissional", "experience"],
    ["Formação Acadêmica", "education"],
    ["Competências técnicas", "skills"],
    ["Resumo profissional", "summary"],
    ["Expérience professionnelle", "experience"],
    ["FORMATION", "education"],
    ["Compétences", "skills"],
    ["À propos de moi", "summary"],
    ["Projets personnels", "projects"],
    ["Berufserfahrung", "experience"],
    ["Beruflicher Werdegang", "experience"],
    ["Ausbildung", "education"],
    ["IT-Kenntnisse", "skills"],
    ["Über mich", "summary"],
    ["Zertifikate und Weiterbildungen", "certifications"],
  ] as const)("reads %s as %s", (line, kind) => {
    expect(classifyHeading(line)).toBe(kind);
  });

  it.each([
    ["Idiomas", "languages"],
    ["Premios y reconocimientos", "awards"],
    ["Publicaciones", "publications"],
    ["Voluntariado", "volunteering"],
    ["Línguas", "languages"],
    ["Prêmios", "awards"],
    ["Langues étrangères", "languages"],
    ["Prix et distinctions", "awards"],
    ["Bénévolat", "volunteering"],
    ["Sprachkenntnisse", "languages"],
    ["Auszeichnungen", "awards"],
    ["Veröffentlichungen", "publications"],
    ["Centres d'intérêt", "custom"],
    ["Hobbys", "custom"],
  ] as const)("files %s under %s", (line, kind) => {
    expect(extraKindOf(line)).toBe(kind);
  });

  it.each(["Datos personales", "Dados pessoais", "Informations personnelles", "Persönliche Daten"])(
    "drops %s",
    (line) => {
      expect(classifyHeading(line)).toBe("other");
      expect(extraKindOf(line)).toBeNull();
    },
  );

  it("needs capitals or a colon for a generic word that is also English", () => {
    expect(classifyHeading("Presentation")).toBeNull();
    expect(classifyHeading("PRESENTATION")).toBe("summary");
    expect(classifyHeading("Stage")).toBeNull();
    expect(classifyHeading("Resume")).toBeNull();
  });
});

describe("dates in other languages", () => {
  it.each([
    ["Enero de 2021 – Actualidad", "Enero de 2021", "Actualidad"],
    ["mar. 2018 - dic. 2020", "mar. 2018", "dic. 2020"],
    ["de 2019 hasta la fecha", "2019", "la fecha"],
    ["2019 a 2021", "2019", "2021"],
    ["jan/2020 - atual", "jan/2020", "atual"],
    ["set/2019 - out/2021", "set/2019", "out/2021"],
    ["março de 2019 até o momento", "março de 2019", "o momento"],
    ["septembre 2019 à aujourd'hui", "septembre 2019", "aujourd'hui"],
    ["févr. 2017 – déc. 2018", "févr. 2017", "déc. 2018"],
    ["2016 jusqu'en 2018", "2016", "2018"],
    ["Oktober 2014 bis September 2018", "Oktober 2014", "September 2018"],
    ["März 2020 – heute", "März 2020", "heute"],
    ["03/2021 – bis dato", "03/2021", "bis dato"],
  ])("reads %s", (line, start, end) => {
    expect(findDateRanges(line).map((range) => [range.start, range.end])).toEqual([[start, end]]);
  });

  it("finds single dates written the Spanish and German way", () => {
    expect(findDates("Titulado en junio de 2018").map((date) => date.text)).toEqual([
      "junio de 2018",
    ]);
    expect(findDates("Abschluss Juli 2018").map((date) => date.text)).toEqual(["Juli 2018"]);
  });

  it("keeps English words that look like short month names out of dates", () => {
    expect(findDateRanges("Rolled out 2023 pricing to 3 markets")).toEqual([]);
    expect(findDates("Rolled out 2023 pricing")).toEqual([{ text: "2023", index: 11 }]);
    expect(findDates("Set 2019 sales record")).toEqual([{ text: "2019", index: 4 }]);
    expect(findDates("Founded 5 years ago 2018")).toEqual([{ text: "2018", index: 20 }]);
  });

  it.each([
    "Actualidad",
    "actualmente",
    "Atual",
    "hoje",
    "Aujourd’hui",
    "en cours",
    "heute",
    "bis dato",
  ])("reads %s as present", (word) => {
    expect(isPresent(word)).toBe(true);
    expect(hasEnded(word)).toBe(false);
  });
});

describe("a Spanish resume", () => {
  const text = [
    "María López",
    "Ingeniera de software backend",
    "maria@example.com | +34 600 123 456 | Madrid",
    "",
    "PERFIL PROFESIONAL",
    "Ingeniera backend con 6 años de experiencia en pagos.",
    "",
    "EXPERIENCIA LABORAL",
    "Desarrolladora backend",
    "Banco Dos",
    "mar. 2018 - dic. 2020",
    "• Desarrollé el sistema de conciliación para 3 países",
    "",
    "IDIOMAS",
    "Español (nativo), Inglés (C1)",
    "",
    "CONOCIMIENTOS TÉCNICOS",
    "Go, PostgreSQL, Kafka",
  ].join("\n");

  it("finds its sections, dates and languages", () => {
    const resume = heuristicParse(text, 0);
    expect(resume.summary).toBe("Ingeniera backend con 6 años de experiencia en pagos.");
    expect(
      resume.experience.map((job) => [job.title, job.company, job.startDate, job.endDate]),
    ).toEqual([["Desarrolladora backend", "Banco Dos", "mar. 2018", "dic. 2020"]]);
    expect(resume.skills.map((group) => group.items)).toEqual([["Go", "PostgreSQL", "Kafka"]]);
    expect(
      resume.extras?.map((section) => [section.kind, section.items.map((item) => item.title)]),
    ).toEqual([["languages", ["Español", "Inglés"]]]);
  });
});
