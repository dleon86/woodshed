/**
 * Chords (PRD 5.4): notes, formula, inversions, and which keys contain them.
 * Chords are spelled from interval formulas, so they stack in letter thirds
 * (C♯ E G♯ B, never C♯ E A♭ B).
 */
import { type Interval, degreeLabel, intervalBetween, intervalId, parseInterval, transpose } from './interval';
import { type Key, MAJOR_KEYS, MINOR_KEYS } from './key';
import { type Note, noteName, sameNote } from './note';
import { SCALE_TYPES, type Scale, type ScaleType, scale, scaleNotes } from './scale';

export const CHORD_TYPES = ['maj', 'min', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7'] as const;
export type ChordType = (typeof CHORD_TYPES)[number];

interface ChordTypeInfo {
  readonly name: string;
  /** Written after the root: "", "m", "°", "+", "maj7" … */
  readonly symbol: string;
  readonly intervals: readonly Interval[];
}

const formula = (s: string): Interval[] => s.split(' ').map(parseInterval);

export const CHORD_INFO: Record<ChordType, ChordTypeInfo> = {
  maj: { name: 'major', symbol: '', intervals: formula('P1 M3 P5') },
  min: { name: 'minor', symbol: 'm', intervals: formula('P1 m3 P5') },
  dim: { name: 'diminished', symbol: '°', intervals: formula('P1 m3 d5') },
  aug: { name: 'augmented', symbol: '+', intervals: formula('P1 M3 A5') },
  maj7: { name: 'major 7th', symbol: 'maj7', intervals: formula('P1 M3 P5 M7') },
  '7': { name: 'dominant 7th', symbol: '7', intervals: formula('P1 M3 P5 m7') },
  m7: { name: 'minor 7th', symbol: 'm7', intervals: formula('P1 m3 P5 m7') },
  m7b5: { name: 'half-diminished 7th', symbol: 'm7♭5', intervals: formula('P1 m3 d5 m7') },
  dim7: { name: 'diminished 7th', symbol: '°7', intervals: formula('P1 m3 d5 d7') },
  mMaj7: { name: 'minor-major 7th', symbol: 'm(maj7)', intervals: formula('P1 m3 P5 M7') },
};

export interface Chord {
  readonly root: Note;
  readonly type: ChordType;
  /** Root position, root first. */
  readonly notes: readonly Note[];
}

export function chord(root: Note, type: ChordType): Chord {
  return { root, type, notes: CHORD_INFO[type].intervals.map((iv) => transpose(root, iv)) };
}

/** "C♯m7", "B♭°7", "E+" */
export function chordSymbol(c: Chord): string {
  return noteName(c.root) + CHORD_INFO[c.type].symbol;
}

/** "1 ♭3 5 ♭7" */
export function chordFormula(type: ChordType): string {
  return CHORD_INFO[type].intervals.map(degreeLabel).join(' ');
}

/** Notes of an inversion, bass first: 0 = root position, 1 = first inversion … */
export function inversion(c: Chord, n: number): Note[] {
  if (n < 0 || n >= c.notes.length) throw new Error(`A ${c.notes.length}-note chord has no inversion ${n}`);
  return [...c.notes.slice(n), ...c.notes.slice(0, n)];
}

/** Slash symbol for an inversion: "C/E". Root position is just "C". */
export function inversionSymbol(c: Chord, n: number): string {
  const bass = inversion(c, n)[0]!;
  return n === 0 ? chordSymbol(c) : `${chordSymbol(c)}/${noteName(bass)}`;
}

/**
 * The chord type whose formula matches these notes exactly, read from `root`.
 * Spelling matters: C E G is C major, C F♭ G is not.
 */
export function chordTypeOf(root: Note, notes: readonly Note[]): ChordType | undefined {
  const ids = notes.map((n) => intervalId(intervalBetween(root, n)));
  return CHORD_TYPES.find((t) => {
    const want = CHORD_INFO[t].intervals.map(intervalId);
    return want.length === ids.length && want.every((id, i) => id === ids[i]);
  });
}

export interface DiatonicChord {
  /** Scale degree of the root, 1–7. */
  readonly degree: number;
  readonly chord: Chord;
}

/**
 * Chords built by stacking scale thirds on each degree (C-7). A degree whose
 * stack is not a v1 chord type is skipped: the III of harmonic and melodic
 * minor as a seventh is maj7♯5, which arrives with the later chord types.
 */
export function diatonicChords(s: Scale, size: 'triad' | 'seventh'): DiatonicChord[] {
  const notes = scaleNotes(s);
  const count = size === 'triad' ? 3 : 4;
  return notes.flatMap((root, i) => {
    const stack = Array.from({ length: count }, (_, k) => notes[(i + 2 * k) % 7]!);
    const type = chordTypeOf(root, stack);
    return type ? [{ degree: i + 1, chord: chord(root, type) }] : [];
  });
}

export interface ChordInKey {
  readonly key: Key;
  readonly scaleType: ScaleType;
  readonly degree: number;
}

/**
 * Every standard key and scale type whose notes include the chord, spelled
 * exactly (PRD 5.4 "which keys it belongs to"). Minor keys are searched in
 * all three minor forms.
 */
export function keysContaining(c: Chord): ChordInKey[] {
  const results: ChordInKey[] = [];
  for (const type of SCALE_TYPES) {
    const keys = type === 'major' ? MAJOR_KEYS : MINOR_KEYS;
    for (const k of keys) {
      const notes = scaleNotes(scale(k.tonic, type));
      if (!c.notes.every((cn) => notes.some((sn) => sameNote(sn, cn)))) continue;
      const degree = notes.findIndex((sn) => sameNote(sn, c.root)) + 1;
      results.push({ key: k, scaleType: type, degree });
    }
  }
  return results;
}
