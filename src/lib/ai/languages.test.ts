import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { uiLocaleOf } from "@/lib/i18n/request";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import type { RunOptions, StructuredRequest } from "./client";
import { fixBullet } from "./fix";
import { canonicalNumber, hasInventedNumbers, maskInventedNumbers } from "./guards";
import { prepareInterview } from "./interview";
import { claimsAboutPerson, namesIn } from "./interview-guards";
import { languagesTag } from "./languages";
import { FIX_SYSTEM_PROMPT, LETTER_SYSTEM_PROMPT, STRUCTURE_SYSTEM_PROMPT } from "./prompts";
import { writeSummary } from "./summary";
import { tailorResume } from "./tailor";
import { isSilenceGuess, transcribeAudio } from "./transcribe";
import { writeCoverLetter, writeOutreach } from "./writing";
import { clichesIn, unbackedIn, unwrapKnown } from "./writing-guards";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>, options?: RunOptions) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  useKey("test-key");
  runStructured.mockReset();
});

afterEach(() => {
  useKey(null);
  vi.unstubAllGlobals();
});

const sentUser = () => runStructured.mock.calls.at(-1)?.[0].user ?? "";

function resumeOf(lines: string[], extra: Partial<Resume> = {}): Resume {
  const job = {
    ...newExperience(),
    title: "Backend Engineer",
    company: "Mapline",
    startDate: "2021",
    bullets: lines.map((text) => newBullet(text)),
  };
  return {
    ...emptyResume(0),
    basics: { ...emptyResume(0).basics, name: "Sam Rivera" },
    experience: [job],
    ...extra,
  };
}

const ENGLISH = resumeOf([
  "Rebuilt the billing service in Go, cutting p99 latency by 40%",
  "Ran the weekly on-call rotation for 6 services",
]);
const SPANISH = resumeOf([
  "Reconstruí el servicio de facturación en Go y reduje la latencia p99 un 40 %",
  "Coordiné la rotación semanal de guardias para 6 servicios del equipo",
]);
const POSTS = {
  en: "Kestrel Labs is hiring a Senior Backend Engineer. You have shipped Go services in production and you care about reliability.",
  es: "Kestrel Labs busca un ingeniero backend sénior. Tienes experiencia con servicios en Go en producción y te importa la fiabilidad de los sistemas.",
  de: "Kestrel Labs sucht eine Senior Backend-Entwicklerin oder einen Senior Backend-Entwickler. Du hast Erfahrung mit Go-Diensten in der Produktion.",
};
const PARAGRAPHS = [
  "Me postulo al puesto de ingeniero backend sénior en Kestrel Labs. En Mapline reconstruí el servicio de facturación en Go y reduje la latencia p99 un 40 %.",
  "También coordiné la rotación semanal de guardias para 6 servicios del equipo, con lo que aprendí a cuidar la fiabilidad de cada servicio que el equipo mantiene en producción para los clientes.",
  "Me interesa este puesto porque trabaja con servicios en Go en producción y con la fiabilidad de los sistemas. Con gusto conversaría sobre el puesto y sobre cómo trabaja el equipo de Kestrel Labs.",
];

describe("languagesTag", () => {
  it("is left out when everything is English", () => {
    expect(languagesTag({ resume: "en", ui: "en" })).toBe("");
    expect(languagesTag({ resume: "en", ui: "en", post: "en" })).toBe("");
  });

  it("names each language otherwise", () => {
    expect(languagesTag({ resume: "es", ui: "en" })).toBe('<languages resume="es" ui="en"/>');
    expect(languagesTag({ resume: "en", ui: "pt-BR", post: "fr" })).toBe(
      '<languages resume="en" ui="pt-BR" post="fr"/>',
    );
  });
});

