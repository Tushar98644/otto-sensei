// Printing keeps only the pack: everything that neither holds it nor sits inside it is set aside.
const PRINT_CSS = `@media print {
  @page { margin: 14mm 12mm; }
  html, body { background: #fff !important; }
  body *:not(:has([data-prep-print])):not([data-prep-print]):not([data-prep-print] *) { display: none !important; }
  body *:has([data-prep-print]) { background: #fff !important; padding: 0 !important; margin: 0 !important; max-width: none !important; min-height: 0 !important; }
  [data-prep-print] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export function PrepPrintStyles() {
  return <style>{PRINT_CSS}</style>;
}
