import { INSTRUMENT_INFO, instrument, view } from '../../state/session';

/** Practice: deck and mode picker, then the drill. Placeholder until M2. */
export function Practice() {
  return (
    <section class="split" aria-labelledby="practice-title">
      <div class="pane card-pane">
        <h1 id="practice-title">Practice</h1>
        <div class="flashcard" aria-label="Sample card">
          <span class="flashcard-prompt">A♭ major</span>
          <span class="flashcard-hint">Flash cards arrive in M2</span>
        </div>
      </div>
      <div class="pane view-pane" aria-label="Instrument view">
        <div class="view-placeholder">
          <strong>{view.value[0]!.toUpperCase() + view.value.slice(1)} view</strong>
          <span>{INSTRUMENT_INFO[instrument.value].label} · drawn in M3</span>
        </div>
      </div>
    </section>
  );
}
