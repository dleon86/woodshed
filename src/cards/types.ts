/**
 * Flash card model (PRD 6.1). Cards are plain data built from the theory
 * engine; the UI only renders them. Pure TypeScript, no DOM.
 */
import type { Direction, Key, Note, ScaleType } from '../theory';

/** The M2 card families (F-5). Chord families arrive with the chord tool in M6. */
export const FAMILIES = [
  'key-signature',
  'reverse-key-signature',
  'relative-parallel',
  'scale-spelling',
  'scale-degree',
  'interval',
  'reverse-interval',
  'interval-naming',
] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_INFO: Record<Family, { label: string; example: string; group: 'keys' | 'scales' | 'intervals' }> = {
  'key-signature': { label: 'Key signature', example: 'A♭ major → 4♭', group: 'keys' },
  'reverse-key-signature': { label: 'Reverse key signature', example: '4 flats → A♭ major', group: 'keys' },
  'relative-parallel': { label: 'Relative / parallel', example: 'Relative minor of A♭ major', group: 'keys' },
  'scale-spelling': { label: 'Scale spelling', example: 'E♭ harmonic minor', group: 'scales' },
  'scale-degree': { label: 'Scale degree', example: '6th of A♭ major → F', group: 'scales' },
  interval: { label: 'Interval', example: 'Perfect 5th above E♭', group: 'intervals' },
  'reverse-interval': { label: 'Reverse interval', example: 'B♭ is the V of what?', group: 'intervals' },
  'interval-naming': { label: 'Interval naming', example: 'E♭ up to B♭', group: 'intervals' },
};

/** A note shown on the back with its degree or role ("F", "6"). */
export interface LabelledNote {
  readonly note: string;
  readonly label: string;
}

export interface Card {
  /** Stable id for progress tracking (G-1): never reuse or rename. */
  readonly id: string;
  readonly family: Family;
  readonly front: string;
  /** Small line under the front, for context ("ascending form"). */
  readonly frontNote?: string;
  /** The main answer, large. */
  readonly answer: string;
  /** Supporting lines under the answer. */
  readonly details: readonly string[];
  /** A row of notes with labels (scale with degrees). */
  readonly notes?: readonly LabelledNote[];
  /** What the instrument views draw for the answer (F-6). */
  readonly show: Show;
}

/**
 * The answer as notes for the keyboard, fretboard and staff. Spelled notes
 * without octaves; the views place them for the active profile.
 */
export interface Show {
  /** Lowest first; each is placed above the one before. */
  readonly notes: readonly Note[];
  /** Labels (degrees, intervals) are measured from this note. */
  readonly root: Note;
  /** Draw this key signature on the staff. Without one, every accidental is written. */
  readonly key?: Key;
  /** The note the card asks for, when it is one note of a larger picture (scale degree cards). */
  readonly focus?: Note;
}

export type KeyFilter = 'all' | 'flats' | 'sharps' | 'custom';
export type IntervalWording = 'names' | 'numerals' | 'both';

/** F-4: decks are built by filter. */
export interface DeckConfig {
  readonly families: readonly Family[];
  readonly keys: KeyFilter;
  /** Key signatures picked when `keys` is 'custom', as fifths (-7 = 7♭ … 7 = 7♯). */
  readonly customKeys: readonly number[];
  readonly scaleTypes: readonly ScaleType[];
  /** Interval ids, "m2" … "P8". */
  readonly intervals: readonly string[];
  readonly directions: readonly Direction[];
  /** "Perfect 5th above E♭", "E♭ V", or both. Numerals only exist for ascending perfect and major intervals. */
  readonly wording: IntervalWording;
}
