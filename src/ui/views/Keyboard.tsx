import type { Role } from './labels';

export interface KeyMark {
  readonly midi: number;
  readonly label: string;
  readonly role: Role;
}

/** A finger going down on a note, and lifting from it. */
export type Press = (midi: number, phase: 'down' | 'up') => void;

/**
 * Keep a pointer on the element it went down on, so the note ends when that
 * finger lifts wherever it has slid to. Capturing can throw (a pointer that
 * is already gone); the note must still sound, so that is ignored.
 */
export function capturePointer(e: PointerEvent): void {
  try {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  } catch {
    /* not capturable: pointerup on the element still ends the note */
  }
}

const WHITE_W = 24;
const WHITE_H = 120;
const BLACK_W = 15;
const BLACK_H = 76;
/** Pitch classes that are white keys, and each one's index among the 7 whites. */
const WHITE_INDEX: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

const isWhite = (m: number) => (m % 12) in WHITE_INDEX;
const whiteNumber = (m: number) => Math.floor(m / 12) * 7 + WHITE_INDEX[m % 12]!;

/**
 * Piano keyboard (V-1). Shows whole octaves around the marked keys, at least
 * two, and scrolls sideways when that is wider than the screen.
 */
export function Keyboard({ marks, center, onPress }: { marks: readonly KeyMark[]; center: number; onPress?: Press }) {
  const handlers = (m: number) =>
    onPress && {
      // Capture the pointer so the note ends when this finger lifts, wherever it has slid to.
      onPointerDown: (e: PointerEvent) => {
        capturePointer(e);
        onPress(m, 'down');
      },
      onPointerUp: () => onPress(m, 'up'),
      onPointerCancel: () => onPress(m, 'up'),
      onLostPointerCapture: () => onPress(m, 'up'),
    };
  const mids = marks.map((m) => m.midi);
  const lowC = Math.floor(Math.min(...(mids.length ? mids : [center - 6])) / 12) * 12;
  let highB = Math.ceil((Math.max(...(mids.length ? mids : [center + 6])) + 1) / 12) * 12 - 1;
  if (highB - lowC < 23) highB = lowC + 23;

  const keys = Array.from({ length: highB - lowC + 1 }, (_, i) => lowC + i);
  const firstWhite = whiteNumber(lowC);
  const whites = keys.filter(isWhite);
  const width = whites.length * WHITE_W;
  const markAt = new Map(marks.map((m) => [m.midi, m]));
  const xOfWhite = (m: number) => (whiteNumber(m) - firstWhite) * WHITE_W;

  return (
    <div class="hscroll">
      <svg
        class="keyboard"
        viewBox={`0 0 ${width} ${WHITE_H + 2}`}
        style={{ minWidth: `${whites.length * 23}px` }}
        role="img"
        aria-label={marks.length ? `Keyboard: ${marks.map((m) => m.label).join(' ')}` : 'Keyboard'}
      >
        {whites.map((m) => {
          const mark = markAt.get(m);
          const x = xOfWhite(m);
          return (
            <g key={m} data-midi={m} {...handlers(m)}>
              <rect x={x + 0.5} y={0.5} width={WHITE_W - 1} height={WHITE_H} rx={3} class={`key white ${mark ? mark.role : ''}`} />
              {m % 12 === 0 && !mark && (
                <text x={x + WHITE_W / 2} y={WHITE_H - 8} class="key-c">
                  C{m / 12 - 1}
                </text>
              )}
              {mark && <KeyLabel x={x + WHITE_W / 2} y={WHITE_H - 16} mark={mark} />}
            </g>
          );
        })}
        {keys
          .filter((m) => !isWhite(m))
          .map((m) => {
            const mark = markAt.get(m);
            const x = xOfWhite(m - 1) + WHITE_W - BLACK_W / 2;
            return (
              <g key={m} data-midi={m} {...handlers(m)}>
                <rect x={x} y={0.5} width={BLACK_W} height={BLACK_H} rx={2} class={`key black ${mark ? mark.role : ''}`} />
                {mark && <KeyLabel x={x + BLACK_W / 2} y={BLACK_H - 12} mark={mark} />}
              </g>
            );
          })}
      </svg>
    </div>
  );
}

function KeyLabel({ x, y, mark }: { x: number; y: number; mark: KeyMark }) {
  return (
    <>
      <circle cx={x} cy={y} r={9} class={`mark ${mark.role}`} />
      {mark.label && (
        <text x={x} y={y} class="mark-label" style={{ fontSize: [...mark.label].length > 2 ? '7px' : '9px' }}>
          {mark.label}
        </text>
      )}
    </>
  );
}
