// The results fold into disclosures, so a jump opens every one around its target first.
export function revealSection(id: string): HTMLElement | null {
  const element = document.getElementById(id);
  if (!element) return null;
  let details = element.closest("details");
  while (details) {
    details.open = true;
    details = details.parentElement?.closest("details") ?? null;
  }
  element.scrollIntoView({ block: "start" });
  return element;
}
