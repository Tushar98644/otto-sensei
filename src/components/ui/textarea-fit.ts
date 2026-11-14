type FitElement = Pick<
  HTMLTextAreaElement,
  "offsetHeight" | "clientHeight" | "scrollHeight" | "style"
>;

// One typed character can't make the text need less room.
export function insertsOneCharacter(previous: string, next: string): boolean {
  if (next.length !== previous.length + 1) return false;
  let at = 0;
  while (at < previous.length && previous[at] === next[at]) at += 1;
  return next.slice(at + 1) === previous.slice(at);
}

// Each read after a write lays out the whole page, so grow in place and collapse only to shrink.
export function fitToContent(element: FitElement, grewOnly = false): void {
  const frame = element.offsetHeight - element.clientHeight;
  if (element.scrollHeight > element.clientHeight) {
    element.style.height = `${element.scrollHeight + frame}px`;
    return;
  }
  // A box never fitted is still at its natural height, the least it can be.
  if (grewOnly || element.style.height === "") return;
  const scrollY = window.scrollY;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + frame}px`;
  // Collapsing to "auto" for a moment can shorten the page and clamp the scroll position.
  if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY });
}
