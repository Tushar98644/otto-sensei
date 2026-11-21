"use client";

import { ClipboardPaste, FileUp } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeMode } from "./inputs";
import { ResumeUpload, type UploadState } from "./resume-upload";

export type ResumeCardProps = {
  mode: ResumeMode;
  onModeChange: (mode: ResumeMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  error: string | null;
  hint: ReactNode;
  textRef: RefObject<HTMLTextAreaElement | null>;
  upload: UploadState;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  onFocus: () => void;
};

export function ResumeCard({
  mode,
  onModeChange,
  text,
  onTextChange,
  error,
  hint,
  textRef,
  upload,
  onFile,
  onReject,
  onFocus,
}: ResumeCardProps) {
  return (
    <Card>
      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value === "upload" ? "upload" : "paste")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-base/6 font-semibold text-ink">Your resume</h2>
          <TabList aria-label="How to add your resume">
            <Tab value="paste">
              <ClipboardPaste aria-hidden />
              Paste text
            </Tab>
            <Tab value="upload" onFocus={() => void import("@/lib/api/client")}>
              <FileUp aria-hidden />
              Upload a file
            </Tab>
          </TabList>
        </div>
        <TabPanel value="paste" tabIndex={-1}>
          <Field label="Resume text" hideLabel error={error} hint={hint}>
            <Textarea
              ref={textRef}
              value={text}
              rows={6}
              spellCheck={false}
              placeholder="Paste your resume here"
              className="min-h-40 sm:min-h-72"
              onFocus={onFocus}
              onChange={(event) => onTextChange(event.target.value)}
            />
          </Field>
        </TabPanel>
        <TabPanel value="upload" tabIndex={-1}>
          <ResumeUpload
            state={upload}
            invalid={error !== null}
            onFile={onFile}
            onReject={onReject}
          />
          {error && upload.status !== "failed" ? (
            <p role="alert" className="mt-2 text-sm font-medium text-fail-ink">
              {error}
            </p>
          ) : null}
        </TabPanel>
      </Tabs>
    </Card>
  );
}
