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
export function downloadMenuItems(input: DownloadMenuInput): MenuEntry[] {
  const locked = input.pro === false;
  const { previewUrl } = input;
  return [
    {
      label: "Download Word",
      icon: FileText,
      pro: locked,
      description: input.wordBuilding ? "Making your Word file" : "Opens in Word or Google Docs",
      disabled: input.wordBuilding,
      onSelect: input.onWord,
    },
    {
      label: "Copy plain text",
      icon: Copy,
      description: "For application forms",
      onSelect: input.onCopyText,
    },
    {
      label: "Copy share link",
      icon: Link2,
      pro: locked,
      description: "A web page with your resume",
      onSelect: input.onShare,
    },
    "separator",
    {
      label: "Preview",
      icon: Eye,
      description: previewUrl ? "Opens the PDF in a new tab" : "Once your PDF is ready",
      disabled: previewUrl === null,
      onSelect: () => {
        if (previewUrl) input.onPreview(previewUrl);
      },
    },
  ];
}
