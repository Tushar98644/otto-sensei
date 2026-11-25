import { describe, expect, it } from "vitest";
import { roleGate, gateAllows } from "../role-gate";
import { seniorityOf } from "../roles";
import type { RoleFamily, Seniority } from "../types";
import rawData from "./data.json";
import { readTitle, searchOccupations } from "./index";
import { TECH_NAMES } from "./tech";
import { englishTitle } from "./translate";

const data = rawData as { names: string[]; titles: string[]; aliases: string[] };

type Case = [title: string, family: RoleFamily | null, occupation: string | null];

const SPANISH: Case[] = [
  ["Desarrollador de software", "engineering", "15-1252.00"],
  ["Desarrollador/a Full Stack Senior", "engineering", "15-1252.00"],
  ["Desarrollador Backend (Node.js) - Remoto", "engineering", "15-1252.00"],
  ["Ingeniero de Software Sr.", "engineering", "15-1252.00"],
  ["Ingeniera de Datos", "data", "15-1243.01"],
  ["Científico de Datos", "data", "15-2051.00"],
  ["Analista de Datos Semi Senior", "data", "15-2051.01"],
  ["Analista de QA", "engineering", "15-1253.00"],
  ["Diseñador UX/UI", "design", "15-1255.00"],
  ["Diseñadora Gráfica", "design", "27-1024.00"],
  ["Gerente de Producto", "product", "11-X101.00"],
  ["Dueño de Producto", "product", "11-X101.00"],
  ["Jefe de Proyecto TI", "operations", "15-1299.09"],
  ["Gerente de Marketing", "marketing", "11-2021.00"],
  ["Especialista en Marketing Digital", "marketing", "13-1161.00"],
  ["Ejecutivo de Cuentas", "sales", "41-4011.00"],
  ["Representante de Ventas", "sales", "41-4012.00"],
  ["Gerente Comercial", "sales", "11-2022.00"],
  ["Agente de Atención al Cliente", null, "43-4051.00"],
  ["Técnico de Soporte", "support", "15-1232.00"],
  ["Reclutador IT", "people", "13-1071.00"],
  ["Generalista de Recursos Humanos", "people", "13-1071.00"],
  ["Contador Público", "finance", "13-2011.00"],
  ["Analista Financiero", "finance", "13-2051.00"],
  ["Abogado Corporativo", "legal", "23-1011.00"],
  ["Asistente Legal", "legal", "23-2011.00"],
  ["Enfermero/a", null, "29-1141.00"],
  ["Asistente Administrativo", null, "43-6014.00"],
  ["Gerente de Desarrollo de Software", "engineering", "11-3021.00"],
];

const PORTUGUESE: Case[] = [
  ["Desenvolvedor de Software", "engineering", "15-1252.00"],
  ["Desenvolvedor Front-end Pleno", "engineering", "15-1252.00"],
  ["Desenvolvedora Java Sênior", "engineering", "15-1251.00"],
  ["Engenheiro(a) de Software Sr.", "engineering", "15-1252.00"],
  ["Engenheiro de Dados", "data", "15-1243.01"],
  ["Analista de dados", "data", "15-2051.01"],
  ["Analista de BI", "data", "15-2051.01"],
  ["Analista de Testes", "engineering", "15-1253.00"],
  ["Analista de Suporte", "support", "15-1232.00"],
  ["Designer de Produto", "design", "15-1255.00"],
  ["Gerente de Produto", "product", "11-X101.00"],
  ["Gerente de Projetos", "operations", "13-1082.00"],
  ["Analista de Marketing Digital", "marketing", "13-1161.00"],
  ["Executivo de Contas", "sales", "41-4011.00"],
  ["Representante Comercial", "sales", "41-4012.00"],
  ["Consultor de Vendas", "sales", "41-4012.00"],
  ["Atendente de SAC", null, "43-4051.00"],
  ["Analista de Sucesso do Cliente", "support", "41-X101.00"],
  ["Analista de RH", "people", "13-1071.00"],
  ["Analista Contábil", "finance", "13-2051.00"],
  ["Analista Fiscal", "finance", "13-2081.00"],
  ["Advogado Trabalhista", "legal", "23-1011.00"],
  ["Analista Jurídico", "legal", "23-2011.00"],
  ["Enfermeira", null, "29-1141.00"],
  ["Técnico de Enfermagem", null, "29-2061.00"],
  ["Auxiliar Administrativo", null, "43-6014.00"],
];

