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

/**
 * The shared audio context. Created on first use, which must be inside a tap
 * (A-7): browsers refuse to start audio from page load.
 */
export async function audioContext(): Promise<AudioContext> {
  if (!context) {
    setAudioSession('playback');
    context = new AudioContext({ latencyHint: 'interactive' });
    // A compressor keeps several notes at once (harmonic intervals, later chords) from clipping.
    const compressor = context.createDynamicsCompressor();
    output = context.createGain();
    output.gain.value = 0.9;
    output.connect(compressor).connect(context.destination);
  }
  // iOS suspends the context when the app goes to the background.
  if (context.state !== 'running') await context.resume();
  return context;
}

/* ---------- The piano-like voice (A-4) ---------- */

interface Voice {
  stop(at: number): void;
}

/**
 * One note: a few sine partials with a fast attack and a decay that is
 * quicker for high notes, as on a piano. The upper partials also make low
 * bass notes audible on phone speakers that cannot reproduce 41 Hz.
 */
function voice(ctx: AudioContext, out: AudioNode, midi: number, start: number, duration: number, reference: number): Voice {
  const hz = midiToFrequency(midi, reference);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(12000, hz * 8);
  gain.connect(filter).connect(out);

  const partials: Array<[number, number, OscillatorType]> = [
    [1, 1, 'triangle'],
    [2, 0.4, 'sine'],
    [3, 0.18, 'sine'],
    [4, midi < 45 ? 0.15 : 0.05, 'sine'],
  ];
  const oscillators = partials
    .filter(([multiple]) => hz * multiple < ctx.sampleRate / 2.2)
    .map(([multiple, level, type]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = hz * multiple;
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start(start);
      return osc;
    });

  const peak = 0.3;
  const decay = Math.max(0.6, 3.2 - (midi - 28) * 0.035); // seconds to fade: long for bass, short for treble
  const end = start + duration;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.008);
  gain.gain.setTargetAtTime(peak * 0.08, start + 0.008, decay / 3);

  const stop = (at: number) => {
    const t = Math.max(at, ctx.currentTime);
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.04); // a short release avoids a click
    for (const osc of oscillators) osc.stop(t + 0.4);
  };
  stop(end);
  return { stop };
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

/** A steady tone on one note, for intonation practice. Replaces any drone already sounding. */
export async function startDrone(midi: number, reference: number): Promise<void> {
  const ctx = await audioContext();
  stopDrone();
  const hz = midiToFrequency(midi, reference);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.3);
  gain.connect(output!);
  // The root, its octave and a quiet fifth above: a full but neutral tone to tune against.
  const oscillators = [
    [1, 1],
    [2, 0.5],
    [3, 0.12],
  ].map(([multiple, level]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz * multiple!;
    g.gain.value = level!;
    osc.connect(g).connect(gain);
    osc.start();
    return osc;
  });
  drone = { oscillators, gain };
}

export function stopDrone(): void {
  if (!drone || !context) return;
  const { oscillators, gain } = drone;
  drone = undefined;
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
  for (const osc of oscillators) osc.stop(context.currentTime + 0.6);
}
