// JSON Resume stores dates as ISO 8601 ("2021-03-15", "2021-03", "2021"); the editor keeps dates
// as people write them ("Mar 2021"). These convert between the two without guessing: anything
// that isn't clearly a date passes through as it was.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_INDEX = new Map(MONTHS.map((month, index) => [month.toLowerCase(), index + 1]));
const ISO = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T.*)?$/;
const PRESENT = /^(present|current|now|today|ongoing)$/i;

export function fromIsoDate(value: string | undefined): string {
  const text = (value ?? "").trim();
  const match = ISO.exec(text);
  if (!match) return text;
  const [, year, month] = match;
  const name = month ? MONTHS[Number(month) - 1] : undefined;
  if (month && !name) return text;
  return name ? `${name} ${year}` : (year ?? text);
}

/** "Mar 2021" → "2021-03", "2019" → "2019", "Present" → null (an open end). */
export function toIsoDate(value: string): string | null {
  const text = value.trim().replace(/\.$/, "");
  if (text === "" || PRESENT.test(text)) return null;
  if (ISO.test(text)) return text.slice(0, 10);
  const named = /^([a-z]{3,9})\.?\s+(\d{4})$/i.exec(text);
  const month = named ? MONTH_INDEX.get(named[1]!.slice(0, 3).toLowerCase()) : undefined;
  if (named && month) return `${named[2]}-${String(month).padStart(2, "0")}`;
  const numeric = /^(\d{1,2})\/(\d{4})$/.exec(text);
  const monthNumber = numeric ? Number(numeric[1]) : 0;
  if (numeric && monthNumber >= 1 && monthNumber <= 12) {
    return `${numeric[2]}-${String(monthNumber).padStart(2, "0")}`;
  }
  return text;
}

export function isPresent(value: string): boolean {
  return PRESENT.test(value.trim());
}
