/**
 * Instrument profiles (PRD section 4). A profile controls transposition,
 * clef, range and the default view. Adding an instrument means adding a
 * profile here, never new card content (I-5). Pure data, no DOM.
 */
import { type Direction, type Interval, type Pitch, midi, parsePitch } from '../theory';

export type Clef = 'treble' | 'bass' | 'grand';
export type ViewKind = 'keyboard' | 'fretboard' | 'staff';

export interface Tuning {
  readonly id: string;
  readonly label: string;
  /** Open strings, lowest first, at sounding pitch. */
  readonly strings: readonly Pitch[];
}

export interface FretboardSpec {
  readonly tunings: readonly Tuning[];
  /** Fret counts offered in settings; the first is the default. */
  readonly fretChoices: readonly number[];
}

export interface Profile {
  readonly id: string;
  readonly label: string;
  /**
   * Written → sounding (I-2): guitar and bass sound a perfect octave below
   * what is written. Undefined for concert-pitch instruments.
   */
  readonly sounds?: { readonly interval: Interval; readonly direction: Direction };
  readonly clef: Clef;
  /** Sounding range for non-fretted instruments; fretted ones derive it from tuning and frets. */
  readonly range?: { readonly low: Pitch; readonly high: Pitch };
  readonly defaultView: ViewKind;
  /**
   * Sounding MIDI pitch that displayed answers are centred on, chosen so the
   * written notes sit in the middle of the profile's staff.
   */
  readonly center: number;
  readonly fretboard?: FretboardSpec;
}

const strings = (s: string) => s.split(' ').map(parsePitch);
const OCTAVE_DOWN = { interval: { quality: 'P', number: 8 }, direction: 'down' } as const;

export const PROFILES = {
  keyboard: {
    id: 'keyboard',
    label: 'Keyboard',
    clef: 'grand',
    range: { low: parsePitch('A0'), high: parsePitch('C8') },
    defaultView: 'keyboard',
    center: midi(parsePitch('E4')),
  },
  guitar: {
    id: 'guitar',
    label: 'Guitar',
    sounds: OCTAVE_DOWN,
    clef: 'treble',
    defaultView: 'fretboard',
    center: midi(parsePitch('A3')), // written A4, middle of the treble staff
    fretboard: {
      tunings: [
        { id: 'standard', label: 'Standard (E A D G B E)', strings: strings('E2 A2 D3 G3 B3 E4') },
        { id: 'drop-d', label: 'Drop D (D A D G B E)', strings: strings('D2 A2 D3 G3 B3 E4') },
        { id: 'dadgad', label: 'DADGAD', strings: strings('D2 A2 D3 G3 A3 D4') },
        { id: 'open-g', label: 'Open G (D G D G B D)', strings: strings('D2 G2 D3 G3 B3 D4') },
        { id: 'half-down', label: 'E♭ standard', strings: strings('Eb2 Ab2 Db3 Gb3 Bb3 Eb4') },
        { id: '7-string', label: '7-string (B E A D G B E)', strings: strings('B1 E2 A2 D3 G3 B3 E4') },
      ],
      fretChoices: [22, 20, 21, 24],
    },
  },
  bass: {
    id: 'bass',
    label: 'Bass',
    sounds: OCTAVE_DOWN,
    clef: 'bass',
    defaultView: 'fretboard',
    center: midi(parsePitch('C2')), // written C3, middle of the bass staff
    fretboard: {
      tunings: [
        { id: '4-string', label: '4-string (E A D G)', strings: strings('E1 A1 D2 G2') },
        { id: '5-string', label: '5-string (B E A D G)', strings: strings('B0 E1 A1 D2 G2') },
        { id: 'drop-d', label: 'Drop D (D A D G)', strings: strings('D1 A1 D2 G2') },
        { id: '6-string', label: '6-string (B E A D G C)', strings: strings('B0 E1 A1 D2 G2 C3') },
      ],
      fretChoices: [20, 21, 22, 24],
    },
  },
} as const satisfies Record<string, Profile>;

export type InstrumentId = keyof typeof PROFILES;
export const INSTRUMENT_IDS = Object.keys(PROFILES) as InstrumentId[];

/** Per-instrument choices from settings (I-4). */
export interface FretSettings {
  readonly tuning: string;
  readonly frets: number;
}

/** The tuning a setting names, falling back to the profile's first. */
export function tuningFor(profile: Profile, tuningId: string | undefined): Tuning | undefined {
  const tunings = profile.fretboard?.tunings;
  return tunings?.find((t) => t.id === tuningId) ?? tunings?.[0];
}

/** Sounding range: fixed for keyboard; lowest open string to highest string's top fret when fretted (I-3). */
export function soundingRange(profile: Profile, fret?: FretSettings): { low: number; high: number } {
  const tuning = tuningFor(profile, fret?.tuning);
  if (tuning) {
    const frets = fret?.frets ?? profile.fretboard!.fretChoices[0]!;
    const open = tuning.strings.map(midi);
    return { low: Math.min(...open), high: Math.max(...open) + frets };
  }
  if (!profile.range) throw new Error(`${profile.id} has no range`);
  return { low: midi(profile.range.low), high: midi(profile.range.high) };
}
