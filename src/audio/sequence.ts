/**
 * Turning an answer into timed notes (A-1, A-3). Pure: no Web Audio here, so
 * it is unit-tested, and any sound source can play the result (A-4).
 */

export interface NoteEvent {
  readonly midi: number;
  /** Seconds from the start of playback. */
  readonly start: number;
  /** Seconds the note is held before it is released. */
  readonly duration: number;
}

export const SCALE_PATTERNS = ['up', 'down', 'both'] as const;
export type ScalePattern = (typeof SCALE_PATTERNS)[number];

export const INTERVAL_PATTERNS = ['melodic', 'harmonic', 'both'] as const;
export type IntervalPattern = (typeof INTERVAL_PATTERNS)[number];

export interface PlaybackOptions {
  /** Beats per minute; one scale note per beat (A-3). */
  readonly tempo: number;
  readonly scale: ScalePattern;
  readonly interval: IntervalPattern;
}

export const TEMPO_RANGE = { min: 40, max: 240, default: 120 } as const;

/** One after another, each held for most of a beat; the last note rings longer. */
function melody(midis: readonly number[], beat: number, from = 0): NoteEvent[] {
  return midis.map((midi, i) => ({
    midi,
    start: from + i * beat,
    duration: i === midis.length - 1 ? beat * 2 : beat * 0.95,
  }));
}

/** All at once. */
function together(midis: readonly number[], beat: number, from = 0): NoteEvent[] {
  return midis.map((midi) => ({ midi, start: from, duration: beat * 3 }));
}

/**
 * The notes to play for an answer. `midis` are sounding pitches, lowest first.
 * Scales run up, down, or up and back down without repeating the top note.
 * Intervals play as a melody (from the upper note when asked downward), as a
 * harmony, or the melody and then the harmony.
 */
export function sequenceFor(
  kind: 'scale' | 'interval',
  midis: readonly number[],
  options: PlaybackOptions,
  descending = false,
): NoteEvent[] {
  if (midis.length === 0) return [];
  const beat = 60 / options.tempo;
  const down = [...midis].reverse();

  if (kind === 'scale') {
    if (options.scale === 'up') return melody(midis, beat);
    if (options.scale === 'down') return melody(down, beat);
    return melody([...midis, ...down.slice(1)], beat);
  }

  const line = melody(descending ? down : midis, beat);
  if (options.interval === 'melodic') return line;
  if (options.interval === 'harmonic') return together(midis, beat);
  // Melody, a short breath, then both notes together.
  return [...line, ...together(midis, beat, (midis.length + 1.5) * beat)];
}

/** Seconds until the last note has been released. */
export function sequenceLength(events: readonly NoteEvent[]): number {
  return Math.max(0, ...events.map((e) => e.start + e.duration));
}
