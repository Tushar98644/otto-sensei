"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Ps1 } from "./prompt";

// Ported from Cveinnt/LiveTerm (MIT, see ./LICENSE.txt): the prompt, its history keys, tab
// completion, ctrl+l and its small jokes.

const RUN_EVENT = "pf-terminal-run";

type Entry = { id: number; command: string; output: ReactNode };

export type ShellLinks = Record<string, { href: string; label: string }>;

const JOKES: Record<string, string> = {
  vi: "woah, you still use 'vi'? just try 'vim'.",
  vim: "'vim' is so outdated. how about 'nvim'?",
  nvim: "'nvim'? too fancy. why not 'emacs'?",
  emacs: "you know what? just use vscode.",
  sudo: "Permission denied: with little power comes... no responsibility?",
  cd: "unfortunately, i cannot afford more directories.",
};
const BUILTIN = ["help", "clear", "echo", "whoami", "date", "ls", "theme", ...Object.keys(JOKES)];
const PER_LINE = 7;

function rootOf(node: Element | null): HTMLElement | null {
  return node?.closest<HTMLElement>(".pf-terminal") ?? null;
}

export function Run({ command }: { command: string }) {
  return (
    <button
      type="button"
      className="run"
      onClick={(event) =>
        rootOf(event.currentTarget)?.dispatchEvent(new CustomEvent(RUN_EVENT, { detail: command }))
      }
    >
      {command}
    </button>
  );
}

export function Shell({
  host,
  outputs,
  links,
}: {
  host: string;
  outputs: Record<string, ReactNode>;
  links: ShellLinks;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [command, setCommand] = useState("");
  const [back, setBack] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  const names = [...new Set([...Object.keys(outputs), ...Object.keys(links), ...BUILTIN])].sort();
  const exists = (raw: string) => names.includes(raw.trim().split(/\s+/)[0] ?? "");

  const help = (
    <>
      Welcome! Here are all the available commands:
      {"\n\n"}
      {names.map((name, i) => (
        <span key={name}>
          <Run command={name} />
          {(i + 1) % PER_LINE === 0 ? "\n" : " "}
        </span>
      ))}
      {"\n\n"}[tab]: trigger completion.{"\n"}[ctrl+l]/clear: clear terminal.{"\n\n"}Type
      &apos;sumfetch&apos; to display summary.
    </>
  );

  const run = (raw: string) => {
    const [name = "", ...args] = raw.trim().split(/\s+/);
    const root = rootOf(log.current);
    if (name === "clear") {
      root?.setAttribute("data-cleared", "");
      setEntries([]);
      return;
    }
    let output: ReactNode = null;
    if (name === "") output = null;
    else if (name === "help") output = help;
    else if (name in outputs) output = outputs[name];
    else if (name in links) {
      const link = links[name]!;
      if (/^mailto:/.test(link.href)) window.location.href = link.href;
      else window.open(link.href, "_blank", "noopener,noreferrer");
      output = `Opening ${link.label}...`;
    } else if (name === "echo") output = args.join(" ");
    else if (name === "whoami") output = "visitor";
    else if (name === "date") output = new Date().toString();
    else if (name === "ls") output = Object.keys(outputs).join("\n");
    else if (name === "theme") {
      const mode = args[0];
      if (mode === "light" || mode === "dark") {
        root?.setAttribute("data-theme", mode);
        output = `Theme set to ${mode}.`;
      } else output = "usage: theme [light|dark]";
    } else if (name in JOKES) output = JOKES[name];
    else output = `shell: command not found: ${name}. Try 'help' to get started.`;
    counter.current += 1;
    setEntries((list) => [...list, { id: counter.current, command: raw, output }]);
  };
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const root = rootOf(log.current);
    if (!root) return;
    const onRun = (event: Event) => {
      runRef.current((event as CustomEvent<string>).detail);
      input.current?.focus({ preventScroll: true });
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("a, button, input, summary") || window.getSelection()?.toString()) return;
      input.current?.focus({ preventScroll: true });
    };
    root.addEventListener(RUN_EVENT, onRun);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener(RUN_EVENT, onRun);
      root.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (entries.length > 0) input.current?.scrollIntoView({ block: "nearest" });
  }, [entries]);

  const typed = entries.map((entry) => entry.command).filter(Boolean);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "c" && event.ctrlKey) {
      event.preventDefault();
      setCommand("");
      setBack(0);
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      run("clear");
    } else if (event.key === "Tab") {
      const match = command && names.find((name) => name.startsWith(command));
      if (match) {
        event.preventDefault();
        setCommand(match);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(command);
      setCommand("");
      setBack(0);
    } else if (event.key === "ArrowUp" && typed.length > 0) {
      event.preventDefault();
      const next = Math.min(back + 1, typed.length);
      setBack(next);
      setCommand(typed[typed.length - next] ?? "");
    } else if (event.key === "ArrowDown" && typed.length > 0) {
      event.preventDefault();
      const next = back - 1;
      setBack(Math.max(0, next));
      setCommand(next > 0 ? (typed[typed.length - next] ?? "") : "");
    }
  };

  return (
    <div className="shell" ref={log}>
      <div aria-live="polite">
        {entries.map((entry) => (
          <div className="entry" key={entry.id}>
            <p className="line">
              <Ps1 host={host} />
              <span className="cmd">{entry.command}</span>
            </p>
            {entry.output !== null ? <div className="out">{entry.output}</div> : null}
          </div>
        ))}
      </div>
      <p className="line prompt">
        <label htmlFor="pf-terminal-prompt">
          <Ps1 host={host} />
        </label>
        <input
          ref={input}
          id="pf-terminal-prompt"
          className="input"
          data-ok={command === "" || exists(command) ? "true" : "false"}
          aria-label="Type a command, or help"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder=" "
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
        />
      </p>
    </div>
  );
}
