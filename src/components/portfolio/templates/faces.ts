type Face = { variable: string; style: { fontFamily: string } };

export type DesignFaces = { classes: string; variables: string };

// A design's faces, keyed by the variable its stylesheet reads: as classes for the editor, as declarations for /p.
export function designFaces(faces: Record<`--pf-font-${string}`, Face>): DesignFaces {
  const list = Object.entries(faces);
  return {
    classes: list.map(([, face]) => face.variable).join(" "),
    variables: list.map(([name, face]) => `${name}:${face.style.fontFamily}`).join(";"),
  };
}
