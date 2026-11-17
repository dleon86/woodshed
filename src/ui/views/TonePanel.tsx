import { ENVELOPE_RANGE } from '../../audio/player';
import { envelope, resetEnvelope } from '../../state/sound';

const ROWS = [
  ['attack', 'Attack', 'How fast a note starts'],
  ['decay', 'Decay', 'How fast it settles after the start'],
  ['sustain', 'Sustain', 'How loud it stays while held'],
  ['release', 'Release', 'How long it rings after you let go'],
] as const;

const format = (key: (typeof ROWS)[number][0], value: number) =>
  key === 'sustain' ? `${Math.round(value * 100)}%` : value < 1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(1)} s`;

/**
 * The envelope of touched notes (V-7): attack, decay, sustain, release.
 * It opens beside the instrument so it can be adjusted while playing.
 * Times use a squared slider scale, which gives fine control at the short end.
 */
export function TonePanel() {
  const env = envelope.value;
  return (
    <div class="tone-panel" role="group" aria-label="Tone of touched notes">
      {ROWS.map(([key, label, hint]) => {
        const { min, max } = ENVELOPE_RANGE[key];
        const linear = key === 'sustain';
        const toSlider = (v: number) => (linear ? (v - min) / (max - min) : Math.sqrt((v - min) / (max - min)));
        const fromSlider = (t: number) => min + (max - min) * (linear ? t : t * t);
        return (
          <label key={key} class="tone-row" title={hint}>
            <span>{label}</span>
            <input
              class="range"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={toSlider(env[key])}
              onInput={(e) => (envelope.value = { ...envelope.value, [key]: fromSlider(Number(e.currentTarget.value)) })}
            />
            <output>{format(key, env[key])}</output>
          </label>
        );
      })}
      <div class="tone-foot">
        <span class="muted small">Shapes the notes you play by touching keys or frets.</span>
        <button type="button" class="link" onClick={resetEnvelope}>
          Reset
        </button>
      </div>
    </div>
  );
}
