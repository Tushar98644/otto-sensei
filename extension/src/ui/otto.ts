import { OTTO_COLORS as C } from "@/components/mascot/palette";

// Otto's head, drawn the same as components/site/otto-mark.tsx. The eyes blink, his only idle motion.
export function ottoHead(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false">
<g stroke="${C.line}" stroke-width="3" stroke-linejoin="round"><circle cx="6.5" cy="28.5" r="5" fill="${C.fur}"/><circle cx="57.5" cy="28.5" r="5" fill="${C.fur}"/></g>
<circle cx="5.8" cy="28" r="2.3" fill="${C.furShade}"/><circle cx="58.2" cy="28" r="2.3" fill="${C.furShade}"/>
<ellipse cx="32" cy="38" rx="28.5" ry="20.5" fill="${C.fur}" stroke="${C.line}" stroke-width="3"/>
<path d="M32 42.5C35.5 39.5 45 39.8 46.3 46C47.5 52 40.5 55 35.5 53.6C34.2 53.2 33 52.8 32 52.8C31 52.8 29.8 53.2 28.5 53.6C23.5 55 16.5 52 17.7 46C19 39.8 28.5 39.5 32 42.5Z" fill="${C.cream}"/>
<g class="otto-eyes"><circle cx="20.5" cy="33.5" r="3.6" fill="${C.eye}"/><circle cx="43.5" cy="33.5" r="3.6" fill="${C.eye}"/><circle cx="21.8" cy="32.2" r="1.2" fill="${C.shine}"/><circle cx="44.8" cy="32.2" r="1.2" fill="${C.shine}"/></g>
<g fill="none" stroke="${C.line}" stroke-width="3"><circle cx="20.5" cy="33" r="8.5"/><circle cx="43.5" cy="33" r="8.5"/></g>
<path d="M29 32Q32 29.8 35 32" fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>
<path d="M27 43C27 40.2 37 40.2 37 43C37 45.6 33.6 47.4 32 47.4C30.4 47.4 27 45.6 27 43Z" fill="${C.nose}"/>
<path d="M32 47.2V49.2M28.6 49.4C29.8 51.6 31.2 51.6 32 49.6C32.8 51.6 34.2 51.6 35.4 49.4" fill="none" stroke="${C.line}" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
}
