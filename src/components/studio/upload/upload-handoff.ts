export const UPLOAD_ACCEPT = ".pdf,.docx";

let handed: File | null = null;

export function handOffUpload(file: File): void {
  handed = file;
}

export function handedUpload(): File | null {
  return handed;
}

export function clearHandedUpload(): void {
  handed = null;
}
