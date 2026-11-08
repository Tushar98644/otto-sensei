// Page count of a PDF we rendered ourselves, without loading a PDF reader. react-pdf writes every
// object dictionary as plain text (only page content is compressed), one "/Type /Page" per page
// and "/Type /Pages" for the page tree, so counting the first kind is exact for our own files. Not
// for PDFs from anywhere else: those can pack objects into compressed streams.

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

export function countPdfPages(bytes: Uint8Array): number {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.match(PAGE_OBJECT)?.length ?? 0;
}

export async function countBlobPages(blob: Blob): Promise<number> {
  return countPdfPages(new Uint8Array(await blob.arrayBuffer()));
}
