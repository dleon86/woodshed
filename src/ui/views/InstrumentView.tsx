import { useEffect, useRef } from 'preact/hooks';
import { audioSupported } from '../../audio/player';
import type { Show } from '../../cards';
import { fretPositions, placeNotes, uniqueNotes, writtenPitch } from '../../instruments';
import { profile, view } from '../../state/session';
import { droneFor, droneOn, micState, playShow, playing, stopPlaying, tapDown, tapUp, toggleDrone } from '../../state/sound';
import {
  LABEL_STYLES,
  type LabelStyle,
  activeFret,
  activeRange,
  activeTuning,
  labelStyle,
  leftHanded,
  pinStaff,
} from '../../state/views';
import { midi, noteId, noteName } from '../../theory';
import { Fretboard } from './Fretboard';
import { Keyboard, type Press } from './Keyboard';
import { Staff } from './Staff';
import { labelFor, roleOf } from './labels';

const LABEL_TEXT: Record<LabelStyle, string> = { names: 'A♭', degrees: '♭3', intervals: 'm3', none: 'Off' };
const LABEL_NAME: Record<LabelStyle, string> = {
  names: 'Note names',
  degrees: 'Scale degrees',
  intervals: 'Intervals from the root',
  none: 'No labels',
};

/**
 * The instrument's view (V-1 to V-6): keyboard or fretboard, plus the staff
 * when pinned. `show` is the answer to draw; without it the instrument is
 * drawn empty (before a card is flipped).
 */
export function InstrumentView({ show, onTap }: { show?: Show | undefined; onTap?: ((midi: number) => void) | undefined }) {
  // V-7: every key and fret sounds when touched, several at once. The first touch of a visit
  // cannot start audio on the way down (browsers need a completed tap), so it sounds on the way up.
  const unsounded = useRef<number | null>(null);
  const press: Press = (m, phase) => {
    if (phase === 'down') {
      unsounded.current = tapDown(m) ? null : m;
      onTap?.(m);
    } else if (unsounded.current === m) {
      unsounded.current = null;
      tapUp(m);
    }
  };
  const active = view.value;
  const p = profile.value;
  const style = labelStyle.value;

  // Sound follows the answer on screen: a new card (or none) ends the old card's playback,
  // and the drone moves to the new root (A-5).
  const answer = show ? `${show.kind}:${show.notes.map(noteId).join(' ')}:${noteId(show.root)}` : '';
  const drone = droneOn.value;
  useEffect(() => {
    droneFor(show);
    return stopPlaying;
  }, [answer, drone, p.id]);
  useEffect(() => () => droneFor(undefined), []);
  const listening = micState.value === 'listening' || micState.value === 'asking';
  const placed = show ? placeNotes(show.notes, p, activeRange.value) : [];
  const describe = (i: number) => {
    const n = show!.notes[i]!;
    return { label: labelFor(n, show!.root, style), role: roleOf(n, show!.root, show!.focus) };
  };

  const staff = (
    <Staff
      clef={p.clef}
      keyOf={show?.key}
      notes={placed.map((pitch, i) => ({ pitch: writtenPitch(pitch, p), ...describe(i) }))}
    />
  );

  let main;
  if (active === 'keyboard') {
    main = <Keyboard marks={placed.map((pitch, i) => ({ midi: midi(pitch), ...describe(i) }))} center={p.center} onPress={press} />;
  } else {
    const tuning = activeTuning.value;
    const frets = activeFret.value?.frets;
    main =
      active === 'fretboard' && tuning && frets !== undefined ? (
        <Fretboard
          strings={tuning.strings.length}
          frets={frets}
          leftHanded={leftHanded.value}
          stringNames={tuning.strings.map(noteName)}
          openMidis={tuning.strings.map(midi)}
          onPress={press}
          marks={
            show
              ? fretPositions(tuning.strings, frets, uniqueNotes(show.notes)).map((pos) => ({
                  string: pos.string,
                  fret: pos.fret,
                  label: labelFor(pos.note, show.root, style),
                  role: roleOf(pos.note, show.root, show.focus),
                }))
              : []
          }
        />
      ) : (
        staff // a staff-first profile (brass, later) shows the staff as its main view
      );
  }

  return (
    <div class="instrument-view">
      <div class="view-tools">
        <div class="segmented compact" role="radiogroup" aria-label="Labels">
          {LABEL_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              aria-label={LABEL_NAME[s]}
              title={LABEL_NAME[s]}
              onClick={() => (labelStyle.value = s)}
            >
              {LABEL_TEXT[s]}
            </button>
          ))}
        </div>
        <div class="view-buttons">
          <button
            type="button"
            class="chip compact play"
            disabled={!show || listening || !audioSupported}
            title={audioSupported ? undefined : 'This browser cannot play sound'}
            onClick={() => (playing.value ? stopPlaying() : show && playShow(show))}
          >
            {playing.value ? '■ Stop' : '▶ Play'}
          </button>
          <button
            type="button"
            class="chip compact"
            aria-pressed={drone}
            disabled={listening || !audioSupported}
            title="Hold the root note while you play"
            onClick={toggleDrone}
          >
            Drone
          </button>
          {active !== 'staff' && (
            <button
              type="button"
              class="chip compact"
              aria-pressed={pinStaff.value}
              onClick={() => (pinStaff.value = !pinStaff.value)}
            >
              Pin staff
            </button>
          )}
        </div>
      </div>
      <div class="view-main">{main}</div>
      {/* V-6: the pinned staff shows the same notes alongside the keyboard or fretboard. */}
      {pinStaff.value && active !== 'staff' && <div class="view-pinned">{staff}</div>}
    </div>
  );
}
