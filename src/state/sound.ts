import { effect, signal } from '@preact/signals';
import { type MicSession, type MicState, startMic } from '../audio/mic';
import { type TunerReading, tunerReading } from '../audio/pitch';
import { audioContext, play, startDrone, stop, stopDrone } from '../audio/player';
import {
  INTERVAL_PATTERNS,
  type IntervalPattern,
  SCALE_PATTERNS,
  type ScalePattern,
  TEMPO_RANGE,
  sequenceFor,
} from '../audio/sequence';
import type { Show } from '../cards';
import { placeNotes } from '../instruments';
import { midi, sameNote } from '../theory';
import { profile } from './session';
import { load, loadJson, save } from './storage';
import { activeRange } from './views';

/* ---------- Settings (PRD 6.4, 6.8) ---------- */

const numberIn = (min: number, max: number) => (v: unknown) =>
  typeof v === 'number' && v >= min && v <= max ? v : undefined;

/** A-3: beats per minute for scales and melodic intervals. */
export const tempo = signal<number>(loadJson('tempo', numberIn(TEMPO_RANGE.min, TEMPO_RANGE.max), TEMPO_RANGE.default));
effect(() => save('tempo', String(tempo.value)));

export const scalePattern = signal<ScalePattern>(load('scalePlay', SCALE_PATTERNS, 'up'));
effect(() => save('scalePlay', scalePattern.value));

export const intervalPattern = signal<IntervalPattern>(load('intervalPlay', INTERVAL_PATTERNS, 'both'));
effect(() => save('intervalPlay', intervalPattern.value));

/** A-6: the frequency of A4. */
export const REFERENCE_RANGE = { min: 415, max: 466, default: 440 } as const;
export const referencePitch = signal<number>(
  loadJson('reference', numberIn(REFERENCE_RANGE.min, REFERENCE_RANGE.max), REFERENCE_RANGE.default),
);
effect(() => save('reference', String(referencePitch.value)));

/* ---------- Playback (A-1, A-2) ---------- */

/** True while an answer is sounding. */
export const playing = signal(false);

/** The answer's notes as sounding MIDI pitches for the active instrument (A-2). */
function soundingMidis(show: Show): number[] {
  return placeNotes(show.notes, profile.value, activeRange.value).map(midi);
}

/** Play an answer. Must be called from a tap (A-7). Does nothing while the mic is listening (P-8). */
export function playShow(show: Show): void {
  if (micState.value === 'listening' || micState.value === 'asking') return;
  const events = sequenceFor(
    show.kind,
    soundingMidis(show),
    { tempo: tempo.value, scale: scalePattern.value, interval: intervalPattern.value },
    show.descending,
  );
  playing.value = true;
  void play(events, referencePitch.value, () => (playing.value = false)).catch(() => (playing.value = false));
}

export function stopPlaying(): void {
  stop();
  playing.value = false;
}

/* ---------- Drone (A-5) ---------- */

/** Whether the drone is switched on. It sounds the root of whatever answer is showing. */
export const droneOn = signal(false);

/**
 * Switch the drone on or off. Call from the tap itself: the drone starts
 * from an effect a moment later, and iOS only lets audio begin inside a tap (A-7).
 */
export function toggleDrone(): void {
  droneOn.value = !droneOn.value;
  if (droneOn.value) void audioContext().catch(() => {});
}
let droning: number | undefined;

/**
 * The root as it is placed on screen, an octave lower, so the drone sits
 * under the notes instead of on top of them.
 */
function droneMidi(show: Show): number {
  const placed = soundingMidis(show);
  const rootIndex = Math.max(0, show.notes.findIndex((n) => sameNote(n, show.root)));
  return placed[rootIndex]! - 12;
}

/** Point the drone at an answer's root, or silence it when there is nothing to drone on. */
export function droneFor(show: Show | undefined): void {
  const listening = micState.value === 'listening' || micState.value === 'asking';
  const target = droneOn.value && show && !listening ? droneMidi(show) : undefined;
  if (target === droning) return;
  droning = target;
  if (target === undefined) stopDrone();
  else void startDrone(target, referencePitch.value).catch(() => (droning = undefined));
}

/* ---------- Mic check (rough tuner for M4; the real tuner is M7) ---------- */

export const micState = signal<MicState>('off');
export const micError = signal('');
export const tuner = signal<TunerReading | null>(null);
let mic: MicSession | undefined;

export async function startMicCheck(): Promise<void> {
  if (mic) return;
  // P-8: never play through the speaker while listening.
  stopPlaying();
  droneOn.value = false;
  stopDrone();
  droning = undefined;
  mic = await startMic(
    (reading) => {
      // Hold the last reading through brief gaps so the display does not flicker.
      if (reading && reading.clarity > 0.8) tuner.value = tunerReading(reading.hz, referencePitch.value);
    },
    (state, detail) => {
      micState.value = state;
      micError.value = detail ?? '';
    },
  );
  // A refused or missing mic leaves nothing to stop, so the next tap can try again.
  if (micState.value !== 'listening') mic = undefined;
}

export function stopMicCheck(): void {
  mic?.stop();
  mic = undefined;
  tuner.value = null;
}
