import type { Clef } from '../../instruments';
import { type Key, type Pitch, keySignature, letterIndex, midi, pitchName } from '../../theory';
import type { Role } from './labels';

export interface StaffNote {
  /** Written pitch. */
  readonly pitch: Pitch;
  readonly label: string;
  readonly role: Role;
}

/** One staff space in SVG units. SMuFL glyphs are drawn at 4 spaces per em. */
const SP = 10;
const FONT_SIZE = 4 * SP;
/** Natural size on screen: 9 CSS px per staff space. */
const PX_PER_UNIT = 0.9;

/** SMuFL code points in the bundled subset of Bravura. */
const GLYPH = {
  gClef: '',
  fClef: '',
  wholeNote: '',
  accidental: { [-2]: '', [-1]: '', 0: '', 1: '', 2: '' } as Record<number, string>,
};
const ACCIDENTAL_W: Record<number, number> = { [-2]: 1.7, [-1]: 1.0, 0: 0.8, 1: 1.0, 2: 1.0 };
const NOTEHEAD_W = 1.69;

/** Diatonic step: 7 per octave, so staff positions are simple arithmetic. */
const step = (p: Pitch) => p.octave * 7 + letterIndex(p);

interface StaffSpec {
  readonly clef: 'treble' | 'bass';
  /** Step of the bottom line: E4 treble, G2 bass. */
  readonly bottom: number;
  /** Step of the line the clef sits on: G4 treble, F3 bass. */
  readonly clefStep: number;
  /** Key signature positions, in order of sharps and of flats. */
  readonly sharps: readonly number[];
  readonly flats: readonly number[];
}

// Treble positions (F5 C5 G5 D5 A4 E5 B4 for sharps); bass is the same two octaves (14 steps) lower.
const TREBLE_SHARPS = [38, 35, 39, 36, 33, 37, 34];
const TREBLE_FLATS = [34, 37, 33, 36, 32, 35, 31];
const STAVES: Record<'treble' | 'bass', StaffSpec> = {
  treble: { clef: 'treble', bottom: 30, clefStep: 32, sharps: TREBLE_SHARPS, flats: TREBLE_FLATS },
  bass: {
    clef: 'bass',
    bottom: 18,
    clefStep: 24,
    sharps: TREBLE_SHARPS.map((s) => s - 14),
    flats: TREBLE_FLATS.map((s) => s - 14),
  },
};

/**
 * Staff (V-3): clef for the profile, the real key signature, ledger lines and
 * accidentals. Notes are written left to right. On a grand staff, notes from
 * middle C up go on the treble staff.
 */
