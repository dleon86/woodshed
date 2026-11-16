import { computed, effect, signal } from '@preact/signals';
import { type FretSettings, INSTRUMENT_IDS, PROFILES, type Tuning, soundingRange, tuningFor } from '../instruments';
import { instrument, profile } from './session';
import { load, loadJson, save } from './storage';

/** V-5: what the highlighted notes are labelled with. */
export const LABEL_STYLES = ['names', 'degrees', 'intervals', 'none'] as const;
export type LabelStyle = (typeof LABEL_STYLES)[number];
export const labelStyle = signal<LabelStyle>(load('labels', LABEL_STYLES, 'names'));
effect(() => save('labels', labelStyle.value));

/** V-6: keep the staff visible under the keyboard or fretboard. */
export const pinStaff = signal(load('pinStaff', ['on', 'off'] as const, 'off') === 'on');
effect(() => save('pinStaff', pinStaff.value ? 'on' : 'off'));

/** V-2: mirror the fretboard for left-handed players. */
export const leftHanded = signal(load('leftHanded', ['on', 'off'] as const, 'off') === 'on');
effect(() => save('leftHanded', leftHanded.value ? 'on' : 'off'));

/* ---------- Tuning and frets per fretted instrument (I-4) ---------- */

type FretSettingsMap = Partial<Record<string, FretSettings>>;

function parseFretSettings(value: unknown): FretSettingsMap | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const out: FretSettingsMap = {};
  for (const id of INSTRUMENT_IDS) {
    const spec = PROFILES[id] as { fretboard?: { fretChoices: readonly number[] } };
    const v = (value as Record<string, unknown>)[id] as Partial<FretSettings> | undefined;
    if (!spec.fretboard || !v || typeof v.tuning !== 'string' || typeof v.frets !== 'number') continue;
    if (spec.fretboard.fretChoices.includes(v.frets)) out[id] = { tuning: v.tuning, frets: v.frets };
  }
  return out;
}

export const fretSettings = signal<FretSettingsMap>(loadJson('frets', parseFretSettings, {}));
effect(() => save('frets', JSON.stringify(fretSettings.value)));

/** The active instrument's tuning and fret count, with defaults filled in. */
export const activeFret = computed<FretSettings | undefined>(() => {
  const fb = profile.value.fretboard;
  if (!fb) return undefined;
  const saved = fretSettings.value[instrument.value];
  return { tuning: tuningFor(profile.value, saved?.tuning)!.id, frets: saved?.frets ?? fb.fretChoices[0]! };
});

export const activeTuning = computed<Tuning | undefined>(() => tuningFor(profile.value, activeFret.value?.tuning));

export const activeRange = computed(() => soundingRange(profile.value, activeFret.value));

export function setFret(change: Partial<FretSettings>): void {
  const current = activeFret.value;
  if (!current) return;
  fretSettings.value = { ...fretSettings.value, [instrument.value]: { ...current, ...change } };
}
