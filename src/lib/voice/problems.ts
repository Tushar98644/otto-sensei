export type VoiceProblemCode =
  "mic-blocked" | "no-mic" | "no-speech" | "offline" | "sign-in" | "too-many" | "failed";
export type VoiceProblem = { code: VoiceProblemCode; message?: string };

export type VoiceProblemCopy = { title: string; description: string };

export function voiceProblemCopy({ code, message }: VoiceProblem): VoiceProblemCopy {
  switch (code) {
    case "mic-blocked":
      return {
        title: "Otto can't hear you",
        description: "Allow the microphone in your browser to talk to Otto.",
      };
    case "no-mic":
      return {
        title: "Otto can't reach your microphone",
        description: "Check it's plugged in and not used by another app, then try again.",
      };
    case "no-speech":
      return {
        title: "Otto didn't catch anything",
        description: "Try again a little closer to the mic.",
      };
    case "offline":
      return {
        title: "Voice typing needs the internet",
        description: "Check your connection and try again, or type instead.",
      };
    case "sign-in":
      return { title: "Sign in first", description: message ?? "Sign in to talk to Otto." };
    case "too-many":
      return { title: "Take a short break", description: message ?? "Try again in a few minutes." };
    case "failed":
      return { title: "Couldn't turn that into text", description: "Try again, or type instead." };
  }
}
