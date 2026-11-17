/**
 * Sound output (PRD 6.4). The rest of the app only calls play(), stop() and
 * the drone functions, so this synth can be replaced by samples or
 * per-instrument sounds without touching anything else (A-4).
 */
import { midiToFrequency } from '../theory';
import { type NoteEvent, sequenceLength } from './sequence';

/** Safari's audio session API (16.4+); not in the standard DOM types yet. */
type AudioSessionType = 'playback' | 'play-and-record' | 'auto';
interface WithAudioSession {
  audioSession?: { type: AudioSessionType };
}

/**
 * A-8: on iPhone and iPad, web audio follows the silent switch unless the
 * page declares what it is doing. Listening needs 'play-and-record'.
 */
export function setAudioSession(type: AudioSessionType): void {
  const session = (navigator as Navigator & WithAudioSession).audioSession;
  if (!session) return;
  try {
    session.type = type;
  } catch {
    /* older Safari: the type is read-only or the value unknown */
  }
}

/** False in the rare browser without Web Audio; the Play controls are then disabled rather than silent. */
export const audioSupported = typeof AudioContext !== 'undefined';

let context: AudioContext | undefined;
let output: GainNode | undefined;
/** Whether the current context has been running: only then does "not running" mean interrupted. */
let hasRun = false;
/** The context's clock against the wall clock when last checked, to notice a context that has stalled. */
let lastCheck: { audio: number; wall: number } | undefined;

function createContext(): AudioContext {
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  hasRun = ctx.state === 'running';
  lastCheck = undefined;
  ctx.addEventListener('statechange', () => {
    if (ctx === context && ctx.state === 'running') hasRun = true;
  });
  // A compressor keeps several notes at once (harmonic intervals, chords from taps) from clipping.
  const compressor = ctx.createDynamicsCompressor();
  output = ctx.createGain();
  output.gain.value = 0.9;
  output.connect(compressor).connect(ctx.destination);
  return ctx;
}

/** Throw away the audio context. The next tap builds a fresh one (and restarts the drone if one was on). */
export function resetAudio(): void {
  const old = context;
  context = undefined;
  output = undefined;
  hasRun = false;
  lastCheck = undefined;
  playing = undefined;
  drone = undefined;
  touches.clear();
  void old?.close().catch(() => {});
}

/**
 * Whether the context can no longer be trusted (A-9). iOS interrupts a page's
 * audio when the tab is left or the device sleeps. Sometimes it says so (the
 * state leaves "running"); after a long sleep it can keep reporting "running"
 * while its clock has stopped. Both count: a dead context is replaced, never
 * waited on.
 */
function isStale(ctx: AudioContext): boolean {
  if (hasRun && ctx.state !== 'running') return true;
  if (ctx.state !== 'running') return false; // still starting
  const now = { audio: ctx.currentTime, wall: performance.now() / 1000 };
  const previous = lastCheck;
  lastCheck = now;
  // Half a second of real time with a clock that did not move: stalled.
  return !!previous && now.wall - previous.wall > 0.5 && now.audio - previous.audio < 0.05;
}

/**
 * The shared audio context. Call from inside a tap (A-7): browsers refuse to
 * start audio from page load. A new context made inside a tap always starts,
 * which is why a stale one is replaced here.
 */
export async function audioContext(): Promise<AudioContext> {
  if (context && isStale(context)) resetAudio();
  if (!context) {
    setAudioSession('playback');
    context = createContext();
    // A drone that was sounding before the audio was lost carries on.
    if (droneSpec) void startDrone(droneSpec.midi, droneSpec.reference);
  }
  const ctx = context;
  // A new context can report "suspended" for a moment even inside a tap.
  if (ctx.state !== 'running') await ctx.resume();
  if (ctx === context && ctx.state === 'running') hasRun = true;
  return ctx;
}

/**
 * A context for analysing the microphone, without waiting for it to start:
 * outside a tap the start can stall, and the caller keeps nudging it.
 */
export function listeningContext(): AudioContext {
  context ??= createContext();
  if (context.state !== 'running') void context.resume().catch(() => {});
  return context;
}

/* ---------- Voices (A-4) ---------- */

/** The partials of one note. The upper ones keep low bass notes audible on phone speakers that cannot reproduce 41 Hz. */
function oscillatorsFor(ctx: AudioContext, into: AudioNode, midi: number, hz: number, start: number): OscillatorNode[] {
  const partials: Array<[number, number, OscillatorType]> = [
    [1, 1, 'triangle'],
    [2, 0.4, 'sine'],
    [3, 0.18, 'sine'],
    [4, midi < 45 ? 0.15 : 0.05, 'sine'],
  ];
  return partials
    .filter(([multiple]) => hz * multiple < ctx.sampleRate / 2.2)
    .map(([multiple, level, type]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = hz * multiple;
      g.gain.value = level;
      osc.connect(g).connect(into);
      osc.start(start);
      return osc;
    });
}

function voiceChain(ctx: AudioContext, out: AudioNode, hz: number): GainNode {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(12000, hz * 8);
  gain.connect(filter).connect(out);
  return gain;
}

const PEAK = 0.3;

interface Voice {
  stop(at: number): void;
}

/**
 * A note of fixed length, for Play: a fast attack and a decay that is quicker
 * for high notes, as on a piano.
 */
