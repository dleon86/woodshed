import { effect, signal } from '@preact/signals';
import { load, save } from './storage';

/* ---------- Sections (PRD section 7) ---------- */

export const SECTIONS = ['practice', 'explore', 'progress', 'settings'] as const;
export type Section = (typeof SECTIONS)[number];

function sectionFromHash(): Section {
  const name = location.hash.replace(/^#\/?/, '');
  return (SECTIONS as readonly string[]).includes(name) ? (name as Section) : 'practice';
}

/** Hash routing (#/explore) so deep links work on GitHub Pages without a server. */
export const section = signal<Section>(sectionFromHash());
window.addEventListener('hashchange', () => (section.value = sectionFromHash()));

/* ---------- Views (PRD 6.3) ---------- */

export const VIEWS = ['keyboard', 'fretboard', 'staff'] as const;
export type View = (typeof VIEWS)[number];

/* ---------- Instrument profiles (placeholder until M3) ---------- */

export const INSTRUMENTS = ['keyboard', 'guitar', 'bass'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const INSTRUMENT_INFO: Record<Instrument, { label: string; defaultView: View }> = {
  keyboard: { label: 'Keyboard', defaultView: 'keyboard' },
  guitar: { label: 'Guitar', defaultView: 'fretboard' },
  bass: { label: 'Bass', defaultView: 'fretboard' },
};

/** I-1: the last chosen instrument and view are remembered. */
export const instrument = signal<Instrument>(load('instrument', INSTRUMENTS, 'keyboard'));
export const view = signal<View>(load('view', VIEWS, INSTRUMENT_INFO[instrument.value].defaultView));

export function selectInstrument(next: Instrument): void {
  instrument.value = next;
  view.value = INSTRUMENT_INFO[next].defaultView;
}

effect(() => save('instrument', instrument.value));
effect(() => save('view', view.value));
