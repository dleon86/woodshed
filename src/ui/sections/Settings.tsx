import { profile } from '../../state/session';
import { THEME_PREFS, themePref } from '../../state/theme';
import { activeFret, leftHanded, setFret } from '../../state/views';
import { MicCheck } from '../settings/MicCheck';
import { SoundSettings } from '../settings/SoundSettings';

const THEME_LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' } as const;

/** Settings (PRD 6.8). */
export function Settings() {
  const p = profile.value;
  const fret = activeFret.value;
  return (
    <section class="page">
      <h1>Settings</h1>

      {p.fretboard && fret && (
        <>
          <div class="setting">
            <div>
              <h2>
                <label for="tuning">{p.label} tuning</label>
              </h2>
              <p class="muted">Applies to the fretboard and the playable range.</p>
            </div>
            <select
              id="tuning"
              class="select"
              value={fret.tuning}
              onChange={(e) => setFret({ tuning: e.currentTarget.value })}
            >
              {p.fretboard.tunings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div class="setting">
            <h2 id="frets-label">Frets</h2>
            <div class="segmented" role="radiogroup" aria-labelledby="frets-label">
              {[...p.fretboard.fretChoices].sort((a, b) => a - b).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={fret.frets === n} onClick={() => setFret({ frets: n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div class="setting">
            <div>
              <h2 id="hand-label">Left-handed fretboard</h2>
              <p class="muted">Nut on the right.</p>
            </div>
            <div class="segmented" role="radiogroup" aria-labelledby="hand-label">
              {([false, true] as const).map((on) => (
                <button key={String(on)} type="button" role="radio" aria-checked={leftHanded.value === on} onClick={() => (leftHanded.value = on)}>
                  {on ? 'Left' : 'Right'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <SoundSettings />
      <MicCheck />

      <div class="setting">
        <div>
          <h2 id="theme-label">Theme</h2>
          <p class="muted">Auto follows your device.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-labelledby="theme-label">
          {THEME_PREFS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={themePref.value === id}
              onClick={() => (themePref.value = id)}
            >
              {THEME_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      <p class="muted small">
        {p.fretboard ? 'Tuning and frets are saved per instrument. ' : 'Pick guitar or bass in the bar above for fretboard settings. '}
        Woodshed is open source under the MIT license. Music symbols from Bravura (SIL Open Font License).
      </p>
    </section>
  );
}
