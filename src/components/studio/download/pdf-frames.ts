export type FrameView = { frames: string[]; shown: string | null };

export function addFrame(view: FrameView, url: string): FrameView {
  return { ...view, frames: [...view.frames.filter((frame) => frame === view.shown), url] };
}

// A late timer for a frame that's gone must not hide the one on screen or drop the newest.
export function showFrame(view: FrameView, frame: string): FrameView {
  return view.frames.includes(frame) && view.shown !== frame ? { ...view, shown: frame } : view;
}

export function dropHiddenFrames(view: FrameView, frame: string): FrameView {
  if (view.shown !== frame) return view;
  const newest = view.frames.at(-1);
  const frames = view.frames.filter((item) => item === frame || item === newest);
  return frames.length === view.frames.length ? view : { ...view, frames };
}
