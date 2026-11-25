import { Copy, Eye, FileText, Link2 } from "lucide-react";
import type { MenuEntry } from "@/components/ui/menu";

export type DownloadMenuInput = {
  pro: boolean | null;
  wordBuilding: boolean;
  previewUrl: string | null;
  onWord: () => void;
  onCopyText: () => void;
  onShare: () => void;
  onPreview: (url: string) => void;
};

// Pro marks show on Free only, never while the plan is still loading.
export type DownloadMenuCopy = {
  word: string;
  wordBuilding: string;
  wordHint: string;
  copyText: string;
  copyTextHint: string;
  share: string;
  shareHint: string;
  preview: string;
  previewHint: string;
  previewWaiting: string;
};

export function downloadMenuItems(t: DownloadMenuCopy, input: DownloadMenuInput): MenuEntry[] {
  const locked = input.pro === false;
  const { previewUrl } = input;
  return [
    {
      label: t.word,
      icon: FileText,
      pro: locked,
      description: input.wordBuilding ? t.wordBuilding : t.wordHint,
      disabled: input.wordBuilding,
      onSelect: input.onWord,
    },
    {
      label: t.copyText,
      icon: Copy,
      description: t.copyTextHint,
      onSelect: input.onCopyText,
    },
    {
      label: t.share,
      icon: Link2,
      pro: locked,
      description: t.shareHint,
      onSelect: input.onShare,
    },
    "separator",
    {
      label: t.preview,
      icon: Eye,
      description: previewUrl ? t.previewHint : t.previewWaiting,
      disabled: previewUrl === null,
      onSelect: () => {
        if (previewUrl) input.onPreview(previewUrl);
      },
    },
  ];
}
