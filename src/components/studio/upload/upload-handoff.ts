// The file is picked outside the studio and the upload step reads it as it opens, instead of
// asking for it again. Read when the step mounts, cleared once it has.

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
