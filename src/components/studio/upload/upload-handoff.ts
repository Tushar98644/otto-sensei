// "Upload a file" from outside the studio (the New resume menu, Home, the setup list): the file is
// picked right there, and the upload step starts reading it as it opens, instead of opening on an
// empty dropzone that asks for the same file again. Read when the step mounts, cleared once it has.

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
