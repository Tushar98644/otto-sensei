import { holdSeconds, MUSIC, VOICES, voiceHz, type Voice } from "./plan";

export type FocusMusicPlayer = { stop: () => void };

type Bank = { gain: GainNode; voices: { voice: Voice; osc: OscillatorNode }[] };

function glide(param: AudioParam, to: number, at: number, seconds: number) {
  param.cancelScheduledValues(at);
  param.setValueAtTime(param.value, at);
  param.linearRampToValueAtTime(to, at + seconds);
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * MUSIC.noiseS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A slow pad in two banks that crossfade on each chord change, plus a soft band of noise for air.
export function startFocusMusic(ctx: AudioContext): FocusMusicPlayer {
  const sources: AudioScheduledSourceNode[] = [];
  const start = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(MUSIC.volume, start + MUSIC.fadeInS);
  master.connect(ctx.destination);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = MUSIC.cutoffHz;
  lowpass.Q.value = 0.5;
  lowpass.connect(master);

  function lfo(hz: number, depth: number, target: AudioParam) {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz;
    const swing = ctx.createGain();
    swing.gain.value = depth;
    osc.connect(swing).connect(target);
    sources.push(osc);
  }
  lfo(MUSIC.cutoffLfoHz, MUSIC.cutoffSwingHz, lowpass.frequency);

  function bank(): Bank {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(lowpass);
    const voices = VOICES.map((voice) => {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.detune.value = voice.detune;
      osc.connect(gain);
      sources.push(osc);
      return { voice, osc };
    });
    return { gain, voices };
  }
  const banks: [Bank, Bank] = [bank(), bank()];

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = MUSIC.airHz;
  band.Q.value = 0.6;
  const air = ctx.createGain();
  air.gain.value = MUSIC.airLevel;
  noise.connect(band).connect(air).connect(master);
  sources.push(noise);
  lfo(MUSIC.airLfoHz, MUSIC.airSwing, air.gain);

  let step = 0;
  let active: 0 | 1 = 0;
  let timer: number | undefined;
  let stopped = false;

  function tune({ voices }: Bank, at: number) {
    for (const { voice, osc } of voices) osc.frequency.setValueAtTime(voiceHz(step, voice), at);
  }

  function wait() {
    window.clearTimeout(timer);
    timer = window.setTimeout(advance, holdSeconds(step) * 1000);
  }

  function advance() {
    step += 1;
    const at = ctx.currentTime;
    const next = active === 0 ? 1 : 0;
    tune(banks[next], at);
    glide(banks[next].gain.gain, MUSIC.bankLevel, at, MUSIC.crossfadeS);
    glide(banks[active].gain.gain, 0, at, MUSIC.crossfadeS);
    active = next;
    wait();
  }

  // A hidden tab needs no sound, so the audio thread sleeps until it shows again.
  function onVisibility() {
    if (document.hidden) {
      window.clearTimeout(timer);
      void ctx.suspend().catch(() => {});
    } else {
      void ctx.resume().catch(() => {});
      wait();
    }
  }

  tune(banks[0], start);
  banks[0].gain.gain.setValueAtTime(MUSIC.bankLevel, start);
  for (const source of sources) source.start(start);
  document.addEventListener("visibilitychange", onVisibility);
  if (document.hidden) onVisibility();
  else wait();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
      const fade = ctx.state === "running" ? MUSIC.fadeOutS : 0;
      glide(master.gain, 0, ctx.currentTime, fade);
      window.setTimeout(
        () => {
          for (const source of sources) source.stop();
          void ctx.close().catch(() => {});
        },
        fade * 1000 + 100,
      );
    },
  };
}
