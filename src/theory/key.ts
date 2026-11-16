/**
 * Keys and key signatures (PRD 5.1, 5.2, F-5 key signature cards).
 *
 * A key's position on the circle of fifths has a closed form: each letter has
 * a fixed position (F = -1, C = 0 … B = 5) and every sharp adds 7. Positive
 * is sharps, negative is flats. A♭ major = 3 - 7 = -4, four flats.
 */
import { type Interval, transpose } from './interval';
import { type Letter, type Note, note, noteName, sameNote } from './note';

export type Mode = 'major' | 'minor';

export interface Key {
  readonly tonic: Note;
  readonly mode: Mode;
}

export interface KeySignature {
  /** Sharps (positive) or flats (negative). -7…7 for the 15 standard signatures. */
  readonly fifths: number;
  /** The accidentals in signature order (F♯ C♯ G♯ … or B♭ E♭ A♭ …). */
  readonly accidentals: readonly Note[];
}

const LETTER_FIFTHS: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

/** Order of sharps: F C G D A E B. Flats are the reverse. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

const MINOR_THIRD: Interval = { quality: 'm', number: 3 };

export function key(tonic: Note, mode: Mode): Key {
  return { tonic, mode };
}

/** Circle-of-fifths position of a key. Theoretical keys (G♯ major) fall outside -7…7. */
export function keyFifths(k: Key): number {
  return LETTER_FIFTHS[k.tonic.letter] + 7 * k.tonic.alter - (k.mode === 'minor' ? 3 : 0);
}

/** Whether the key has one of the 15 standard signatures (at most 7 sharps or flats). */
export function isStandardKey(k: Key): boolean {
  return Math.abs(keyFifths(k)) <= 7;
}

export function keySignature(k: Key): KeySignature {
  const fifths = keyFifths(k);
  if (Math.abs(fifths) > 7) throw new Error(`${keyName(k)} has no standard key signature`);
  const accidentals =
    fifths >= 0
      ? SHARP_ORDER.slice(0, fifths).map((l) => note(l, 1))
      : [...SHARP_ORDER].reverse().slice(0, -fifths).map((l) => note(l, -1));
  return { fifths, accidentals };
}

/** Major key with the given signature. */
export function majorKeyFor(fifths: number): Key {
  return key(tonicAtFifths(fifths), 'major');
}

/** Minor key with the given signature. */
export function minorKeyFor(fifths: number): Key {
  // A minor shares C major's signature and sits three fifths clockwise of it.
  return key(tonicAtFifths(fifths + 3), 'minor');
}

/** The note at a circle-of-fifths position (0 = C, 1 = G, -1 = F, 7 = C♯ …). */
function tonicAtFifths(pos: number): Note {
  // Positions -1…5 are the naturals F…B; each 7 further adds a sharp.
  const shifted = pos + 1; // F at 0
  const alter = Math.floor(shifted / 7);
  const letter = SHARP_ORDER[shifted - 7 * alter]!;
  return note(letter, alter);
}

/** The 15 major keys, flats to sharps: C♭ G♭ … C … F♯ C♯. */
export const MAJOR_KEYS: readonly Key[] = range(-7, 7).map(majorKeyFor);

/** The 15 minor keys, flats to sharps: A♭m E♭m … Am … D♯m A♯m. */
export const MINOR_KEYS: readonly Key[] = range(-7, 7).map(minorKeyFor);

export function relativeKey(k: Key): Key {
  return k.mode === 'major'
    ? key(transpose(k.tonic, MINOR_THIRD, 'down'), 'minor')
    : key(transpose(k.tonic, MINOR_THIRD, 'up'), 'major');
}

export function parallelKey(k: Key): Key {
  return key(k.tonic, k.mode === 'major' ? 'minor' : 'major');
}

/**
 * The enharmonic twin with a standard signature (PRD 5.1): B/C♭, F♯/G♭, C♯/D♭
 * and their relative minors. Undefined for keys that have none.
 */
export function enharmonicKey(k: Key): Key | undefined {
  const fifths = keyFifths(k);
  const twin = fifths >= 5 ? fifths - 12 : fifths <= -5 ? fifths + 12 : undefined;
  if (twin === undefined || Math.abs(twin) > 7) return undefined;
  return k.mode === 'major' ? majorKeyFor(twin) : minorKeyFor(twin);
}

export function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && sameNote(a.tonic, b.tonic);
}

/** "A♭ major", "F minor". */
export function keyName(k: Key): string {
  return `${noteName(k.tonic)} ${k.mode}`;
}

/** "4♭", "7♯", "0" (PRD appendix: the paper cards write counts this way). */
export function signatureCount(sig: KeySignature): string {
  if (sig.fifths === 0) return '0';
  return sig.fifths > 0 ? `${sig.fifths}♯` : `${-sig.fifths}♭`;
}

/** "4 flats", "1 sharp", "no sharps or flats". */
export function signatureName(sig: KeySignature): string {
  const n = Math.abs(sig.fifths);
  if (n === 0) return 'no sharps or flats';
  return `${n} ${sig.fifths > 0 ? 'sharp' : 'flat'}${n === 1 ? '' : 's'}`;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
