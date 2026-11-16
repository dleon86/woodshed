import { describe, expect, it } from 'vitest';
import {
  LETTERS,
  accidentalSymbol,
  frequencyToMidi,
  isEnharmonic,
  midi,
  midiToFrequency,
  noteId,
  noteName,
  parseNote,
  parsePitch,
  pitchClass,
  pitchFromMidi,
  pitchName,
} from './note';

/** Every letter with every accidental from 𝄫 to 𝄪: 35 spellings. */
const ALL_SPELLINGS = LETTERS.flatMap((letter) => [-2, -1, 0, 1, 2].map((alter) => ({ letter, alter })));

describe('note names', () => {
  it('render with real symbols', () => {
    expect(['C#', 'Db', 'F##', 'Bbb', 'E'].map((t) => noteName(parseNote(t)))).toEqual(['C♯', 'D♭', 'F𝄪', 'B𝄫', 'E']);
    expect(accidentalSymbol(3)).toBe('♯𝄪');
    expect(accidentalSymbol(-3)).toBe('♭𝄫');
  });

  it('parse ASCII and symbol forms alike', () => {
    for (const [ascii, symbol] of [
      ['C#', 'C♯'],
      ['Db', 'D♭'],
      ['Fx', 'F𝄪'],
      ['F##', 'F𝄪'],
      ['Bbb', 'B𝄫'],
      ['e', 'E♮'],
    ] as const) {
      expect(parseNote(ascii)).toEqual(parseNote(symbol));
    }
    expect(parseNote('b')).toEqual({ letter: 'B', alter: 0 });
    expect(parseNote('bb')).toEqual({ letter: 'B', alter: -1 });
  });

  it('round-trip every spelling through both name forms', () => {
    for (const n of ALL_SPELLINGS) {
      expect(parseNote(noteName(n))).toEqual(n);
      expect(parseNote(noteId(n))).toEqual(n);
    }
  });

  it('reject garbage', () => {
    expect(() => parseNote('H')).toThrow();
    expect(() => parseNote('C$')).toThrow();
    expect(() => parseNote('')).toThrow();
  });
});

describe('pitch classes and MIDI', () => {
  it('wrap around the octave', () => {
    expect(pitchClass(parseNote('B#'))).toBe(0);
    expect(pitchClass(parseNote('Cb'))).toBe(11);
    expect(pitchClass(parseNote('Dbb'))).toBe(0);
    expect(isEnharmonic(parseNote('E#'), parseNote('F'))).toBe(true);
    expect(isEnharmonic(parseNote('E'), parseNote('F'))).toBe(false);
  });

  it('give the octave to the letter (B♯3 = C4, C♭4 = B3)', () => {
    expect(midi(parsePitch('C4'))).toBe(60);
    expect(midi(parsePitch('A4'))).toBe(69);
    expect(midi(parsePitch('B#3'))).toBe(60);
    expect(midi(parsePitch('Cb4'))).toBe(59);
    expect(midi(parsePitch('E1'))).toBe(28); // bass low E
    expect(pitchName(parsePitch('Eb2'))).toBe('E♭2');
  });
});

describe('frequency (A-6)', () => {
  it('converts MIDI to Hz and back at any reference pitch', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(69, 442)).toBe(442);
    expect(midiToFrequency(57)).toBeCloseTo(220, 6);
    expect(midiToFrequency(28)).toBeCloseTo(41.203, 2); // bass low E (P-2)
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 2);
    for (let m = 21; m <= 108; m++) expect(frequencyToMidi(midiToFrequency(m, 437), 437)).toBeCloseTo(m, 9);
    expect(frequencyToMidi(440 * 2 ** (0.5 / 12))).toBeCloseTo(69.5, 9); // 50 cents sharp
  });

  it('names a MIDI number with sharps or flats', () => {
    expect(pitchName(pitchFromMidi(60))).toBe('C4');
    expect(pitchName(pitchFromMidi(61))).toBe('C♯4');
    expect(pitchName(pitchFromMidi(61, 'flat'))).toBe('D♭4');
    expect(pitchName(pitchFromMidi(28))).toBe('E1');
    for (let m = 21; m <= 108; m++) {
      expect(midi(pitchFromMidi(m))).toBe(m);
      expect(midi(pitchFromMidi(m, 'flat'))).toBe(m);
    }
  });
});