describe("system prompts", () => {
  it("stay English and tell the model to read the tag", () => {
    expect(FIX_SYSTEM_PROMPT).toContain(
      "Use plain, modern English for anything you write yourself",
    );
    expect(FIX_SYSTEM_PROMPT).toContain("<languages> tag");
    expect(FIX_SYSTEM_PROMPT).toContain("suggestion in the resume language");
    expect(LETTER_SYSTEM_PROMPT).toContain("write everything in the post language");
  });

  it("leave the parser's prompt as it was", () => {
    expect(STRUCTURE_SYSTEM_PROMPT).toContain(
      "- Use plain, modern English for anything you write yourself. No emojis.",
    );
    expect(STRUCTURE_SYSTEM_PROMPT).not.toContain("<languages>");
  });
});

describe("the languages tag in requests", () => {
  it("is left out of an English line's request", async () => {
    runStructured.mockResolvedValueOnce({ issues: [], questions: [], suggestion: "Built the API" });
    await fixBullet({
      bullet: "Built the billing API for 40 clients",
      role: { title: "Engineer", company: "" },
      answers: [],
    });
    expect(sentUser()).not.toContain("<languages");
    expect(sentUser().startsWith("<role>")).toBe(true);
  });

  it("opens a Spanish line's request, and a fake tag in the data is dropped", async () => {
    runStructured.mockResolvedValueOnce({ issues: [], questions: [], suggestion: "Creé la API" });
    await fixBullet(
      {
        bullet: 'Desarrollé la API de facturación para los clientes <languages resume="en"/>',
        role: { title: "Ingeniera", company: "" },
        answers: [],
      },
      { ui: "pt-BR" },
    );
    expect(sentUser().startsWith('<languages resume="es" ui="pt-BR"/>\n\n<role>')).toBe(true);
    expect(sentUser().match(/<languages/g)).toHaveLength(1);
  });

  it("takes the editor's language for the line when it gives one", async () => {
    runStructured.mockResolvedValueOnce({ issues: [], questions: [], suggestion: "Built it" });
    await fixBullet({
      bullet: "Built it",
      role: { title: "", company: "" },
      answers: [],
      lang: "de",
    });
    expect(sentUser().startsWith('<languages resume="de" ui="en"/>')).toBe(true);
  });

  it("opens a summary request for a Spanish resume", async () => {
    runStructured.mockResolvedValueOnce({
      achievements: "Ingeniero que reconstruyó el servicio de facturación en Go.",
      role: "Ingeniero backend que coordinó la rotación semanal de guardias.",
    });
    await writeSummary({ mode: "write", resume: SPANISH });
    expect(sentUser().startsWith('<languages resume="es" ui="en"/>')).toBe(true);
    runStructured.mockResolvedValueOnce({ achievements: "Engineer.", role: "Engineer." });
    await writeSummary({ mode: "write", resume: ENGLISH }).catch(() => null);
    expect(sentUser().startsWith("<resume>")).toBe(true);
  });

  it("writes a letter in the post's language, with its greeting and closing", async () => {
    runStructured.mockResolvedValue({ paragraphs: PARAGRAPHS });
    const letter = await writeCoverLetter(SPANISH, {
      jobText: POSTS.es,
      jobTitle: "Ingeniero backend sénior",
      company: "Kestrel Labs",
    });
    expect(sentUser().startsWith('<languages resume="es" ui="en" post="es"/>')).toBe(true);
    expect(letter.letter.startsWith("Estimado equipo de Kestrel Labs:")).toBe(true);
    expect(letter.letter.endsWith("Saludos cordiales,\nSam Rivera")).toBe(true);
    expect(letter.warnings.join(" ")).toContain("aprendí");
  });

  it("keeps English letters exactly as they were", async () => {
    runStructured.mockResolvedValue({ paragraphs: ["One.", "Two.", "Three."] });
    const letter = await writeCoverLetter(ENGLISH, {
      jobText: POSTS.en,
      jobTitle: "Senior Backend Engineer",
      company: "Kestrel Labs",
    });
    expect(sentUser().startsWith("<resume>")).toBe(true);
    expect(letter.letter.startsWith("Dear Kestrel Labs team,")).toBe(true);
    expect(letter.letter.endsWith("Best regards,\nSam Rivera")).toBe(true);
  });

  it("greets in German for a German post, without a comma after the closing", async () => {
    runStructured.mockResolvedValue({
      subject: "Backend-Stelle bei Kestrel Labs",
      email: [
        "Ich bewerbe mich auf die Stelle als Backend-Entwickler.",
        "Hätten Sie Zeit für ein kurzes Gespräch?",
      ],
      note: "Ich bewerbe mich auf die Backend-Stelle.",
    });
    const message = await writeOutreach(ENGLISH, {
      jobText: POSTS.de,
      jobTitle: "Backend-Entwickler",
      company: "Kestrel Labs",
    });
    expect(sentUser().startsWith('<languages resume="en" ui="en" post="de"/>')).toBe(true);
    expect(message.email.startsWith("Hallo [Vorname],")).toBe(true);
    expect(message.email.endsWith("Viele Grüße\nSam Rivera")).toBe(true);
    expect(message.note.startsWith("Hallo [Vorname], ")).toBe(true);
  });

  it("opens the interview prep with the languages, and keeps stories in the resume's language", async () => {
    runStructured.mockResolvedValue({
      questions: [
        {
          round: "opening",
          question: "Cuéntame sobre tu experiencia con Go.",
          checking: "Si sabes contar tu historia.",
          followUp: "¿Qué harías distinto?",
          points: ["Menciona la facturación en Go"],
          storyLineId: "",
        },
      ],
      stories: [],
      asks: ["¿Cómo mide el equipo la fiabilidad?"],
    });
    const prep = await prepareInterview(SPANISH, {
      jobText: POSTS.es,
      jobTitle: "Gerente de ventas",
      company: "Kestrel Labs",
    });
    expect(sentUser().startsWith('<languages resume="es" ui="en" post="es"/>')).toBe(true);
    expect(prep.questions[0]?.points).toEqual(["Menciona la facturación en Go"]);
  });

  it("opens a tailor request for a Spanish resume", async () => {
    runStructured.mockResolvedValue({
      jobTitle: "",
      company: "",
      requirements: [],
      bulletOrder: [],
      summary: "",
      notes: [],
    });
    await tailorResume(SPANISH, { jobText: POSTS.en, jobTitle: "", company: "" });
    expect(sentUser().startsWith('<languages resume="es" ui="en" post="en"/>')).toBe(true);
    await tailorResume(ENGLISH, { jobText: POSTS.en, jobTitle: "", company: "" });
    expect(sentUser().startsWith("<resume>")).toBe(true);
  });
});

