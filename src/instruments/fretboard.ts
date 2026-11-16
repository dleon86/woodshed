/** Fretboard positions (V-2): where each note can be played on the neck. */
import { type Note, type Pitch, midi, pitchClass, sameNote } from '../theory';

export interface FretPosition {
  /** 0 = lowest string. */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
  readonly midi: number;
  /** The displayed note this position plays, with its spelling. */
  readonly note: Note;
}

/** Every position on the neck that plays one of `notes` (any octave), spelled as given. */
export function fretPositions(strings: readonly Pitch[], frets: number, notes: readonly Note[]): FretPosition[] {
  const out: FretPosition[] = [];
  strings.forEach((open, string) => {
    const base = midi(open);
    for (let fret = 0; fret <= frets; fret++) {
      const m = base + fret;
      // A note listed twice (scale degree 8) still marks each position once.
      const note = notes.find((n) => pitchClass(n) === m % 12);
      if (note) out.push({ string, fret, midi: m, note });
    }
  });
  return out;
}

/** The notes without repeats (scale degree 8 repeats degree 1). */
export function uniqueNotes(notes: readonly Note[]): Note[] {
  return notes.filter((n, i) => notes.findIndex((m) => sameNote(m, n)) === i);
}
