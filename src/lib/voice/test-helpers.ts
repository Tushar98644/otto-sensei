import type { Recognition, RecognitionResult } from "./speech";

export class FakeRecognition implements Recognition {
  static made: FakeRecognition[] = [];
  static failStart = false;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: Recognition["onend"] = null;
  started = false;
  stopped = false;
  aborted = false;

  constructor() {
    FakeRecognition.made.push(this);
  }

  static last(): FakeRecognition {
    const recognition = FakeRecognition.made.at(-1);
    if (!recognition) throw new Error("No recognition was made");
    return recognition;
  }

  static reset() {
    for (const recognition of FakeRecognition.made) recognition.end();
    FakeRecognition.made = [];
    FakeRecognition.failStart = false;
  }

  start() {
    if (FakeRecognition.failStart) throw new Error("InvalidStateError");
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }

  abort() {
    this.aborted = true;
  }

  hear(...results: Array<[transcript: string, isFinal: boolean]>) {
    const list = results.map(([transcript, isFinal]): RecognitionResult => ({
      isFinal,
      length: 1,
      0: { transcript },
    }));
    this.onresult?.({ resultIndex: 0, results: list });
  }

  fail(error: string) {
    this.onerror?.({ error });
  }

  end() {
    this.onend?.();
  }
}

export class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

export class FakeStream {
  tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
  get released() {
    return this.tracks.every((track) => track.stopped);
  }
}

export class FakeRecorder {
  static made: FakeRecorder[] = [];
  static supported = new Set(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]);
  static isTypeSupported(type: string) {
    return FakeRecorder.supported.has(type);
  }

  static last(): FakeRecorder {
    const recorder = FakeRecorder.made.at(-1);
    if (!recorder) throw new Error("no recorder was made");
    return recorder;
  }

  static reset() {
    FakeRecorder.made = [];
    FakeRecorder.supported = new Set(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]);
  }

  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  bytes = "spoken words";

  constructor(
    readonly stream: FakeStream,
    readonly options?: { mimeType?: string; audioBitsPerSecond?: number },
  ) {
    this.mimeType = options?.mimeType ?? "audio/webm";
    FakeRecorder.made.push(this);
  }

  start() {
    this.state = "recording";
  }

  // A real recorder hands over its data and stops a moment later, not inside stop().
  stop() {
    this.state = "inactive";
    void Promise.resolve().then(() => {
      this.ondataavailable?.({ data: new Blob([this.bytes], { type: this.mimeType }) });
      this.onstop?.();
    });
  }
}

export async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}
