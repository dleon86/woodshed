import { describe, expect, it } from 'vitest';
import {
  CHORD_INFO,
  CHORD_TYPES,
  type ChordType,
  chord,
  chordFormula,
  chordSymbol,
  chordTypeOf,
  diatonicChords,
  inversion,
  inversionSymbol,
  keysContaining,
} from './chord';
import { semitones } from './interval';
import { keyName } from './key';
import { LETTERS, letterIndex, mod, noteName, parseNote, pitchClass } from './note';
import { scale } from './scale';

const ROOTS = LETTERS.flatMap((letter) => [-1, 0, 1].map((alter) => ({ letter, alter })));
const spell = (root: string, type: ChordType) => chord(parseNote(root), type).notes.map(noteName).join(' ');

describe('chord spelling', () => {
  it('spells the examples in the PRD', () => {
    expect(spell('C#', 'm7')).toBe('C♯ E G♯ B');
    expect(chordSymbol(chord(parseNote('C#'), 'm7'))).toBe('C♯m7');
  });

  it('spells every v1 type on C', () => {
    expect(CHORD_TYPES.map((t) => spell('C', t))).toEqual([
      'C E G',
      'C E♭ G',
      'C E♭ G♭',
      'C E G♯',
      'C E G B',
      'C E G B♭',
      'C E♭ G B♭',
      'C E♭ G♭ B♭',
      'C E♭ G♭ B𝄫',
      'C E♭ G B',
    ]);
  });

  it('uses double accidentals where the letters require them', () => {
    expect(spell('G#', 'aug')).toBe('G♯ B♯ D𝄪');
    expect(spell('B#', 'aug')).toBe('B♯ D𝄪 F♯𝄪'); // a triple sharp, correctly
    expect(spell('G#', '7')).toBe('G♯ B♯ D♯ F♯');
    expect(spell('Db', 'dim7')).toBe('D♭ F♭ A𝄫 C𝄫');
    expect(spell('E#', 'maj')).toBe('E♯ G𝄪 B♯');
  });

  it('stacks letter thirds with the right sizes, for every root and type', () => {
    for (const root of ROOTS) {
      for (const type of CHORD_TYPES) {
        const c = chord(root, type);
        const where = `${chordSymbol(c)}: ${c.notes.map(noteName).join(' ')}`;
        c.notes.forEach((n, i) => {
          expect(mod(letterIndex(n) - letterIndex(root), 7), where).toBe(2 * i);
          expect(mod(pitchClass(n) - pitchClass(root), 12), where).toBe(semitones(CHORD_INFO[type].intervals[i]!) % 12);
        });
        expect(chordTypeOf(root, c.notes), where).toBe(type);
      }
    }
  });

  it('writes formulas with real symbols', () => {
    expect(chordFormula('m7')).toBe('1 ♭3 5 ♭7');
    expect(chordFormula('dim7')).toBe('1 ♭3 ♭5 𝄫7');
    expect(chordFormula('aug')).toBe('1 3 ♯5');
    expect(chordFormula('mMaj7')).toBe('1 ♭3 5 7');
  });
});

describe('inversions', () => {
  it('rotate the bass and write slash chords', () => {
    const c = chord(parseNote('C'), 'maj7');
    expect(inversion(c, 1).map(noteName)).toEqual(['E', 'G', 'B', 'C']);
    expect(inversion(c, 3).map(noteName)).toEqual(['B', 'C', 'E', 'G']);
    expect(inversionSymbol(c, 0)).toBe('Cmaj7');
    expect(inversionSymbol(c, 2)).toBe('Cmaj7/G');
    expect(() => inversion(chord(parseNote('C'), 'maj'), 3)).toThrow();
  });
});

describe('chords in keys', () => {
  const symbols = (tonic: string, type: Parameters<typeof scale>[1], size: 'triad' | 'seventh') =>
    diatonicChords(scale(parseNote(tonic), type), size).map((d) => `${d.degree}:${chordSymbol(d.chord)}`);

  it('builds the diatonic triads and sevenths of a major key', () => {
    expect(symbols('Eb', 'major', 'triad')).toEqual(['1:E♭', '2:Fm', '3:Gm', '4:A♭', '5:B♭', '6:Cm', '7:D°']);
    expect(symbols('Eb', 'major', 'seventh')).toEqual([
      '1:E♭maj7',
      '2:Fm7',
      '3:Gm7',
      '4:A♭maj7',
      '5:B♭7',
      '6:Cm7',
      '7:Dm7♭5',
    ]);
  });

  it('builds harmonic minor chords, skipping the maj7♯5 that v1 lacks', () => {
    expect(symbols('A', 'harmonic-minor', 'triad')).toEqual(['1:Am', '2:B°', '3:C+', '4:Dm', '5:E', '6:F', '7:G♯°']);
    expect(symbols('A', 'harmonic-minor', 'seventh')).toEqual([
      '1:Am(maj7)',
      '2:Bm7♭5',
      '4:Dm7',
      '5:E7',
      '6:Fmaj7',
      '7:G♯°7',
    ]);
  });

  it('finds every key that contains a chord, spelled exactly', () => {
    const found = keysContaining(chord(parseNote('G'), '7')).map((k) => `${keyName(k.key)} ${k.scaleType} ${k.degree}`);
    expect(found).toEqual([
      'C major major 5',
      'A minor natural-minor 7',
      'C minor harmonic-minor 5', 'C minor melodic-minor 5', 'D minor melodic-minor 4']);
    // A♭ is not G♯: E major contains G♯, so G♯m is in E major and A♭m is not.
    expect(keysContaining(chord(parseNote('Ab'), 'min')).some((k) => keyName(k.key) === 'E major')).toBe(false);
  });
});