export function Staff({ clef, keyOf, notes }: { clef: Clef; keyOf?: Key | undefined; notes: readonly StaffNote[] }) {
  const staves: StaffSpec[] = clef === 'grand' ? [STAVES.treble, STAVES.bass] : [STAVES[clef]];
  const staffFor = (n: StaffNote) => (clef === 'grand' ? (midi(n.pitch) >= 60 ? 0 : 1) : 0);

  const sig = keyOf ? keySignature(keyOf) : undefined;
  const sigAlter = (letterIdx: number): number => {
    if (!sig) return 0;
    const hit = sig.accidentals.find((a) => letterIndex(a) === letterIdx);
    return hit ? hit.alter : 0;
  };
  // Accidental shown when the note differs from the key signature (or, without one, whenever altered).
  const accidentalOf = (p: Pitch): number | undefined => (p.alter !== sigAlter(letterIndex(p)) ? p.alter : undefined);

  /* Horizontal layout, in staff spaces */
  const sigCount = sig ? Math.abs(sig.fifths) : 0;
  const sigStart = 3.6;
  const SIG_STEP = 1.2;
  const notesStart = sigStart + sigCount * SIG_STEP + 1.2;
  const slots = notes.map((n) => {
    const acc = accidentalOf(n.pitch);
    return { acc, width: (acc !== undefined ? (ACCIDENTAL_W[acc] ?? 1.7) + 0.35 : 0) + NOTEHEAD_W + 1.6 };
  });
  const xs: number[] = [];
  let cursor = notesStart;
  for (const s of slots) {
    xs.push(cursor + s.width - NOTEHEAD_W - 1.6); // notehead x
    cursor += s.width;
  }
  const width = Math.max(cursor + 1, notesStart + 6);

  /* Vertical layout: each staff gets room for its ledger notes */
  const hasLabels = notes.some((n) => n.label);
  let y = 0;
  const tops: number[] = [];
  const steps = notes.map((n) => step(n.pitch));
  staves.forEach((st, i) => {
    const mine = steps.filter((_, k) => staffFor(notes[k]!) === i);
    const above = Math.max(st.bottom + 8 + 3, ...mine.map((s) => s + 2));
    const below = Math.min(st.bottom - 3, ...mine.map((s) => s - 2));
    const top = y + ((above - (st.bottom + 8)) / 2) * SP;
    tops.push(top);
    y = top + 4 * SP + ((st.bottom - below) / 2) * SP;
  });
  const labelY = y + 1.2 * SP;
  const height = y + (hasLabels ? 2.4 * SP : 0.5 * SP);

  const yOf = (st: StaffSpec, top: number, s: number) => top + ((st.bottom + 8 - s) / 2) * SP;

  return (
    <svg class="staff" viewBox={`0 0 ${width * SP} ${height}`} width={width * SP * PX_PER_UNIT} role="img" aria-label={staffLabel(clef, notes)}>
      {staves.map((st, i) => {
        const top = tops[i]!;
        return (
          <g key={st.clef}>
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1={0} x2={width * SP} y1={top + l * SP} y2={top + l * SP} class="staff-line" />
            ))}
            <text x={0.6 * SP} y={yOf(st, top, st.clefStep)} class="glyph" style={{ fontSize: `${FONT_SIZE}px` }}>
              {st.clef === 'treble' ? GLYPH.gClef : GLYPH.fClef}
            </text>
            {sig &&
              (sig.fifths > 0 ? st.sharps : st.flats).slice(0, sigCount).map((s, k) => (
                <text
                  key={k}
                  x={(sigStart + k * SIG_STEP) * SP}
                  y={yOf(st, top, s)}
                  class="glyph"
                  style={{ fontSize: `${FONT_SIZE}px` }}
                >
                  {GLYPH.accidental[sig.fifths > 0 ? 1 : -1]}
                </text>
              ))}
          </g>
        );
      })}
      {clef === 'grand' && (
        <line x1={0.5} x2={0.5} y1={tops[0]} y2={tops[1]! + 4 * SP} class="staff-line" />
      )}

      {notes.map((n, k) => {
        const i = staffFor(n);
        const st = staves[i]!;
        const top = tops[i]!;
        const s = steps[k]!;
        const x = xs[k]! * SP;
        const ny = yOf(st, top, s);
        const acc = slots[k]!.acc;
        const ledgers: number[] = [];
        for (let l = st.bottom - 2; l >= s; l -= 2) ledgers.push(l);
        for (let l = st.bottom + 10; l <= s; l += 2) ledgers.push(l);
        return (
          <g key={k} class={`staff-note ${n.role}`}>
            {ledgers.map((l) => (
              <line
                key={l}
                x1={x - 0.45 * SP}
                x2={x + (NOTEHEAD_W + 0.45) * SP}
                y1={yOf(st, top, l)}
                y2={yOf(st, top, l)}
                class="ledger"
              />
            ))}
            {acc !== undefined && (
              <text
                x={x - ((ACCIDENTAL_W[acc] ?? 1.7) + 0.3) * SP}
                y={ny}
                class="glyph"
                style={{ fontSize: `${FONT_SIZE}px` }}
              >
                {GLYPH.accidental[acc] ?? GLYPH.accidental[Math.sign(acc)]}
              </text>
            )}
            <text x={x} y={ny} class="glyph" style={{ fontSize: `${FONT_SIZE}px` }}>
              {GLYPH.wholeNote}
            </text>
            {n.label && (
              <text x={x + (NOTEHEAD_W / 2) * SP} y={labelY} class="staff-label">
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function staffLabel(clef: Clef, notes: readonly StaffNote[]): string {
  const name = clef === 'grand' ? 'Grand staff' : `${clef[0]!.toUpperCase()}${clef.slice(1)} staff`;
  return notes.length ? `${name}: ${notes.map((n) => pitchName(n.pitch)).join(' ')} (written)` : name;
}
