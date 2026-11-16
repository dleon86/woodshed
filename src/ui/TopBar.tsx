import { INSTRUMENTS, INSTRUMENT_INFO, VIEWS, instrument, selectInstrument, view } from '../state/session';
import type { Instrument } from '../state/session';

const VIEW_LABEL = { keyboard: 'Keys', fretboard: 'Frets', staff: 'Staff' } as const;

/** Persistent bar: instrument profile and view switcher, one tap away (PRD section 7, I-1, V-4). */
export function TopBar() {
  return (
    <header class="topbar">
      <span class="brand">Woodshed</span>
      <label class="instrument">
        <span class="visually-hidden">Instrument</span>
        <select
          value={instrument.value}
          onChange={(e) => selectInstrument(e.currentTarget.value as Instrument)}
        >
          {INSTRUMENTS.map((id) => (
            <option value={id} key={id}>
              {INSTRUMENT_INFO[id].label}
            </option>
          ))}
        </select>
      </label>
      <div class="segmented view-switch" role="radiogroup" aria-label="View">
        {VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={view.value === id}
            onClick={() => (view.value = id)}
          >
            {VIEW_LABEL[id]}
          </button>
        ))}
      </div>
    </header>
  );
}
