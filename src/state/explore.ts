import { signal } from '@preact/signals';
import { type Note, type ScaleType, note, pitchClass, sameNote, scaleTonics } from '../theory';

/** Scale browser selection. Kept in a module signal so it survives switching sections. */
export const exploreType = signal<ScaleType>('major');
export const exploreTonic = signal<Note>(note('C'));

/** Open a scale. A tonic with no standard signature for the type moves to its enharmonic twin (G♭ minor → F♯ minor). */
export function openScale(tonic: Note, type: ScaleType): void {
  const tonics = scaleTonics(type);
  exploreType.value = type;
  exploreTonic.value =
    tonics.find((t) => sameNote(t, tonic)) ?? tonics.find((t) => pitchClass(t) === pitchClass(tonic)) ?? tonics[0]!;
}
