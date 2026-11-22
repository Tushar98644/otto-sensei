// The few Chrome extension APIs Otto uses, typed here instead of pulling in @types/chrome.

export type Tab = { id?: number; url?: string };
export type MessageSender = {
  tab?: Tab;
  frameId?: number;
  url?: string;
  origin?: string;
  id?: string;
};
export type StorageChange = { oldValue?: unknown; newValue?: unknown };

type Event<Listener> = {
  addListener(listener: Listener): void;
  removeListener(listener: Listener): void;
};

type StorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

export interface ChromeApi {
  runtime: {
    id: string;
    getURL(path: string): string;
    getManifest(): { version: string };
    sendMessage(message: unknown): Promise<unknown>;
    onMessage: Event<
      (
        message: unknown,
        sender: MessageSender,
        sendResponse: (response: unknown) => void,
      ) => boolean | void
    >;
    onInstalled: Event<(details: { reason: string }) => void>;
  };
  storage: {
    local: StorageArea;
    // Kept in memory for the browser session only: forms filled, waiting for their thank-you page.
    session: StorageArea;
    onChanged: Event<(changes: Record<string, StorageChange>, area: string) => void>;
  };
  tabs: {
    create(properties: { url: string; active?: boolean; openerTabId?: number }): Promise<Tab>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
    onRemoved: Event<(tabId: number) => void>;
  };
  action: { onClicked: Event<(tab: Tab) => void> };
  scripting: {
    executeScript(injection: {
      target: { tabId: number; allFrames?: boolean };
      files: string[];
    }): Promise<unknown[]>;
  };
}

export const chrome = (globalThis as unknown as { chrome: ChromeApi }).chrome;
