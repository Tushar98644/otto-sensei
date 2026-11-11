// An open modal <dialog> makes everything outside it inert, so each open Dialog registers a slot
// inside itself and overlays that must stay usable (toasts) render into the topmost one.

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
