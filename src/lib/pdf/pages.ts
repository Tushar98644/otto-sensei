// Exact only for react-pdf output; other PDFs can compress their object dictionaries.

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

export function countPdfPages(bytes: Uint8Array): number {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.match(PAGE_OBJECT)?.length ?? 0;
}

export async function countBlobPages(blob: Blob): Promise<number> {
  return countPdfPages(new Uint8Array(await blob.arrayBuffer()));
}
