/**
 * Intervals (PRD 5.3): a letter distance (the number) plus a quality.
 *
 * transpose() moves the letter by the interval number first, then picks the
 * accidental that gives the right semitone count. That two-step rule is what
 * makes a perfect 5th above B come out as F♯ and never G♭.
 */
import { type Note, type Pitch, letterAt, letterIndex, midi, mod, naturalSemitones, note, pitchClass } from './note';

export type Quality = 'dd' | 'd' | 'm' | 'M' | 'P' | 'A' | 'AA';

export interface Interval {
  /** 1 = unison, 2 = second … 8 = octave. Compound numbers (9+) are allowed. */
  readonly number: number;
  readonly quality: Quality;
}

export type Direction = 'up' | 'down';

/** Semitones of the major / perfect interval for each simple number, 1–7. */
const BASE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;

function simpleIndex(n: number): number {
  return mod(n - 1, 7);
}

export function isPerfectType(n: number): boolean {
  const i = simpleIndex(n);
  return i === 0 || i === 3 || i === 4;
}

/** Quality → semitone offset from the major (or perfect) interval. */
function qualityOffset(quality: Quality, perfect: boolean): number {
  if (perfect) {
    const offsets: Partial<Record<Quality, number>> = { dd: -2, d: -1, P: 0, A: 1, AA: 2 };
    const o = offsets[quality];
    if (o === undefined) throw new Error(`A perfect-type interval cannot be ${quality}`);
    return o;
  }
  const offsets: Partial<Record<Quality, number>> = { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };
  const o = offsets[quality];
  if (o === undefined) throw new Error(`An imperfect-type interval cannot be ${quality}`);
  return o;
}

function qualityFromOffset(offset: number, perfect: boolean): Quality {
  const table: Record<number, Quality> = perfect
    ? { [-2]: 'dd', [-1]: 'd', 0: 'P', 1: 'A', 2: 'AA' }
    : { [-3]: 'dd', [-2]: 'd', [-1]: 'm', 0: 'M', 1: 'A', 2: 'AA' };
  const q = table[offset];
  if (q === undefined) throw new Error(`No interval quality for offset ${offset}`);
  return q;
}

export function interval(quality: Quality, number: number): Interval {
  qualityOffset(quality, isPerfectType(number)); // validates the pair
  return { quality, number };
}

/** Parse "P5", "m3", "A4", "d5", "M7", "P8". */
export function parseInterval(text: string): Interval {
  const match = /^(dd|d|m|M|P|A|AA)(\d+)$/.exec(text.trim());
  if (!match) throw new Error(`Not an interval: "${text}"`);
  return interval(match[1] as Quality, Number(match[2]));
}

export function semitones(iv: Interval): number {
  const octaves = Math.floor((iv.number - 1) / 7);
  return BASE_SEMITONES[simpleIndex(iv.number)]! + 12 * octaves + qualityOffset(iv.quality, isPerfectType(iv.number));
}

/** Short name: "P5", "m3". */
export function intervalId(iv: Interval): string {
  return `${iv.quality}${iv.number}`;
}

const QUALITY_NAMES: Record<Quality, string> = {
  dd: 'Doubly diminished',
  d: 'Diminished',
  m: 'Minor',
  M: 'Major',
  P: 'Perfect',
  A: 'Augmented',
  AA: 'Doubly augmented',
};

const NUMBER_NAMES: Record<number, string> = { 1: 'unison', 8: 'octave' };

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** Full name: "Perfect 5th", "Minor 3rd", "Perfect octave", "Augmented 4th". */
export function intervalName(iv: Interval): string {
  return `${QUALITY_NAMES[iv.quality]} ${NUMBER_NAMES[iv.number] ?? ordinal(iv.number)}`;
}

/** Shortest alteration that brings `letter` to pitch class `pc`: -6…+5, so naturally ±2 at most for real spellings. */
function alterFor(letterSemitones: number, pc: number): number {
  const a = mod(pc - letterSemitones, 12);
  return a > 6 ? a - 12 : a;
}

/** The note an interval above (or below) `from`, correctly spelled. */
export function transpose(from: Note, iv: Interval, direction: Direction = 'up'): Note {
  const sign = direction === 'up' ? 1 : -1;
  const letter = letterAt(from.letter, sign * (iv.number - 1));
  const pc = pitchClass(from) + sign * semitones(iv);
  return note(letter, alterFor(naturalSemitones(letter), pc));
}

/**
 * A pitch an interval above or below, with the octave carried by the letter:
 * a minor 2nd above B3 is C4, a perfect octave below E4 is E3.
 */
export function transposePitch(from: Pitch, iv: Interval, direction: Direction = 'up'): Pitch {
  const sign = direction === 'up' ? 1 : -1;
  const steps = from.octave * 7 + letterIndex(from) + sign * (iv.number - 1);
  const octave = Math.floor(steps / 7);
  const letter = letterAt('C', steps - octave * 7);
  const target = midi(from) + sign * semitones(iv);
  return { letter, alter: target - (12 * (octave + 1) + naturalSemitones(letter)), octave };
}

/**
 * The simple ascending interval from `lower` up to `upper` (within one octave).
 * Identical notes are a perfect unison. Same letter with a different
 * accidental: upward alterations are augmented unisons (C → C♯), downward ones
 * reach into the next octave (C → C♭ is a diminished octave).
 */
export function intervalBetween(lower: Note, upper: Note): Interval {
  const steps = mod(letterIndex(upper) - letterIndex(lower), 7);
  const semis = mod(pitchClass(upper) - pitchClass(lower), 12);
  if (steps === 0) {
    const diff = upper.alter - lower.alter;
    if (diff >= 0) return interval(qualityFromOffset(diff, true), 1);
    return interval(qualityFromOffset(diff, true), 8);
  }
  // Wrap the semitone difference into -6…+5 around the major/perfect size.
  const offset = alterFor(BASE_SEMITONES[steps]!, semis);
  return interval(qualityFromOffset(offset, isPerfectType(steps + 1)), steps + 1);
}

/* ---------- Scale-degree form (PRD 5.3: "E♭ V" = a perfect 5th above E♭) ---------- */

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

export function romanNumeral(degree: number): string {
  const n = NUMERALS[simpleIndex(degree)];
  if (n === undefined) throw new Error(`No numeral for degree ${degree}`);
  return n;
}

/**
 * The interval a bare Roman numeral stands for above a note. The degrees of
 * the major scale built on that note, as on the paper cards (E♭ V → B♭).
 */
export function numeralInterval(degree: number): Interval {
  const i = simpleIndex(degree);
  return interval(isPerfectType(degree) ? 'P' : 'M', i + 1);
}

/**
 * Degree label relative to the major scale, as used in scale degrees and
 * chord formulas: P5 → "5", m3 → "♭3", A5 → "♯5", d7 → "𝄫7", d5 → "♭5".
 */
export function degreeLabel(iv: Interval): string {
  const perfect = isPerfectType(iv.number);
  const offset = qualityOffset(iv.quality, perfect);
  const symbols: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
  const prefix = symbols[offset];
  if (prefix === undefined) throw new Error(`No degree label for ${intervalId(iv)}`);
  return `${prefix}${iv.number}`;
}
