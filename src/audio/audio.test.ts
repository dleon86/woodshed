import { describe, expect, it } from 'vitest';
import { midiToFrequency } from '../theory';
import { detectPitch, level, tunerReading } from './pitch';
import { type PlaybackOptions, sequenceFor, sequenceLength } from './sequence';

const options = (o: Partial<PlaybackOptions> = {}): PlaybackOptions => ({
  tempo: 120,
  scale: 'up',
  interval: 'melodic',
  ...o,
});
const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72];
const order = (events: readonly { midi: number; start: number }[]) =>
  [...events].sort((a, b) => a.start - b.start).map((e) => e.midi);

describe('sequences (A-1, A-3)', () => {
  it('plays a scale up, down, or both without repeating the top note', () => {
    expect(order(sequenceFor('scale', C_MAJOR, options()))).toEqual(C_MAJOR);
    expect(order(sequenceFor('scale', C_MAJOR, options({ scale: 'down' })))).toEqual([...C_MAJOR].reverse());
    expect(order(sequenceFor('scale', C_MAJOR, options({ scale: 'both' })))).toEqual([
      60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60,
    ]);
  });

  it('spaces notes one beat apart at the chosen tempo', () => {
    const at120 = sequenceFor('scale', C_MAJOR, options({ tempo: 120 }));
    const at60 = sequenceFor('scale', C_MAJOR, options({ tempo: 60 }));
    expect(at120.map((e) => e.start)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(at60[1]!.start).toBe(1);
    expect(sequenceLength(at60)).toBe(2 * sequenceLength(at120));
  });

  it('plays an interval as melody, harmony, or both', () => {
    const fifth = [63, 70];
    expect(order(sequenceFor('interval', fifth, options()))).toEqual([63, 70]);
    // Asked downward, the melody starts on the upper note.
    expect(order(sequenceFor('interval', fifth, options(), true))).toEqual([70, 63]);

    const harmonic = sequenceFor('interval', fifth, options({ interval: 'harmonic' }));
    expect(new Set(harmonic.map((e) => e.start))).toEqual(new Set([0]));

    const both = sequenceFor('interval', fifth, options({ interval: 'both' }));
    expect(both).toHaveLength(4);
    const [, , third, fourth] = [...both].sort((a, b) => a.start - b.start);
    expect(third!.start).toBe(fourth!.start); // the harmony sounds together…
    expect(third!.start).toBeGreaterThan(1); // …after the melody has finished
  });

  it('handles nothing to play', () => {
    expect(sequenceFor('scale', [], options())).toEqual([]);
    expect(sequenceLength([])).toBe(0);
  });
});

/** A wave with overtones, like a plucked string: harder than a pure sine because harmonics invite octave errors. */
function wave(hz: number, sampleRate: number, length: number, harmonics = [1, 0.5, 0.3, 0.2]): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let v = 0;
    harmonics.forEach((gain, h) => (v += gain * Math.sin((2 * Math.PI * hz * (h + 1) * i) / sampleRate)));
    out[i] = v * 0.3;
  }
  return out;
}

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe('pitch detection (P-1, P-2)', () => {
  const RATE = 48000;
  const SIZE = 4096;

  it('finds every note from bass low E to the top of the guitar within 5 cents', () => {
    for (let midi = 28; midi <= 88; midi++) {
      const hz = midiToFrequency(midi);
      const reading = detectPitch(wave(hz, RATE, SIZE), RATE);
      expect(reading, `midi ${midi}`).not.toBeNull();
      expect(Math.abs(cents(reading!.hz, hz)), `midi ${midi}: ${reading!.hz} vs ${hz}`).toBeLessThan(5);
    }
  });

  it('follows the keyboard to its top note and a whistle (P-2)', () => {
    // Periods are only a dozen samples long up here, so allow a little more error.
    for (let midi = 89; midi <= 108; midi++) {
      const hz = midiToFrequency(midi);
      const reading = detectPitch(wave(hz, RATE, SIZE, [1, 0.3]), RATE);
      expect(reading, `midi ${midi}`).not.toBeNull();
      expect(Math.abs(cents(reading!.hz, hz)), `midi ${midi}: ${reading!.hz} vs ${hz}`).toBeLessThan(15);
    }
    const whistle = detectPitch(wave(2000, RATE, SIZE, [1]), RATE)!;
    expect(Math.abs(cents(whistle.hz, 2000))).toBeLessThan(10);
  });

  it('measures loudness', () => {
    expect(level(new Float32Array(SIZE))).toBe(0);
    expect(level(wave(440, RATE, SIZE, [1]))).toBeCloseTo(0.3 / Math.SQRT2, 2);
  });

  it('reaches 5-string bass low B and works at 44.1 kHz', () => {
    const lowB = midiToFrequency(23);
    expect(Math.abs(cents(detectPitch(wave(lowB, RATE, SIZE), RATE)!.hz, lowB))).toBeLessThan(10);
    const a = detectPitch(wave(440, 44100, SIZE), 44100)!;
    expect(Math.abs(cents(a.hz, 440))).toBeLessThan(5);
  });

  it('does not report the octave below when the fundamental is weak', () => {
    // Strong 2nd harmonic, as on a guitar's low strings.
    const reading = detectPitch(wave(110, RATE, SIZE, [0.4, 1, 0.5]), RATE)!;
    expect(Math.abs(cents(reading.hz, 110))).toBeLessThan(5);
  });

  it('returns nothing for silence and for noise', () => {
    expect(detectPitch(new Float32Array(SIZE), RATE)).toBeNull();
    let seed = 1;
    const noise = Float32Array.from({ length: SIZE }, () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 0.6;
    });
    expect(detectPitch(noise, RATE)).toBeNull();
  });
});

describe('tuner reading (P-6)', () => {
  it('names the nearest note and the cents off', () => {
    expect(tunerReading(440)).toMatchObject({ midi: 69, cents: 0 });
    expect(tunerReading(midiToFrequency(69) * 2 ** (20 / 1200))).toMatchObject({ midi: 69, cents: 20 });
    expect(tunerReading(midiToFrequency(40) * 2 ** (-35 / 1200))).toMatchObject({ midi: 40, cents: -35 });
    expect(tunerReading(442, 442)).toMatchObject({ midi: 69, cents: 0 }); // A-6 reference pitch
  });
});
