import { PROFILES } from '../instruments';
import { INSTRUMENTS, instrument, selectInstrument } from '../state/session';
import type { Instrument } from '../state/session';

/** Persistent bar: the instrument profile, one tap away. It also picks the view (PRD section 7, I-1, V-4). */
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
              {PROFILES[id].label}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
