// RFC 4180 CSV, client-safe. Quoted fields can hold commas, doubled quotes and real line breaks:
// LinkedIn writes job descriptions with line breaks inside quotes, so splitting on newlines first
// would cut a position in half.

const MAX_ROWS = 2_000;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
      continue;
    }
    // A quote only opens a quoted field at its start; mid-field it's a literal (`24" monitor`).
    if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      if (rows.length >= MAX_ROWS) return rows;
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type CsvRecord = Record<string, string>;

const headerKey = (cell: string) => cell.trim().toLowerCase();

/**
 * Rows as records keyed by lower-case header name. The header is the first row holding every
 * `required` column, because some LinkedIn files open with a "Notes:" preamble. Blank rows are
 * dropped. Returns [] when no row looks like the header.
 */
export function csvRecords(text: string, required: readonly string[]): CsvRecord[] {
  const rows = parseCsv(text);
  const wanted = required.map(headerKey);
  const start = rows.findIndex((cells) => {
    const keys = new Set(cells.map(headerKey));
    return wanted.every((key) => keys.has(key));
  });
  if (start === -1) return [];
  const header = (rows[start] ?? []).map(headerKey);
  const records: CsvRecord[] = [];
  for (const cells of rows.slice(start + 1)) {
    if (cells.every((cell) => cell.trim() === "")) continue;
    const record: CsvRecord = {};
    header.forEach((key, index) => {
      if (key) record[key] = (cells[index] ?? "").trim();
    });
    records.push(record);
  }
  return records;
}
