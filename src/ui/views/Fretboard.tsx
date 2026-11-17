import { type Press, capturePointer } from './Keyboard';
import type { Role } from './labels';

export interface FretMark {
  readonly string: number;
  readonly fret: number;
  readonly label: string;
  readonly role: Role;
}

const FRET_W = 46;
const OPEN_W = 34;
const STRING_GAP = 28;
const PAD_Y = 18;
const NUMBERS_H = 18;
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOTS = [12, 24];

/**
 * Fretboard (V-2): the whole neck, highest string on top, nut on the left
 * (right when left-handed). Scrolls sideways on narrow screens.
 */
export function Fretboard(props: {
  strings: number;
  frets: number;
  marks: readonly FretMark[];
  leftHanded: boolean;
  stringNames: readonly string[];
  /** MIDI number of each open string, lowest string first; with `onPress`, every fret can be tapped. */
  openMidis?: readonly number[];
  onPress?: Press;
}) {
  const { strings, frets, marks, leftHanded } = props;
  const width = OPEN_W + frets * FRET_W + 8;
  const boardH = (strings - 1) * STRING_GAP;
  const height = PAD_Y * 2 + boardH + NUMBERS_H;
  // Mirror x for left-handed players; text stays upright because only positions flip.
  const X = (x: number) => (leftHanded ? width - x : x);
  const fretX = (f: number) => OPEN_W + f * FRET_W;
  const centerX = (f: number) => (f === 0 ? OPEN_W / 2 : fretX(f) - FRET_W / 2);
  const stringY = (s: number) => PAD_Y + (strings - 1 - s) * STRING_GAP; // string 0 (lowest) at the bottom
  const midY = PAD_Y + boardH / 2;

  return (
    <div class="hscroll">
      <svg
        class="fretboard"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: `${width}px` }}
        role="img"
        aria-label={`Fretboard, ${frets} frets${marks.length ? `: ${marks.length} positions marked` : ''}`}
      >
        <rect x={Math.min(X(OPEN_W), X(width - 8))} y={PAD_Y} width={width - 8 - OPEN_W} height={boardH} class="board" />
        {SINGLE_DOTS.filter((f) => f <= frets).map((f) => (
          <circle key={f} cx={X(centerX(f))} cy={midY} r={5} class="inlay" />
        ))}
        {DOUBLE_DOTS.filter((f) => f <= frets).map((f) => (
          <g key={f}>
            <circle cx={X(centerX(f))} cy={PAD_Y + STRING_GAP * 0.5} r={5} class="inlay" />
            <circle cx={X(centerX(f))} cy={PAD_Y + boardH - STRING_GAP * 0.5} r={5} class="inlay" />
          </g>
        ))}
        {Array.from({ length: frets + 1 }, (_, f) => (
          <line key={f} x1={X(fretX(f))} x2={X(fretX(f))} y1={PAD_Y} y2={PAD_Y + boardH} class={f === 0 ? 'nut' : 'fret'} />
        ))}
        {Array.from({ length: strings }, (_, s) => (
          <g key={s}>
            <line x1={X(OPEN_W)} x2={X(width - 8)} y1={stringY(s)} y2={stringY(s)} class="string" style={{ strokeWidth: 2.6 - (1.6 * s) / Math.max(1, strings - 1) }} />
            {!marks.some((m) => m.string === s && m.fret === 0) && (
              <text x={X(OPEN_W / 2)} y={stringY(s)} class="string-name">
                {props.stringNames[s]}
              </text>
            )}
          </g>
        ))}
        {[...SINGLE_DOTS, ...DOUBLE_DOTS]
          .filter((f) => f <= frets)
          .map((f) => (
            <text key={f} x={X(centerX(f))} y={height - 6} class="fret-number">
              {f}
            </text>
          ))}
        {marks.map((m) => (
          <g key={`${m.string}:${m.fret}`} class="fret-mark">
            <circle cx={X(centerX(m.fret))} cy={stringY(m.string)} r={11} class={`mark ${m.role}`} />
            {m.label && (
              <text
                x={X(centerX(m.fret))}
                y={stringY(m.string)}
                class="mark-label"
                style={{ fontSize: [...m.label].length > 2 ? '8px' : '10px' }}
              >
                {m.label}
              </text>
            )}
          </g>
        ))}
        {/* Invisible tap areas, one per string and fret, above everything else. */}
        {props.onPress &&
          props.openMidis?.map((open, s) =>
            Array.from({ length: frets + 1 }, (_, f) => (
              <rect
                key={`${s}:${f}`}
                class="fret-hit"
                x={Math.min(X(f === 0 ? 0 : fretX(f - 1)), X(fretX(f)))}
                y={stringY(s) - STRING_GAP / 2}
                width={f === 0 ? OPEN_W : FRET_W}
                height={STRING_GAP}
                onPointerDown={(e) => {
                  capturePointer(e);
                  props.onPress!(open + f, 'down');
                }}
                onPointerUp={() => props.onPress!(open + f, 'up')}
                onPointerCancel={() => props.onPress!(open + f, 'up')}
                onLostPointerCapture={() => props.onPress!(open + f, 'up')}
              />
            )),
          )}
      </svg>
    </div>
  );
}