function voice(ctx: AudioContext, out: AudioNode, midi: number, start: number, duration: number, reference: number): Voice {
  const hz = midiToFrequency(midi, reference);
  const gain = voiceChain(ctx, out, hz);
  const oscillators = oscillatorsFor(ctx, gain, midi, hz, start);

  const decay = Math.max(0.6, 3.2 - (midi - 28) * 0.035); // seconds to fade: long for bass, short for treble
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(PEAK, start + 0.008);
  gain.gain.setTargetAtTime(PEAK * 0.08, start + 0.008, decay / 3);

  const stop = (at: number) => {
    const t = Math.max(at, ctx.currentTime);
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.04); // a short release avoids a click
    for (const osc of oscillators) osc.stop(t + 0.4);
  };
  stop(start + duration);
  return { stop };
}

/* ---------- Notes held by touch (V-7) ---------- */

/** The shape of a touched note: seconds to rise, seconds to settle, the level held (0–1), seconds to fade. */
export interface Envelope {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export const ENVELOPE_RANGE = {
  attack: { min: 0.005, max: 0.5, default: 0.01 },
  decay: { min: 0.05, max: 2, default: 0.5 },
  sustain: { min: 0, max: 1, default: 0.5 },
  release: { min: 0.03, max: 3, default: 0.3 },
} as const;

/** Notes sounding under fingers, by MIDI number. */
const touches = new Map<number, { release(): void }>();

function touchVoice(ctx: AudioContext, midi: number, reference: number, env: Envelope): { release(): void } {
  const hz = midiToFrequency(midi, reference);
  const gain = voiceChain(ctx, output!, hz);
  const start = ctx.currentTime + 0.005;
  const oscillators = oscillatorsFor(ctx, gain, midi, hz, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(PEAK, start + env.attack);
  gain.gain.setTargetAtTime(PEAK * env.sustain, start + env.attack, env.decay / 3);
  return {
    release() {
      // Let even the quickest tap reach its attack before it fades.
      const t = Math.max(ctx.currentTime, start + env.attack);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, env.release / 3);
      for (const osc of oscillators) osc.stop(t + env.release * 2 + 0.1);
    },
  };
}

/**
 * A finger went down on a note: it sounds until touchEnd, on top of anything
 * else sounding, so several fingers make a chord. Returns false when audio
 * is not running yet: a touch going down does not count as a tap for the
 * browser's autoplay rule, so the caller sounds the note when the finger lifts.
 */
export function touchStart(midi: number, reference: number, env: Envelope): boolean {
  if (!audioSupported) return false;
  if (!context || context.state !== 'running' || isStale(context)) {
    void audioContext().catch(() => {});
    return false;
  }
  touches.get(midi)?.release();
  touches.set(midi, touchVoice(context, midi, reference, env));
  return true;
}

/** The finger lifted: the note fades over its release time. */
export function touchEnd(midi: number): void {
  touches.get(midi)?.release();
  touches.delete(midi);
}

export function releaseAllTouches(): void {
  for (const midi of [...touches.keys()]) touchEnd(midi);
}

/** A short note for a touch that could not sound on the way down. Call when the finger lifts: that is a real tap, so audio may start. */
export async function touchTap(midi: number, reference: number, env: Envelope): Promise<void> {
  if (!audioSupported) return;
  const ctx = await audioContext();
  const note = touchVoice(ctx, midi, reference, env);
  setTimeout(() => note.release(), (env.attack + 0.15) * 1000);
}

/* ---------- Playback ---------- */

let playing: { voices: Voice[]; timer: ReturnType<typeof setTimeout> } | undefined;

/** Stop whatever is playing. Safe to call at any time. */
export function stop(): void {
  if (!playing || !context) return;
  clearTimeout(playing.timer);
  for (const v of playing.voices) v.stop(context.currentTime);
  playing = undefined;
}

/**
 * Play notes. Call from a tap. `onEnd` runs when the last note has finished
 * or playback was replaced by another call; it does not run after stop().
 */
export async function play(events: readonly NoteEvent[], reference: number, onEnd?: () => void): Promise<void> {
  const ctx = await audioContext();
  stop();
  if (events.length === 0) {
    onEnd?.();
    return;
  }
  const t0 = ctx.currentTime + 0.06;
  const voices = events.map((e) => voice(ctx, output!, e.midi, t0 + e.start, e.duration, reference));
  const timer = setTimeout(
    () => {
      playing = undefined;
      onEnd?.();
    },
    (sequenceLength(events) + 0.3) * 1000,
  );
  playing = { voices, timer };
}

/* ---------- Drone (A-5) ---------- */

let drone: { oscillators: OscillatorNode[]; gain: GainNode } | undefined;
/** What the drone should be sounding, kept so it can restart on a new audio context. */
let droneSpec: { midi: number; reference: number } | undefined;

/**
 * A steady tone on one note, for intonation practice. Replaces any drone
 * already sounding. It sits below the answer, where small speakers are weak,
 * so it is built from a triangle wave and strong upper partials and played
 * as loud as a note: pure low sine tones were close to inaudible on a phone.
 */
export async function startDrone(midi: number, reference: number): Promise<void> {
  droneSpec = { midi, reference };
  const ctx = await audioContext();
  silenceDrone();
  const hz = midiToFrequency(midi, reference);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.3);
  gain.connect(output!);
  const partials: Array<[number, number, OscillatorType]> = [
    [1, 1, 'triangle'],
    [2, 0.7, 'sine'],
    [3, 0.4, 'sine'],
    [4, 0.25, 'sine'],
  ];
  const oscillators = partials.map(([multiple, level, type]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz * multiple;
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start();
    return osc;
  });
  drone = { oscillators, gain };
}

function silenceDrone(): void {
  if (!drone || !context) return;
  const { oscillators, gain } = drone;
  drone = undefined;
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
  for (const osc of oscillators) osc.stop(context.currentTime + 0.6);
}

export function stopDrone(): void {
  droneSpec = undefined;
  silenceDrone();
}
