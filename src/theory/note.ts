/**
 * Notes as letter + alteration.
 *
 * Spelling is the heart of the engine (PRD 5.1): a note is never just a pitch
 * class. C♯ and D♭ sound the same but are different notes, and every scale,
 * interval and chord is built by moving letters first and fixing the
 * accidental second.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitones above C for each natural letter. */
const LETTER_SEMITONES: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface Note {
  readonly letter: Letter;
  /** Accidental as semitones: -2 𝄫, -1 ♭, 0 natural, 1 ♯, 2 𝄪. */
  readonly alter: number;
}

/** A note in a specific octave (scientific pitch: C4 is middle C, MIDI 60). */
export interface Pitch extends Note {
  readonly octave: number;
}

export function note(letter: Letter, alter = 0): Note {
  return { letter, alter };
}

export function letterIndex(n: Note): number {
  return LETTERS.indexOf(n.letter);
}

/** The letter `steps` letters above (negative: below) the given one. */
export function letterAt(start: Letter, steps: number): Letter {
  return LETTERS[mod(LETTERS.indexOf(start) + steps, 7)]!;
}

export function naturalSemitones(letter: Letter): number {
  return LETTER_SEMITONES[letter];
}

/** Pitch class 0–11 (C = 0). B♯ is 0, C♭ is 11. */
export function pitchClass(n: Note): number {
  return mod(LETTER_SEMITONES[n.letter] + n.alter, 12);
}

/** Same spelling. */
export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.alter === b.alter;
}

/** Same sound, any spelling (Q-5 accepts these). */
export function isEnharmonic(a: Note, b: Note): boolean {
  return pitchClass(a) === pitchClass(b);
}

/**
 * MIDI number. The octave belongs to the letter, so B♯3 is MIDI 60 (same as
 * C4) and C♭4 is MIDI 59 (same as B3).
 */
export function midi(p: Pitch): number {
  return 12 * (p.octave + 1) + LETTER_SEMITONES[p.letter] + p.alter;
}

/* ---------- Text ---------- */

const SYMBOL = { sharp: '♯', flat: '♭', doubleSharp: '𝄪', doubleFlat: '𝄫', natural: '♮' };

/** Accidental text using real symbols: ♯ ♭ 𝄪 𝄫. Triple accidentals write as ♯𝄪 / ♭𝄫. */
export function accidentalSymbol(alter: number): string {
  if (alter === 0) return '';
  const count = Math.abs(alter);
  const [single, double] = alter > 0 ? [SYMBOL.sharp, SYMBOL.doubleSharp] : [SYMBOL.flat, SYMBOL.doubleFlat];
  return (count % 2 ? single : '') + double.repeat(Math.floor(count / 2));
}

/** User-facing name: "C♯", "B𝄫", "E". */
export function noteName(n: Note): string {
  return n.letter + accidentalSymbol(n.alter);
}

/** ASCII name for ids and keys: "C#", "Bbb", "E". Never shown to users. */
export function noteId(n: Note): string {
  return n.letter + (n.alter >= 0 ? '#'.repeat(n.alter) : 'b'.repeat(-n.alter));
}

/** "C♯4" */
export function pitchName(p: Pitch): string {
  return noteName(p) + p.octave;
}

const ACCIDENTAL_TOKENS: ReadonlyArray<readonly [string, number]> = [
  ['𝄪', 2],
  ['𝄫', -2],
  ['##', 2],
  ['bb', -2],
  ['x', 2],
  ['♯', 1],
  ['#', 1],
  ['♭', -1],
  ['b', -1],
  ['♮', 0],
];

/**
 * Parse a note name. Accepts real symbols and ASCII: "C♯", "C#", "Db", "D♭",
 * "F𝄪", "F##", "Fx", "B𝄫", "Bbb", "E♮". The letter is case-insensitive;
 * a lowercase "b" after the letter is always a flat.
 */
export function parseNote(text: string): Note {
  const trimmed = text.trim();
  const letter = trimmed.charAt(0).toUpperCase();
  if (!(LETTERS as readonly string[]).includes(letter)) throw new Error(`Not a note: "${text}"`);
  let rest = trimmed.slice(1);
  let alter = 0;
  while (rest.length > 0) {
    const token = ACCIDENTAL_TOKENS.find(([t]) => rest.startsWith(t));
    if (!token) throw new Error(`Not a note: "${text}"`);
    alter += token[1];
    rest = rest.slice(token[0].length);
  }
  return note(letter as Letter, alter);
}

/** Parse "C♯4", "Bb3", "E2". */
export function parsePitch(text: string): Pitch {
  const match = /^(.*?)(-?\d+)$/.exec(text.trim());
  if (!match) throw new Error(`Not a pitch: "${text}"`);
  return { ...parseNote(match[1]!), octave: Number(match[2]) };
}

/** Euclidean modulo: always 0 ≤ result < m. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