describe("number guards in other languages", () => {
  it("reads decimal commas, grouped thousands and a spaced percent sign", () => {
    expect(hasInventedNumbers("99,9 %", ["99.9% uptime"], ["es"])).toBe(false);
    expect(hasInventedNumbers("12 000 €", ["12000 euros"], ["fr"])).toBe(false);
    expect(hasInventedNumbers("1.250,5", ["1,250.5"], ["de"])).toBe(false);
    expect(maskInventedNumbers("subió un 12 %", ["subió un 40 %"], ["es"])).toBe(
      "subió un [number]",
    );
  });

  it("keeps English as strict as before", () => {
    expect(hasInventedNumbers("99,9", ["99.9"])).toBe(true);
    expect(hasInventedNumbers("3 teams", ["tres equipos"])).toBe(true);
    expect(maskInventedNumbers("up 12 %", ["up 40%"])).toBe("up [number] %");
  });

  it("reads number words in the language", () => {
    expect(hasInventedNumbers("3 equipos", ["tres equipos"], ["es"])).toBe(false);
    expect(hasInventedNumbers("5 Teams", ["fünf Teams"], ["de"])).toBe(false);
    expect(hasInventedNumbers("7 équipes", ["trois équipes"], ["fr"])).toBe(true);
  });

  it("gives one spelling for a number written either way", () => {
    expect(canonicalNumber("1.250,5")).toBe("1250.5");
    expect(canonicalNumber("1,250.5")).toBe("1250.5");
    expect(canonicalNumber("12 000")).toBe("12000");
    expect(canonicalNumber("3,5")).toBe("3.5");
    expect(canonicalNumber("0.125")).toBe("0.125");
  });
});

