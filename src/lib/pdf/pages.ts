// react-pdf writes object dictionaries as plain text, one "/Type /Page" per page, so counting them
// is exact for our own files. Not for other PDFs, which can compress objects.

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

export function countPdfPages(bytes: Uint8Array): number {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.match(PAGE_OBJECT)?.length ?? 0;
}

export async function countBlobPages(blob: Blob): Promise<number> {
  return countPdfPages(new Uint8Array(await blob.arrayBuffer()));
}