const FRENCH: Case[] = [
  ["Développeur Full Stack H/F", "engineering", "15-1252.00"],
  ["Développeuse Web", "engineering", "15-1254.00"],
  ["Ingénieur logiciel", "engineering", "15-1252.00"],
  ["Ingénieur DevOps (F/H)", "engineering", "15-1299.08"],
  ["Analyste de données", "data", "15-2051.01"],
  ["Chef de projet", "operations", "13-1082.00"],
  ["Chef de projet informatique", "operations", "15-1299.09"],
  ["Chef de produit", "product", "11-X101.00"],
  ["Responsable marketing", "marketing", "11-2021.00"],
  ["Chargé de marketing", "marketing", "13-1161.00"],
  ["Chargée de recrutement", "people", "13-1071.00"],
  ["Chargé d'affaires", "sales", "41-4011.00"],
  ["Commercial terrain", "sales", "41-4012.00"],
  ["Ingénieur commercial", "sales", "41-4011.00"],
  ["Directeur commercial", "sales", "11-2022.00"],
  ["Responsable des ressources humaines", "people", "11-3121.00"],
  ["Comptable", "finance", "13-2011.00"],
  ["Contrôleur de gestion", "finance", "11-3031.01"],
  ["Analyste financier", "finance", "13-2051.00"],
  ["Avocate", "legal", "23-1011.00"],
  ["Juriste d'entreprise", "legal", "23-1011.00"],
  ["Infirmière", null, "29-1141.00"],
  ["Conseiller clientèle", null, "43-4051.00"],
  ["Technicien support", "support", "15-1232.00"],
  ["Graphiste", "design", "27-1024.00"],
  ["Assistante de direction", "operations", "43-6011.00"],
];

const GERMAN: Case[] = [
  ["Softwareentwickler (m/w/d)", "engineering", "15-1252.00"],
  ["Softwareentwicklerin", "engineering", "15-1252.00"],
  ["Java-Entwickler", "engineering", "15-1251.00"],
  ["Entwickler:in Backend", "engineering", "15-1252.00"],
  ["Softwareingenieur", "engineering", "15-1252.00"],
  ["Datenanalyst", "data", "15-2051.01"],
  ["Netzwerkadministrator", "operations", "15-1244.00"],
  ["Projektleiter", "operations", "13-1082.00"],
  ["Produktmanager", "product", "11-X101.00"],
  ["Produktdesigner", "design", "15-1255.00"],
  ["Grafikdesigner", "design", "27-1024.00"],
  ["Referent Marketing", "marketing", "13-1161.00"],
  ["Vertriebsmitarbeiter", "sales", "41-4012.00"],
  ["Mitarbeiter im Vertrieb", "sales", "41-4012.00"],
  ["Vertriebsleiter", "sales", "11-2022.00"],
  ["Mitarbeiter Kundenservice", null, "43-4051.00"],
  ["Personalreferent", "people", "13-1071.00"],
  ["Sachbearbeiter Buchhaltung", "finance", "43-3031.00"],
  ["Finanzbuchhalter", "finance", "13-2011.00"],
  ["Steuerberater", "finance", "13-2082.00"],
  ["Rechtsanwalt", "legal", "23-1011.00"],
  ["Syndikusrechtsanwalt", "legal", "23-1011.00"],
  ["Pflegefachkraft", null, "29-1141.00"],
  ["Gesundheits- und Krankenpfleger", null, "29-1141.00"],
  ["Assistenz der Geschäftsführung", "operations", "43-6011.00"],
];

