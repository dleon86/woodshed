import { describe, expect, it } from 'vitest';
import { V1_INTERVALS, buildDeck, DEFAULT_DECK, FAMILIES } from '../cards';
import { midi, parseNote, parsePitch, pitchName } from '../theory';
import { fretPositions } from './fretboard';
import { placeNotes, writtenPitch } from './placement';
import { INSTRUMENT_IDS, PROFILES, soundingRange, tuningFor } from './profiles';

const notes = (s: string) => s.split(' ').map(parseNote);
const place = (s: string, id: keyof typeof PROFILES) => {
  const profile = PROFILES[id];
  return placeNotes(notes(s), profile, soundingRange(profile)).map(pitchName).join(' ');
};

describe('profiles', () => {
  it('derive fretted ranges from tuning and frets (I-3, I-4)', () => {
    const guitar = soundingRange(PROFILES.guitar);
    expect([guitar.low, guitar.high]).toEqual([midi(parsePitch('E2')), midi(parsePitch('D6'))]); // 22 frets
    expect(soundingRange(PROFILES.guitar, { tuning: 'standard', frets: 24 }).high).toBe(midi(parsePitch('E6')));
    expect(soundingRange(PROFILES.bass, { tuning: '5-string', frets: 20 }).low).toBe(midi(parsePitch('B0')));
    expect(soundingRange(PROFILES.keyboard)).toEqual({ low: 21, high: 108 });
  });

  it('fall back to the first tuning for an unknown id', () => {
    expect(tuningFor(PROFILES.guitar, 'nope')?.id).toBe('standard');
    expect(tuningFor(PROFILES.keyboard, 'standard')).toBeUndefined();
  });
});

describe('placement', () => {
  it('stacks notes upward and centres them on the profile', () => {
    expect(place('C D E F G A B C', 'keyboard')).toBe('C4 D4 E4 F4 G4 A4 B4 C5');
    expect(place('B C# D# E F# G# A# B', 'keyboard')).toBe('B3 C♯4 D♯4 E4 F♯4 G♯4 A♯4 B4');
    expect(place('E F# G# A B C# D# E', 'guitar')).toBe('E3 F♯3 G♯3 A3 B3 C♯4 D♯4 E4');
    expect(place('E F# G# A B C# D# E', 'bass')).toBe('E1 F♯1 G♯1 A1 B1 C♯2 D♯2 E2');
  });

  it('keeps the octave with the letter (B♯ sits above A♯, not below C)', () => {
    expect(place('C# D# E# F# G# A# B# C#', 'keyboard')).toBe('C♯4 D♯4 E♯4 F♯4 G♯4 A♯4 B♯4 C♯5');
    expect(place('Cb Db Eb Fb Gb Ab Bb Cb', 'keyboard')).toBe('C♭4 D♭4 E♭4 F♭4 G♭4 A♭4 B♭4 C♭5');
  });

  it('puts an octave interval an octave apart', () => {
    expect(place('Eb Eb', 'keyboard')).toBe('E♭4 E♭5');
  });

  it('keeps every card inside every profile range', () => {
    const all = buildDeck({
      ...DEFAULT_DECK,
      families: [...FAMILIES],
      scaleTypes: ['major', 'natural-minor', 'harmonic-minor', 'melodic-minor'],
      intervals: [...V1_INTERVALS],
      directions: ['up', 'down'],
    });
    for (const id of INSTRUMENT_IDS) {
      const profile = PROFILES[id];
      const range = soundingRange(profile);
      for (const card of all) {
        const placed = placeNotes(card.show.notes, profile, range).map(midi);
        expect(Math.min(...placed), `${id} ${card.id}`).toBeGreaterThanOrEqual(range.low);
        expect(Math.max(...placed), `${id} ${card.id}`).toBeLessThanOrEqual(range.high);
      }
    }
  });
});

describe('written pitch (I-2)', () => {
  it('writes guitar and bass an octave above sounding', () => {
    expect(pitchName(writtenPitch(parsePitch('E2'), PROFILES.guitar))).toBe('E3');
    expect(pitchName(writtenPitch(parsePitch('B#2'), PROFILES.bass))).toBe('B♯3');
    expect(pitchName(writtenPitch(parsePitch('C4'), PROFILES.keyboard))).toBe('C4');
  });
});

describe('fret positions (V-2)', () => {
  const standard = PROFILES.guitar.fretboard.tunings[0].strings;

  it('finds every position of a note across the neck', () => {
    const e = fretPositions(standard, 12, notes('E')).map((p) => `${p.string}:${p.fret}`);
    expect(e).toEqual(['0:0', '0:12', '1:7', '2:2', '3:9', '4:5', '5:0', '5:12']);
  });

  it('keeps the spelling of the note asked for', () => {
    const [first] = fretPositions(standard, 5, notes('E#'));
    expect(first).toMatchObject({ string: 0, fret: 1, note: { letter: 'E', alter: 1 } });
  });
});
