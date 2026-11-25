import { describe, expect, it } from "vitest";
import { mightBeSexual } from "./moderation";

// The word pre-check screens Spanish, Portuguese, French and German as it does English.
describe("word pre-check in other languages", () => {
  it.each([
    "una escena de sexo explícito",
    "fotos de mujeres desnudas",
    "contenido erótico para adultos",
    "quiero follar contigo",
    "la violación de una menor",
    "material pedófilo",
    "vídeos de sexo explícito",
    "fotos de mulheres nuas",
    "vamos transar hoje",
    "conteúdo erótico",
    "um caso de estupro",
    "material pedófilo na rede",
    "une scène de sexe explicite",
    "des photos de femmes nues",
    "un contenu érotique",
    "accusé de viol",
    "réseau pédophile",
    "harcèlement sexuel",
    "eine sexuelle Handlung",
    "Nacktbilder verschickt",
    "Kinderpornografie besitzen",
    "wegen Vergewaltigung verurteilt",
    "pädophile Inhalte",
    "erotische Fotos",
  ])("sends %s to the safety model", (text) => {
    expect(mightBeSexual(text)).toBe(true);
  });

  it.each([
    "Reduje el tiempo de carga de la página un 40% mediante caché",
    "Gestión de un equipo de 5 desarrolladores y coordinación con proveedores",
    "Responsable de la atención al cliente en la zona norte",
    "Desenvolvi o sistema de cobrança para 40 clientes",
    "Gestão de uma equipe de 5 pessoas no lançamento do app",
    "Réduit le temps de chargement de 40 % grâce au cache",
    "Gestion d'une équipe de 5 développeurs sur l'avenue de la Gare",
    "Responsable de la relation client, région Nord",
    "Ladezeit der Seite durch Caching um 40 % verkürzt",
    "Leitung eines Teams von 5 Entwicklern bei der Zahlwerk GmbH",
    "Ausbildung zum Fachinformatiker, Berufsschule Essen",
    "Pédagogie et formation des nouveaux arrivants",
    "Bordeaux, France",
  ])("skips the safety model for %s", (text) => {
    expect(mightBeSexual(text)).toBe(false);
  });

  it("leaves English job words alone", () => {
    for (const text of [
      "Built a pedometer app",
      "Restored a brass sextant",
      "Lived in Essex and Sussex",
      "A fickle market",
      "Rolled out a new avenue for growth",
    ]) {
      expect(mightBeSexual(text)).toBe(false);
    }
  });
});
