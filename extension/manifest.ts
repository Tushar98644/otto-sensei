export type BuildTarget = "dev" | "prod";

export const ORIGINS: Record<BuildTarget, string> = {
  dev: "http://localhost:3314",
  prod: "https://www.ottosensei.com",
};

// Pins the unpacked dev build's id (noofbknlfdjpiihgeghjeoalkjlfafeb), which the dev server lets in.
const DEV_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1m1TukMOkRcZHOhfXGsOJWkYUmzB50lmReWVuv7RNL9jbBu+g4GaC568H01yM/glaOxJFkQYMqOh6wjZOJ9+zADSfV9aR/RQdEzd9N4L03rKGUcn8y3+X1M8K1545jbQZ6NOK/yiCrtqXXsAA3ywjUCH6seRIL60rQsWao3jyL3P9hsD+H3zk3sezqzmc4qD8XCYEOZWBM6cAtnz4jyJqZqTmCdPsCvXxDga7humL/ml7ktNQqudJbwp/POIky9VmYfK7Am4b5/hE40u8xUc20NRF/LtYOpu1YVqRnuGgf8/AVNiaCwy2G06XgKjS60MuThUqkK4OEAyCo/NbPObDwIDAQAB";

// Job pages only: the badge never runs anywhere else on its own.
export const JOB_MATCHES = [
  "https://www.linkedin.com/jobs/*",
  "https://*.naukri.com/job-listings-*",
  "https://*.indeed.com/*",
  "https://boards.greenhouse.io/*",
  "https://job-boards.greenhouse.io/*",
  "https://boards.eu.greenhouse.io/*",
  "https://job-boards.eu.greenhouse.io/*",
  "https://jobs.lever.co/*",
  "https://jobs.eu.lever.co/*",
  "https://jobs.ashbyhq.com/*",
  "https://*.myworkdayjobs.com/*",
  "https://jobs.smartrecruiters.com/*",
  "https://apply.workable.com/*",
] as const;

export function manifest(target: BuildTarget, version: string, origin = ORIGINS[target]) {
  return {
    manifest_version: 3,
    // Words come from _locales in the browser's language (extension/src/i18n.ts); English is the default.
    default_locale: "en",
    name: target === "dev" ? "Otto for Chrome (dev)" : "__MSG_extName__",
    short_name: "Otto",
    version,
    description: "__MSG_extDescription__",
    ...(target === "dev" ? { key: DEV_KEY } : {}),
    minimum_chrome_version: "116",
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png",
    },
    action: {
      default_title: "__MSG_actionTitle__",
      default_icon: { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png" },
    },
    background: { service_worker: "background.js" },
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: [...JOB_MATCHES, `${origin}/*`],
    content_scripts: [
      {
        matches: JOB_MATCHES.filter((match) => !match.includes("greenhouse")),
        js: ["content.js"],
        run_at: "document_idle",
      },
      // Company sites embed Greenhouse in a frame; the badge runs inside it.
      {
        matches: JOB_MATCHES.filter((match) => match.includes("greenhouse")),
        js: ["content.js"],
        run_at: "document_idle",
        all_frames: true,
      },
      { matches: [`${origin}/*`], js: ["bridge.js"], run_at: "document_start" },
    ],
  };
}
