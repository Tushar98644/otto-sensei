import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en/studio";
import es from "@/i18n/messages/es/studio";
import {
  CONFLICT_VERSION_NAMES,
  EDIT_LABELS,
  RENAMED_LABEL,
  restoredLabel,
  suggestVersionName,
} from "@/lib/store/history";
import { historyLabel, versionName } from "./history-words";

describe("history words", () => {
  it("keep every English label as the store writes it", () => {
    for (const label of [...Object.values(EDIT_LABELS), RENAMED_LABEL, restoredLabel("Before")]) {
      expect(historyLabel(label, en)).toBe(label);
    }
    expect(versionName(CONFLICT_VERSION_NAMES.here, en.versions)).toBe(CONFLICT_VERSION_NAMES.here);
    expect(versionName(CONFLICT_VERSION_NAMES.elsewhere, en.versions)).toBe(
      CONFLICT_VERSION_NAMES.elsewhere,
    );
    expect(suggestVersionName([], en.versions.suggested)).toBe(suggestVersionName([]));
  });

  it("read in Spanish", () => {
    expect(historyLabel(EDIT_LABELS.fix, es)).toBe("Otto corrigió una línea");
    expect(historyLabel(restoredLabel(CONFLICT_VERSION_NAMES.here), es)).toBe(
      "Restauró “Cambios en este dispositivo”",
    );
    expect(historyLabel("Ocultó líneas", es)).toBe("Ocultó líneas");
    expect(suggestVersionName([], es.versions.suggested)).toBe("Versión 1");
  });
});