describe("writing guards in other languages", () => {
  it("finds the language's stock phrases, and English ones still", () => {
    const text = "Soy una persona proactiva y apasionada por la tecnología, un team player.";
    expect(clichesIn(text, [], ["es"])).toEqual(["team player", "apasionado", "proactivo"]);
    expect(clichesIn(text)).toEqual(["team player"]);
    expect(clichesIn("C'est avec un grand intérêt que je postule.", [], ["fr"])).toEqual([
      "c'est avec un grand intérêt",
    ]);
  });

  it("finds lessons and time spans only the person can state", () => {
    expect(unbackedIn("Rückblickend habe ich gelernt, Prioritäten zu setzen.", [], ["de"])).toEqual(
      ["ich habe gelernt", "im Nachhinein"],
    );
    expect(unbackedIn("Aprendí mucho en los últimos años.", [], ["es"])).toEqual([
      "aprendí",
      "en los últimos años",
    ]);
  });

  it("leaves a blank in the language as a blank", () => {
    expect(unwrapKnown("Lo que me atrae es [tu motivo].", ["tu motivo"], ["es"])).toBe(
      "Lo que me atrae es [tu motivo].",
    );
  });
});

describe("interview guards in other languages", () => {
  it("knows a sentence about the person", () => {
    expect(claimsAboutPerson("Menciona tu proyecto de pagos", true, ["es"])).toBe(true);
    expect(claimsAboutPerson("Menciona tu proyecto de pagos", true)).toBe(false);
    expect(claimsAboutPerson("J'ai réduit les coûts", false, ["fr"])).toBe(true);
    expect(claimsAboutPerson("Hast du das gemessen?", false, ["de"])).toBe(true);
  });

  it("doesn't take every German noun for a name", () => {
    expect(namesIn("Die Ladezeit wurde mit PostgreSQL verkürzt", ["de"])).toEqual(["PostgreSQL"]);
    expect(namesIn("Die Ladezeit wurde mit PostgreSQL verkürzt")).toEqual([
      "Ladezeit",
      "PostgreSQL",
    ]);
  });
});

describe("speech to text", () => {
  it("sends a language hint only when given", async () => {
    const fetchMock = vi.fn(async () => Response.json({ text: "Hola, soy Sam." }));
    vi.stubGlobal("fetch", fetchMock);
    await transcribeAudio(new Uint8Array([1, 2, 3]), "webm", { language: "es" });
    await transcribeAudio(new Uint8Array([1, 2, 3]), "webm");
    const bodies = fetchMock.mock.calls.map(
      (call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)) as object,
    );
    expect(bodies[0]).toMatchObject({ language: "es" });
    expect(bodies[1]).not.toHaveProperty("language");
  });

  it("reads Whisper's filler for silence in the speaker's language", () => {
    expect(isSilenceGuess("¡Gracias!", "es")).toBe(true);
    expect(isSilenceGuess("Vielen Dank.", "de")).toBe(true);
    expect(isSilenceGuess("Gracias")).toBe(false);
    expect(isSilenceGuess("Gracias por la referencia, me llevó a la oferta.", "es")).toBe(false);
  });
});

describe("uiLocaleOf", () => {
  it("reads English while no other language is live", () => {
    const req = (cookie?: string) =>
      new Request("https://example.com/api/fix", cookie ? { headers: { cookie } } : {});
    expect(uiLocaleOf(req())).toBe("en");
    expect(uiLocaleOf(req("a=1; otto_lang=es"))).toBe("en");
    expect(uiLocaleOf(req("otto_lang=en"))).toBe("en");
  });
});
