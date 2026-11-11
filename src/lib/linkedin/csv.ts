// LinkedIn puts line breaks inside quoted fields, so lines can't be split first.

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
