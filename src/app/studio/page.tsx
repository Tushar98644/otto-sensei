import { Suspense } from "react";
import { StudioShell } from "@/components/studio/studio-shell";
import { JobLinkParam } from "@/components/studio/tailor/job-link-param";
import { PostParam } from "@/components/studio/tailor/post-param";

export default function StudioPage() {
  return (
    <>
      <StudioShell />
      {/* Reads the URL in the browser only, so the rest of the page still prerenders. */}
      <Suspense fallback={null}>
        <JobLinkParam />
        <PostParam />
      </Suspense>
    </>
  );
}
