/**
 * Pitch detection for one note at a time (P-1, P-2), using the YIN method:
 * find the shortest lag at which the signal best matches a shifted copy of
 * itself. Pure math on a buffer of samples, so it is unit-tested with
 * synthetic waves; the microphone code only feeds it.
 */

export interface PitchReading {
  /** Fundamental frequency in Hz. */
  readonly hz: number;
  /** 0–1: how periodic the signal is. Low values are noise or several notes. */
  readonly clarity: number;
}

export interface DetectOptions {
  /** Lowest and highest frequency searched. Defaults cover 5-string bass low B to the top of the piano (P-2). */
  readonly minHz?: number;
  readonly maxHz?: number;
  /**
   * Below this RMS level the buffer counts as silence. Kept very low: with automatic gain off
   * (PRD section 8) some devices deliver a quiet signal, and the periodicity test below already
   * rejects noise at any level.
   */
  readonly silence?: number;
  /** YIN threshold: lower is stricter. */
  readonly threshold?: number;
}

/** The buffer must hold at least two periods of the lowest note: 4096 samples at 48 kHz reaches below 30 Hz. */
export function detectPitch(
  samples: Float32Array | readonly number[],
  sampleRate: number,
  options: DetectOptions = {},
): PitchReading | null {
  const { minHz = 28, maxHz = 4300, silence = 0.0008, threshold = 0.15 } = options;
  const n = samples.length;

  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i]! * samples[i]!;
  if (Math.sqrt(energy / n) < silence) return null;

  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(n / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  if (maxLag <= minLag) return null;

  // Difference function, then YIN's cumulative mean normalisation, which
  // removes the bias toward lag 0 and makes one threshold work at all pitches.
  const window = n - maxLag;
  const normalised = new Float32Array(maxLag + 1);
  normalised[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let diff = 0;
    for (let i = 0; i < window; i++) {
      const d = samples[i]! - samples[i + lag]!;
      diff += d * d;
    }
    running += diff;
    normalised[lag] = running === 0 ? 1 : (diff * lag) / running;
  }

  // First dip under the threshold, followed down to its local minimum. Taking
  // the first one (the shortest lag) is what avoids octave-too-low errors.
  let best = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (normalised[lag]! < threshold) {
      while (lag + 1 <= maxLag && normalised[lag + 1]! < normalised[lag]!) lag++;
      best = lag;
      break;
    }
  }
  if (best === -1) return null;

  // Parabolic interpolation between samples for sub-sample accuracy (cents matter for a tuner).
  const a = normalised[best - 1] ?? normalised[best]!;
  const b = normalised[best]!;
  const c = normalised[best + 1] ?? normalised[best]!;
  const denominator = a - 2 * b + c;
  const shift = denominator === 0 ? 0 : (0.5 * (a - c)) / denominator;

  return { hz: sampleRate / (best + shift), clarity: Math.max(0, 1 - b) };
}

/** Loudness of a buffer, 0–1 (root mean square). */
export function level(samples: Float32Array | readonly number[]): number {
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i]! * samples[i]!;
  return samples.length ? Math.sqrt(energy / samples.length) : 0;
}

/** A frequency as the nearest note and how far off it is. */
export interface TunerReading {
  /** Nearest MIDI note. */
  readonly midi: number;
  /** -50…+50: negative is flat, positive is sharp. */
  readonly cents: number;
  readonly hz: number;
}

export function tunerReading(hz: number, reference = 440): TunerReading {
  const exact = 69 + 12 * Math.log2(hz / reference);
  const midi = Math.round(exact);
  return { midi, cents: Math.round((exact - midi) * 100), hz };
}
