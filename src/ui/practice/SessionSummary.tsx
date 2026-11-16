import { type Session, summarize } from '../../cards';
import { endSession, restart, start } from '../../state/practice';

function duration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** End of session: first-try score, time, and the cards missed. The full Q-7 summary lands with quizzes in M5. */
export function SessionSummary({ session }: { session: Session }) {
  const sum = summarize(session);
  return (
    <section class="page summary" aria-labelledby="summary-title">
      <h1 id="summary-title">Session done</h1>
      <div class="summary-stats">
        <div>
          <span class="stat">
            {sum.firstTry} / {sum.total}
          </span>
          <span class="muted small">right first time</span>
        </div>
        <div>
          <span class="stat">{duration(sum.durationMs)}</span>
          <span class="muted small">time</span>
        </div>
      </div>

      {sum.missed.length > 0 && (
        <>
          <h2>Missed</h2>
          <ul class="missed-list">
            {sum.missed.map((c) => (
              <li key={c.id}>
                <span>{c.front}</span>
                <strong>{c.answer}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      <div class="summary-actions">
        {sum.missed.length > 0 && (
          <button type="button" class="primary" onClick={() => start(sum.missed, 0)}>
            Practice {sum.missed.length} missed card{sum.missed.length === 1 ? '' : 's'}
          </button>
        )}
        <button type="button" class={sum.missed.length ? 'secondary' : 'primary'} onClick={restart}>
          Same deck again
        </button>
        <button type="button" class="secondary" onClick={endSession}>
          New deck
        </button>
      </div>
    </section>
  );
}
