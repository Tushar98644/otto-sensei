// While a modal <dialog> is open, everything outside it is inert and hidden from screen readers.
// Each open Dialog registers an empty slot inside itself here, and overlays that must stay usable
// (toasts) render into the topmost slot. Browser-only: nothing here runs during server rendering.

const hosts: HTMLElement[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function registerModalHost(host: HTMLElement): () => void {
  hosts.push(host);
  notify();
  return () => {
    const index = hosts.lastIndexOf(host);
    if (index === -1) return;
    hosts.splice(index, 1);
    notify();
  };
}

export function subscribeModalHosts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTopModalHost(): HTMLElement | null {
  return hosts.at(-1) ?? null;
}
