type Params = Record<string, string | string[] | undefined>;

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function sameRun(segments: readonly string[], at: number, values: readonly string[]): boolean {
  return values.every((value, offset) => decoded(segments[at + offset] ?? "") === value);
}

// "/resume-examples/[role]" for "/resume-examples/nurse": which page, never the ids or slugs in its address.
export function routeTemplate(pathname: string, params: Params | null): string {
  const segments = pathname.split("/");
  for (const [name, value] of Object.entries(params ?? {})) {
    if (typeof value === "string") {
      // From the right: a dynamic segment comes after the static ones that might share its text.
      const at = segments.findLastIndex((segment) => decoded(segment) === value);
      if (at > 0) segments[at] = `[${name}]`;
    } else if (value?.length) {
      const at = segments.findLastIndex((_, index) => sameRun(segments, index, value));
      if (at > 0) segments.splice(at, value.length, `[...${name}]`);
    }
  }
  return segments.join("/") || "/";
}
