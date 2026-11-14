// fontkit needs Brotli only for WOFF2 fonts, and every PDF font is TTF or OTF.
export default function decompress(): never {
  throw new Error("WOFF2 fonts are not supported in the PDF renderer.");
}
