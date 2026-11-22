// The original subsets these glyphs into its own font (✦ ☞ ❦ ▼); drawn here so every machine shows the same mark.

export function Star({ className = "star" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 0c.6 4.2 3.2 7 8 8-4.8 1-7.4 3.8-8 8-.6-4.2-3.2-7-8-8 4.8-1 7.4-3.8 8-8Z" />
    </svg>
  );
}

export function Hand({ className = "hand" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 14" aria-hidden>
      <path d="M1 2.2h3.2v9.6H1z" />
      <path
        fill="none"
        d="M4.2 3.4c1.6-1.6 3.5-1.9 5.6-1.6l2 .3h11.6c1 0 1.6.6 1.6 1.4s-.6 1.4-1.6 1.4h-8.8M14 5h1.6c.9 0 1.4.6 1.4 1.3s-.5 1.3-1.4 1.3H13.8M15.6 7.6c.8 0 1.3.6 1.3 1.3s-.5 1.3-1.3 1.3h-2M14.6 10.2c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2H9.2c-2 0-3.5-.6-5-1.8"
      />
    </svg>
  );
}

export function Fleuron({ className = "fleuron" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden>
      <path d="M10 18c-.4-2.8-1.8-4.4-4.2-5.4C3.1 11.5 1.6 9.6 2 7c.4-2.6 2.6-4.3 5.1-3.9 1.7.3 2.6 1.4 2.9 2.9.3-1.5 1.2-2.6 2.9-2.9C15.4 2.7 17.6 4.4 18 7c.4 2.6-1.1 4.5-3.8 5.6C11.8 13.6 10.4 15.2 10 18Z" />
      <path d="M10 6.2c-.9 2.2-.9 4.4 0 6.8" fill="none" />
    </svg>
  );
}

export function Caret() {
  return (
    <svg className="caret" viewBox="0 0 10 8" aria-hidden>
      <path d="M0 0h10L5 8Z" />
    </svg>
  );
}
