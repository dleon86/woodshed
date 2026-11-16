import { describe, expect, it } from 'vitest';
import { enharmonicKey, keyName, signatureCount } from './key';
import { type Note, letterIndex, mod, noteName, parseNote, pitchClass, sameNote } from './note';
import { SCALE_TYPES, type ScaleType, scale, scaleDegree, scaleNotes, scaleTonics } from './scale';

const names = (notes: readonly Note[]) => notes.map(noteName).join(' ');
const spelled = (tonic: string, type: ScaleType) => names(scaleNotes(scale(parseNote(tonic), type)));
const ascii = (s: string) => names(s.split(' ').map(parseNote));

/**
 * Known-good spellings, written out by hand rather than generated, so they
 * check the algorithm instead of repeating it.
 */
const MAJOR_FIXTURE: Record<string, string> = {
  Cb: 'Cb Db Eb Fb Gb Ab Bb',
  Gb: 'Gb Ab Bb Cb Db Eb F',
  Db: 'Db Eb F Gb Ab Bb C',
  Ab: 'Ab Bb C Db Eb F G',
  Eb: 'Eb F G Ab Bb C D',
  Bb: 'Bb C D Eb F G A',
  F: 'F G A Bb C D E',
  C: 'C D E F G A B',
  G: 'G A B C D E F#',
  D: 'D E F# G A B C#',
  A: 'A B C# D E F# G#',
  E: 'E F# G# A B C# D#',
  B: 'B C# D# E F# G# A#',
  'F#': 'F# G# A# B C# D# E#',
  'C#': 'C# D# E# F# G# A# B#',
};

const NATURAL_MINOR_FIXTURE: Record<string, string> = {
  Ab: 'Ab Bb Cb Db Eb Fb Gb',
  Eb: 'Eb F Gb Ab Bb Cb Db',
  Bb: 'Bb C Db Eb F Gb Ab',
  F: 'F G Ab Bb C Db Eb',
  C: 'C D Eb F G Ab Bb',
  G: 'G A Bb C D Eb F',
  D: 'D E F G A Bb C',
  A: 'A B C D E F G',
  E: 'E F# G A B C D',
  B: 'B C# D E F# G A',
  'F#': 'F# G# A B C# D E',
  'C#': 'C# D# E F# G# A B',
  'G#': 'G# A# B C# D# E F#',
  'D#': 'D# E# F# G# A# B C#',
  'A#': 'A# B# C# D# E# F# G#',
};

const STEPS: Record<ScaleType, number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  'natural-minor': [2, 1, 2, 2, 1, 2, 2],
  'harmonic-minor': [2, 1, 2, 2, 1, 3, 1],
  'melodic-minor': [2, 1, 2, 2, 2, 2, 1],
};

describe('scale spelling against hand-written fixtures', () => {
  it('spells all 15 major scales', () => {
    for (const [tonic, notes] of Object.entries(MAJOR_FIXTURE)) expect(spelled(tonic, 'major'), tonic).toBe(ascii(notes));
  });

  it('spells all 15 natural minor scales', () => {
    for (const [tonic, notes] of Object.entries(NATURAL_MINOR_FIXTURE)) {
      expect(spelled(tonic, 'natural-minor'), tonic).toBe(ascii(notes));
    }
  });

  it('covers exactly the standard tonics', () => {
    expect(scaleTonics('major').map(noteName)).toEqual(Object.keys(MAJOR_FIXTURE).map((t) => noteName(parseNote(t))));
    expect(scaleTonics('harmonic-minor').map(noteName)).toEqual(
      Object.keys(NATURAL_MINOR_FIXTURE).map((t) => noteName(parseNote(t))),
    );
  });

  it('raises the leading tone in harmonic minor, with double sharps where needed (PRD 5.1)', () => {
    expect(spelled('G#', 'harmonic-minor')).toBe('G♯ A♯ B C♯ D♯ E F𝄪');
    expect(spelled('A#', 'harmonic-minor')).toBe('A♯ B♯ C♯ D♯ E♯ F♯ G𝄪');
    expect(spelled('Ab', 'harmonic-minor')).toBe('A♭ B♭ C♭ D♭ E♭ F♭ G');
    expect(spelled('Eb', 'harmonic-minor')).toBe('E♭ F G♭ A♭ B♭ C♭ D');
  });

  it('raises 6 and 7 ascending in melodic minor and descends as natural minor', () => {
    const s = scale(parseNote('D#'), 'melodic-minor');
    expect(names(scaleNotes(s))).toBe('D♯ E♯ F♯ G♯ A♯ B♯ C𝄪');
    expect(names(s.descending.map((d) => d.note))).toBe('D♯ C♯ B A♯ G♯ F♯ E♯ D♯');
  });
});

describe('every scale type in every key', () => {
  for (const type of SCALE_TYPES) {
    it(`${type}: one note per letter, right step pattern, degrees 1–8`, () => {
      for (const tonic of scaleTonics(type)) {
        const s = scale(tonic, type);
        const notes = scaleNotes(s);
        const where = `${noteName(tonic)} ${type}: ${names(notes)}`;
        notes.forEach((n, i) => expect(mod(letterIndex(n) - letterIndex(tonic), 7), where).toBe(i));
        const steps = [...notes, tonic].slice(1).map((n, i) => mod(pitchClass(n) - pitchClass(notes[i]!), 12));
        expect(steps, where).toEqual(STEPS[type]);
        expect(s.degrees.map((d) => d.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(sameNote(scaleDegree(s, 8), tonic)).toBe(true);
      }
    });
  }

  it('major and natural minor use exactly the accidentals of their key signature', () => {
    for (const type of ['major', 'natural-minor'] as const) {
      for (const tonic of scaleTonics(type)) {
        const s = scale(tonic, type);
        const altered = scaleNotes(s).filter((n) => n.alter !== 0);
        const sorted = (ns: readonly Note[]) => ns.map(noteName).sort();
        expect(sorted(altered), `${noteName(tonic)} ${type}`).toEqual(sorted(s.signature.accidentals));
      }
    }
  });
});

describe('the white paper cards (PRD appendix)', () => {
  const cards: Array<[string, string]> = [
    ['Bb', '2♭'],
    ['C#', '7♯ / 5♭ (D♭ major)'],
    ['F#', '6♯ / 6♭ (G♭ major)'],
    ['Ab', '4♭'],
    ['Gb', '6♭ / 6♯ (F♯ major)'],
    ['Cb', '7♭ / 5♯ (B major)'],
    ['Eb', '3♭'],
    ['B', '5♯ / 7♭ (C♭ major)'],
    ['Db', '5♭ / 7♯ (C♯ major)'],
  ];

  it('give the count and enharmonic twin for each card', () => {
    for (const [front, back] of cards) {
      const s = scale(parseNote(front), 'major');
      const twin = enharmonicKey(s.key);
      const text = twin
        ? `${signatureCount(s.signature)} / ${signatureCount(scale(twin.tonic, 'major').signature)} (${keyName(twin)})`
        : signatureCount(s.signature);
      expect(text, front).toBe(back);
      expect(s.degrees.map((d) => d.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  it('label degrees relative to major', () => {
    expect(scale(parseNote('C'), 'harmonic-minor').degrees.map((d) => d.label)).toEqual([
      '1',
      '2',
      '♭3',
      '4',
      '5',
      '♭6',
      '7',
      '8',
    ]);
  });
});