describe("titles in other languages read as the English the rules know", () => {
  it.each([
    ["Desarrollador de software", "software developer"],
    ["Analista de dados", "data analyst"],
    ["Chef de projet", "project manager"],
    ["Vertriebsmitarbeiter", "sales representative"],
    ["Analista de Datos Semi Senior", "data analyst"],
    ["Engenheiro de Software Sênior", "senior software engineer"],
    ["Gerente de Desarrollo de Software", "software engineering manager"],
    ["Stagiaire Développeur", "developer intern"],
    ["Stage - Développeur Web", "internship - web developer"],
    ["Leiter Vertrieb", "head of sales"],
    ["Head de Marketing", "head of marketing"],
    [
      "Revenue Operations Specialist (Especialista em Operações de Receita)",
      "Revenue Operations Specialist (receita operations specialist)",
    ],
  ])("%s → %s", (title, english) => {
    expect(englishTitle(title)).toBe(english);
  });

  it.each([
    ["es", SPANISH],
    ["pt", PORTUGUESE],
    ["fr", FRENCH],
    ["de", GERMAN],
  ] as const)("reads the main %s job titles", (_lang, cases) => {
    for (const [title, family, occupation] of cases) {
      expect({ title, ...readTitle(title) }).toEqual({ title, family, occupation });
    }
  });

  it.each<[string, Seniority]>([
    ["Analista de Datos Semi Senior", "mid"],
    ["Analista de Dados Pleno", "mid"],
    ["Desenvolvedora Java Sênior", "senior"],
    ["Cientista de Dados Júnior", "junior"],
    ["Product Designer Sênior", "senior"],
    ["Estagiário em Desenvolvimento de Software", "intern"],
    ["Practicante de Marketing", "intern"],
    ["Becario de Desarrollo de Software", "intern"],
    ["Stagiaire Développeur", "intern"],
    ["Alternance - Chargé de communication", "intern"],
    ["Werkstudent Marketing", "intern"],
    ["Praktikum im Bereich Vertrieb", "intern"],
    ["Trainee de Vendas", "junior"],
    ["Líder Técnico", "lead"],
    ["Teamleiter Vertrieb", "lead"],
    ["Head de Vendas", "director"],
    ["Directeur commercial", "director"],
    ["Geschäftsführer", "director"],
  ])("%s is %s", (title, level) => {
    expect(seniorityOf(title)).toBe(level);
  });

  it("lets a role's own kind of work through the gate in any of the languages", () => {
    const developer = roleGate({ occupation: "15-1252.00", family: "engineering" });
    const analyst = roleGate({ occupation: "15-2051.01", family: "data" });
    for (const title of [
      "Desarrollador Backend",
      "Desenvolvedor Java",
      "Développeur Web",
      "Softwareentwickler",
    ])
      expect(gateAllows(developer, readTitle(title)), title).toBe(true);
    for (const title of [
      "Analista de Datos",
      "Analista de Dados",
      "Analyste de données",
      "Datenanalyst",
    ])
      expect(gateAllows(analyst, readTitle(title)), title).toBe(true);
    for (const title of ["Gerente de Ventas", "Comptable", "Rechtsanwalt", "Enfermeira"])
      expect(gateAllows(developer, readTitle(title)), title).toBe(false);
  });

  it("finds an occupation by a name in another language", () => {
    expect(searchOccupations("Desarrollador")).toEqual(searchOccupations("developer"));
    expect(searchOccupations("Analista de dados")).toEqual(searchOccupations("data analyst"));
    expect(searchOccupations("Chef de projet").length).toBeGreaterThan(0);
  });
});

describe("English titles read as before", () => {
  it("leaves every English occupation name and alias as written", () => {
    const corpus = new Set<string>([
      ...data.names,
      ...data.titles,
      ...data.aliases.flatMap((list) => list.split("|")),
      ...TECH_NAMES.map(([name]) => name),
    ]);
    expect(corpus.size).toBeGreaterThan(50_000);
    expect([...corpus].filter((title) => englishTitle(title) !== title)).toEqual([]);
  });

  it.each([
    "Senior Software Engineer (Remote)",
    "Stage Manager",
    "Client Services Manager",
    "Personal Banker",
    "Personal Trainer",
    "Commercial Manager",
    "Product Manager Commercial Cards",
    "Business Developer",
    "Red Team Engineer",
    "Informatica Developer",
    "Assistant Professor",
    "Tax Assessor",
    "Chef de Partie",
    "Sous Chef de Cuisine",
    "Fiscal Analyst",
    "Revision Specialist",
    "System Administrator",
    "Home Office Manager",
    "Boutique Manager",
    "Online Marketing Manager",
    "Manager - Finance & Legal Controlling",
    "Product Lead, Cards Benefits",
    "Software Development Engineer in Test",
    "Charge Nurse",
    "Hybrid Cloud Architect",
    "Temporal Engineer",
  ])("%s", (title) => {
    expect(englishTitle(title)).toBe(title);
  });
});
