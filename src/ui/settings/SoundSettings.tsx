import { INTERVAL_PATTERNS, SCALE_PATTERNS, TEMPO_RANGE } from '../../audio/sequence';
import { REFERENCE_RANGE, autoPlayAnswer, intervalPattern, referencePitch, scalePattern, tempo } from '../../state/sound';

const SCALE_LABEL = { up: 'Up', down: 'Down', both: 'Both' } as const;
const INTERVAL_LABEL = { melodic: 'Melody', harmonic: 'Together', both: 'Both' } as const;

/** Sound settings (PRD 6.4, 6.8): tempo, how scales and intervals play, reference pitch. */
export function SoundSettings() {
  return (
    <>
      <div class="setting">
        <div>
          <h2>
            <label for="tempo">Tempo</label>
          </h2>
          <p class="muted">{tempo.value} notes per minute</p>
        </div>
        <input
          id="tempo"
          class="range"
          type="range"
          min={TEMPO_RANGE.min}
          max={TEMPO_RANGE.max}
          step={4}
          value={tempo.value}
          onInput={(e) => (tempo.value = Number(e.currentTarget.value))}
        />
      </div>

      <div class="setting">
        <h2 id="scale-play-label">Scales play</h2>
        <div class="segmented" role="radiogroup" aria-labelledby="scale-play-label">
          {SCALE_PATTERNS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={scalePattern.value === p} onClick={() => (scalePattern.value = p)}>
              {SCALE_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div class="setting">
        <div>
          <h2 id="interval-play-label">Intervals play</h2>
          <p class="muted">One note after the other, both together, or one then the other.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-labelledby="interval-play-label">
          {INTERVAL_PATTERNS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={intervalPattern.value === p} onClick={() => (intervalPattern.value = p)}>
              {INTERVAL_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div class="setting">
        <div>
          <h2 id="auto-play-label">After a quiz answer</h2>
          <p class="muted">Play the right answer by itself, or stay quiet until you tap Play.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-labelledby="auto-play-label">
          {([true, false] as const).map((on) => (
            <button key={String(on)} type="button" role="radio" aria-checked={autoPlayAnswer.value === on} onClick={() => (autoPlayAnswer.value = on)}>
              {on ? 'Play it' : 'Quiet'}
            </button>
          ))}
        </div>
      </div>

      <div class="setting">
        <div>
          <h2>
            <label for="reference">Reference pitch</label>
          </h2>
          <p class="muted">The A above middle C, in Hz. Standard is 440.</p>
        </div>
        <input
          id="reference"
          class="select number"
          type="number"
          inputMode="numeric"
          min={REFERENCE_RANGE.min}
          max={REFERENCE_RANGE.max}
          value={referencePitch.value}
          onChange={(e) => {
            const v = Math.round(Number(e.currentTarget.value));
            // Out-of-range or empty input snaps back to what was set before.
            if (v >= REFERENCE_RANGE.min && v <= REFERENCE_RANGE.max) referencePitch.value = v;
            e.currentTarget.value = String(referencePitch.value);
          }}
        />
      </div>
    </>
  );
}
