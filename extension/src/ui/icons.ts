// Lucide icons (ISC licence), the same set the app draws with, as plain SVG.
const PATHS = {
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  circleCheck: ['<circle cx="12" cy="12" r="10"/>', '<path d="m16 9-5.5 5.5L8 12"/>'],
  circleDashed: [
    '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/>',
    '<path d="M13.9 21.818a10 10 0 0 1-3.8 0"/>',
    '<path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/>',
    '<path d="M2.182 13.9a10 10 0 0 1 0-3.8"/>',
    '<path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/>',
    '<path d="M21.818 10.1a10 10 0 0 1 0 3.8"/>',
    '<path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/>',
    '<path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
  ],
  circleHalf: [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>',
  ],
  alert: [
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>',
    '<path d="M12 9v4"/>',
    '<path d="M12 17h.01"/>',
  ],
  circleX: ['<circle cx="12" cy="12" r="10"/>', '<path d="m15 9-6 6"/>', '<path d="m9 9 6 6"/>'],
  bookmark: [
    '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
  ],
  bookmarkCheck: [
    '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
    '<path d="m9 10 2 2 4-4"/>',
  ],
  wand: [
    '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>',
    '<path d="m14 7 3 3"/>',
    '<path d="M5 6v4"/>',
    '<path d="M19 14v4"/>',
    '<path d="M10 2v2"/>',
    '<path d="M7 8H3"/>',
    '<path d="M21 16h-4"/>',
    '<path d="M11 3H9"/>',
  ],
  pen: [
    '<path d="M13 21h8"/>',
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  ],
  arrowUpRight: ['<path d="M7 7h10v10"/>', '<path d="M7 17 17 7"/>'],
  chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
  chevronUp: ['<path d="m18 15-6-6-6 6"/>'],
  minus: ['<path d="M5 12h14"/>'],
  x: ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name].join("")}</svg>`;
}
