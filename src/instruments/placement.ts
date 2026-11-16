/**
 * Putting spelled notes into octaves for a profile, and converting between
 * sounding and written pitch (I-2, I-3).
 */
import { type Note, type Pitch, midi, transposePitch } from '../theory';
import type { Profile } from './profiles';

/**
 * Stack notes upward from the first (each strictly above the one before),
 * then choose the octave whose average pitch is closest to the profile's
 * centre while staying inside `range`. Returns sounding pitches.
 */
export function placeNotes(notes: readonly Note[], profile: Profile, range: { low: number; high: number }): Pitch[] {
  if (notes.length === 0) return [];
  const stacked: Pitch[] = [];
  for (const n of notes) {
    const prev = stacked.at(-1);
    let p: Pitch = { ...n, octave: prev ? prev.octave - 1 : 0 };
    while (prev && midi(p) <= midi(prev)) p = { ...p, octave: p.octave + 1 };
    stacked.push(p);
  }
  const mids = stacked.map(midi);
  const mean = mids.reduce((a, b) => a + b, 0) / mids.length;
  const lowest = mids[0]!;
  const highest = mids.at(-1)!;

  let best = Math.round((profile.center - mean) / 12);
  const fits = (k: number) => lowest + 12 * k >= range.low && highest + 12 * k <= range.high;
  if (!fits(best)) {
    // Nearest octave shift that fits; if nothing fits (span wider than range), keep the centred one.
    const candidates = Array.from({ length: 21 }, (_, i) => best + (i % 2 ? (i + 1) / 2 : -i / 2));
    best = candidates.find(fits) ?? best;
  }
  return stacked.map((p) => ({ ...p, octave: p.octave + best }));
}

/** Sounding pitch → written pitch for the staff (guitar: an octave up). */
export function writtenPitch(sounding: Pitch, profile: Profile): Pitch {
  if (!profile.sounds) return sounding;
  const back = profile.sounds.direction === 'down' ? 'up' : 'down';
  return transposePitch(sounding, profile.sounds.interval, back);
}
