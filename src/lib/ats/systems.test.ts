import { describe, expect, it } from "vitest";
import { fileReadingNotes, HIRING_SYSTEMS } from "./systems";

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const PREDICTION = /\b(?:you will|you'll (?:pass|fail|be rejected)|guarantee|your score|pass rate|beat the)\b/i;

describe("hiring-system notes", () => {
  const systems = Object.values(HIRING_SYSTEMS);

  it("has 1 to 5 sourced notes per system, keyed by its own id", () => {
    for (const [id, system] of Object.entries(HIRING_SYSTEMS)) {
      expect(system.id).toBe(id);
      expect(system.notes.length, system.name).toBeGreaterThanOrEqual(1);
      expect(system.notes.length, system.name).toBeLessThanOrEqual(5);
    }
  });

  it("keeps every note short, plain and linked to an https page", () => {
    for (const system of systems) {
      for (const note of system.notes) {
        expect(words(note.fact), note.fact).toBeLessThanOrEqual(30);
        expect(words(note.todo), note.todo).toBeLessThanOrEqual(15);
        expect(note.fact.endsWith("."), note.fact).toBe(true);
        expect(note.todo.endsWith("."), note.todo).toBe(true);
        expect(`${note.fact} ${note.todo}`).not.toMatch(PREDICTION);
        expect(`${note.fact} ${note.todo}`).not.toMatch(/!/);
        expect(new URL(note.source.url).protocol).toBe("https:");
        expect(note.source.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("never repeats a fact within a system", () => {
    for (const system of systems) {
      const facts = system.notes.map((note) => note.fact);
      expect(new Set(facts).size, system.name).toBe(facts.length);
    }
  });

  it("gives the recruiter view one file-reading note per listed system", () => {
    const notes = fileReadingNotes();
    expect(notes.map(({ system }) => system.id)).toEqual([
      "workday",
      "greenhouse",
      "successfactors",
      "taleo",
      "workable",
    ]);
    expect(notes.every(({ note }) => note.topic === "file")).toBe(true);
  });
});
