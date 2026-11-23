// The two variables globals.css reads at :root for font-sans and font-display.
export function SiteFontVariables({ sans, display }: { sans: string; display: string }) {
  return (
    <style href="site-fonts" precedence="default">
      {`:root{--font-inter:${sans};--font-garamond:${display}}`}
    </style>
  );
}
