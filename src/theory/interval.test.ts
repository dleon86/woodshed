import { describe, expect, it } from 'vitest';
import {
  type Direction,
  type Interval,
  degreeLabel,
  intervalBetween,
  intervalId,
  intervalName,
  numeralInterval,
  parseInterval,
  romanNumeral,
  semitones,
  transpose,
} from './interval';
import { LETTERS, letterIndex, mod, noteName, parseNote, pitchClass } from './note';

/** PRD 5.3 v1: m2 to P8, with the tritone as both A4 and d5. */
const V1_INTERVALS = 'm2 M2 m3 M3 P4 A4 d5 P5 m6 M6 m7 M7 P8'.split(' ').map(parseInterval);

/** Roots used for interval cards: every natural, sharp and flat (21). */
const ROOTS = LETTERS.flatMap((letter) => [-1, 0, 1].map((alter) => ({ letter, alter })));

const DIRECTIONS: Direction[] = ['up', 'down'];

const up = (root: string, iv: string) => noteName(transpose(parseNote(root), parseInterval(iv)));
const down = (root: string, iv: string) => noteName(transpose(parseNote(root), parseInterval(iv), 'down'));

describe('interval sizes and names', () => {
  it('have the right semitone counts', () => {
    expect(V1_INTERVALS.map(semitones)).toEqual([1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12]);
    expect(semitones(parseInterval('M9'))).toBe(14);
    expect(semitones(parseInterval('d7'))).toBe(9);
  });

  it('read naturally', () => {
    expect(intervalName(parseInterval('P5'))).toBe('Perfect 5th');
    expect(intervalName(parseInterval('m3'))).toBe('Minor 3rd');
    expect(intervalName(parseInterval('A4'))).toBe('Augmented 4th');
    expect(intervalName(parseInterval('d5'))).toBe('Diminished 5th');
    expect(intervalName(parseInterval('P8'))).toBe('Perfect octave');
    expect(intervalName(parseInterval('M2'))).toBe('Major 2nd');
    expect(intervalName(parseInterval('M13'))).toBe('Major 13th');
  });

  it('reject impossible qualities', () => {
    expect(() => parseInterval('M5')).toThrow();
    expect(() => parseInterval('P3')).toThrow();
  });
});

describe('transpose', () => {
  it('matches the green paper cards (note + V)', () => {
    const cards: Array<[string, string]> = [
      ['Eb', 'B♭'],
      ['A', 'E'],
      ['G', 'D'],
      ['E', 'B'],
      ['C', 'G'],
    ];
    for (const [front, back] of cards) expect(up(front, 'P5')).toBe(back);
  });

  it('spells by letter, not by sound', () => {
    expect(up('B', 'P5')).toBe('F♯');
    expect(up('C#', 'M3')).toBe('E♯');
    expect(up('Cb', 'd5')).toBe('G𝄫');
    expect(up('A#', 'A4')).toBe('D𝄪');
    expect(up('C', 'A4')).toBe('F♯');
    expect(up('C', 'd5')).toBe('G♭');
    expect(down('Eb', 'P5')).toBe('A♭');
    expect(down('C', 'm2')).toBe('B');
    expect(down('F', 'A4')).toBe('C♭');
  });

  it('is correct for every root, interval and direction', () => {
    for (const root of ROOTS) {
      for (const iv of V1_INTERVALS) {
        for (const dir of DIRECTIONS) {
          const target = transpose(root, iv, dir);
          const sign = dir === 'up' ? 1 : -1;
          const where = `${noteName(root)} ${dir} ${intervalId(iv)} = ${noteName(target)}`;
          // Letter moved by the interval number…
          expect(mod(letterIndex(target) - letterIndex(root), 7), where).toBe(mod(sign * (iv.number - 1), 7));
          // …and the sound moved by the semitone count.
          expect(mod(pitchClass(target) - pitchClass(root), 12), where).toBe(mod(sign * semitones(iv), 12));
          // Single-accidental roots never need more than a double accidental.
          expect(Math.abs(target.alter), where).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe('intervalBetween', () => {
  it('names intervals between spelled notes', () => {
    const name = (a: string, b: string) => intervalId(intervalBetween(parseNote(a), parseNote(b)));
    expect(name('Eb', 'Bb')).toBe('P5');
    expect(name('C', 'F#')).toBe('A4');
    expect(name('C', 'Gb')).toBe('d5');
    expect(name('E', 'C')).toBe('m6');
    expect(name('C', 'C')).toBe('P1');
    expect(name('C', 'C#')).toBe('A1');
    expect(name('C', 'Cb')).toBe('d8');
    expect(name('B', 'F')).toBe('d5');
    expect(name('F', 'B')).toBe('A4');
  });

  it('inverts transpose for every root and interval', () => {
    for (const root of ROOTS) {
      for (const iv of V1_INTERVALS) {
        const above = transpose(root, iv);
        const expected: Interval = iv.number === 8 ? { quality: 'P', number: 1 } : iv;
        expect(intervalBetween(root, above), `${noteName(root)} → ${noteName(above)}`).toEqual(expected);
        // Descending: the note below, then measured upward back to the root.
        const below = transpose(root, iv, 'down');
        expect(intervalBetween(below, root)).toEqual(expected);
      }
    }
  });
});

describe('scale-degree form', () => {
  it('maps numerals to the major-scale degree above the note ("E♭ V" = B♭)', () => {
    expect(romanNumeral(5)).toBe('V');
    expect(intervalId(numeralInterval(5))).toBe('P5');
    expect(noteName(transpose(parseNote('Eb'), numeralInterval(5)))).toBe('B♭');
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => intervalId(numeralInterval(d)))).toEqual([
      'P1',
      'M2',
      'M3',
      'P4',
      'P5',
      'M6',
      'M7',
    ]);
  });

  it('labels degrees relative to the major scale', () => {
    expect('P1 m3 d5 d7 A5 M7'.split(' ').map((s) => degreeLabel(parseInterval(s)))).toEqual([
      '1',
      '♭3',
      '♭5',
      '𝄫7',
      '♯5',
      '7',
    ]);
  });
});
