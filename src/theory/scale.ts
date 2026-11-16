/**
 * Scales (PRD 5.2). Built from interval formulas on a tonic, so spelling
 * follows the interval rules: one note per letter, in order.
 */
import { type Interval, degreeLabel, parseInterval, transpose } from './interval';
import { type Key, type KeySignature, MAJOR_KEYS, MINOR_KEYS, type Mode, key, keySignature } from './key';
import type { Note } from './note';

export const SCALE_TYPES = ['major', 'natural-minor', 'harmonic-minor', 'melodic-minor'] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

interface ScaleTypeInfo {
  readonly name: string;
  /** The key whose signature the scale is written with. */
  readonly mode: Mode;
  /** Intervals from the tonic for degrees 1–7, ascending. */
  readonly ascending: readonly Interval[];
  /** Descending form when it differs (classical melodic minor descends as natural minor). */
  readonly descending?: readonly Interval[];
}

const formula = (s: string): Interval[] => s.split(' ').map(parseInterval);

const NATURAL_MINOR = formula('P1 M2 m3 P4 P5 m6 m7');

export const SCALE_INFO: Record<ScaleType, ScaleTypeInfo> = {
  major: { name: 'major', mode: 'major', ascending: formula('P1 M2 M3 P4 P5 M6 M7') },
  'natural-minor': { name: 'natural minor', mode: 'minor', ascending: NATURAL_MINOR },
  'harmonic-minor': { name: 'harmonic minor', mode: 'minor', ascending: formula('P1 M2 m3 P4 P5 m6 M7') },
  'melodic-minor': {
    name: 'melodic minor',
    mode: 'minor',
    ascending: formula('P1 M2 m3 P4 P5 M6 M7'),
    descending: NATURAL_MINOR,
  },
};

export interface ScaleDegree {
  /** 1–8; 8 is the tonic an octave up. */
  readonly degree: number;
  readonly note: Note;
  /** Relative to the major scale: "1", "♭3", "♯4". */
  readonly label: string;
}

export interface Scale {
  readonly tonic: Note;
  readonly type: ScaleType;
  readonly key: Key;
  readonly signature: KeySignature;
  /** Degrees 1–8, ascending. */
  readonly degrees: readonly ScaleDegree[];
  /** Degrees 8 down to 1. Differs from the reversed ascending form for melodic minor. */
  readonly descending: readonly ScaleDegree[];
}

function degreesOf(tonic: Note, intervals: readonly Interval[]): ScaleDegree[] {
  const degrees = intervals.map((iv, i) => ({ degree: i + 1, note: transpose(tonic, iv), label: degreeLabel(iv) }));
  return [...degrees, { degree: 8, note: tonic, label: '8' }];
}

export function scale(tonic: Note, type: ScaleType): Scale {
  const info = SCALE_INFO[type];
  const k = key(tonic, info.mode);
  const degrees = degreesOf(tonic, info.ascending);
  return {
    tonic,
    type,
    key: k,
    signature: keySignature(k),
    degrees,
    descending: info.descending ? degreesOf(tonic, info.descending).reverse() : [...degrees].reverse(),
  };
}

/** The seven notes, degrees 1–7. */
export function scaleNotes(s: Scale): Note[] {
  return s.degrees.slice(0, 7).map((d) => d.note);
}

/** Degree 1–8 of a scale (F-5 scale degree cards: "6th of A♭ major" → F). */
export function scaleDegree(s: Scale, degree: number): Note {
  const d = s.degrees[degree - 1];
  if (!d) throw new Error(`No degree ${degree}`);
  return d.note;
}

/** The 15 tonics with a standard signature for this scale type. */
export function scaleTonics(type: ScaleType): Note[] {
  return (SCALE_INFO[type].mode === 'major' ? MAJOR_KEYS : MINOR_KEYS).map((k) => k.tonic);
}

/** "E♭ harmonic minor" */
export function scaleTypeName(type: ScaleType): string {
  return SCALE_INFO[type].name;
}
