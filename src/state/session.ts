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

/** I-1: the last chosen instrument is remembered. */
export const instrument = signal<Instrument>(load('instrument', INSTRUMENTS, 'keyboard'));
export const profile = computed<Profile>(() => PROFILES[instrument.value]);

/**
 * The instrument decides the view (V-4): keyboard → keys, guitar and bass →
 * fretboard. The staff is added below with Pin staff (V-6).
 */
export const view = computed<View>(() => profile.value.defaultView);

export function selectInstrument(next: Instrument): void {
  instrument.value = next;
}

effect(() => save('instrument', instrument.value));
save('view', null); // the view used to be chosen separately; drop the stale value
