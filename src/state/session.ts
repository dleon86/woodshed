import { computed, effect, signal } from '@preact/signals';
import { INSTRUMENT_IDS, type InstrumentId, PROFILES, type Profile } from '../instruments';
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

/* ---------- Instrument profiles (PRD section 4) ---------- */

export const INSTRUMENTS = INSTRUMENT_IDS;
export type Instrument = InstrumentId;

/** I-1: the last chosen instrument and view are remembered. */
export const instrument = signal<Instrument>(load('instrument', INSTRUMENTS, 'keyboard'));
export const view = signal<View>(load('view', VIEWS, PROFILES[instrument.value].defaultView));
export const profile = computed<Profile>(() => PROFILES[instrument.value]);

export function selectInstrument(next: Instrument): void {
  instrument.value = next;
  view.value = PROFILES[next].defaultView;
}

effect(() => save('instrument', instrument.value));
effect(() => save('view', view.value));
