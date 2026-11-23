import { SiteFontVariables } from "./site-font-variables";

// The faces are declared in globals.css, so a not-found page adds no font stylesheet or preload to any page.
export function NotFoundFonts() {
  return (
    <SiteFontVariables
      sans={`"Not Found Sans", "Not Found Sans Fallback"`}
      display={`"Not Found Display", "Not Found Display Fallback"`}
    />
  );
}
