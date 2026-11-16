import { useEffect } from 'preact/hooks';
import type { Session } from '../../cards';
import { endSession, flipped, grade } from '../../state/practice';
import { InstrumentView } from '../views/InstrumentView';
import { FlashCard } from './FlashCard';

/** The drill: one card at a time, flip, grade (F-1 to F-3). */
export function Drill({ session }: { session: Session }) {
  const card = session.queue[0]!;
  const done = new Set(session.log.filter((l) => l.got).map((l) => l.card.id)).size;
  const isFlipped = flipped.value;

  // Desktop and iPad keyboards: space flips, arrows grade.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button handles its own Space/Enter (Got it, End…).
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipped.value = !flipped.value;
      } else if (flipped.value && e.key === 'ArrowRight') grade(true);
      else if (flipped.value && e.key === 'ArrowLeft') grade(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section class="split" aria-label="Flash cards">
      <div class="pane card-pane drill">
        <div class="drill-top">
          <div
            class="progress"
            role="progressbar"
            aria-label="Cards done"
            aria-valuemin={0}
            aria-valuemax={session.total}
            aria-valuenow={done}
          >
            <span style={{ width: `${(100 * done) / session.total}%` }} />
          </div>
          <span class="muted small">
            {done} / {session.total}
          </span>
          <button type="button" class="link" onClick={endSession}>
            End
          </button>
        </div>

        <FlashCard
          key={`${card.id}:${session.log.length}`}
          card={card}
          flipped={isFlipped}
          onFlip={() => (flipped.value = !flipped.value)}
          onGrade={grade}
        />

        {isFlipped ? (
          <div class="grade-buttons">
            <button type="button" class="missed" onClick={() => grade(false)}>
              Missed it
            </button>
            <button type="button" class="got" onClick={() => grade(true)}>
              Got it
            </button>
          </div>
        ) : (
          <button type="button" class="primary" onClick={() => (flipped.value = true)}>
            Show answer
          </button>
        )}
        <p class="muted small drill-hint">{isFlipped ? 'Swipe right if you got it, left if you missed it' : 'Tap the card to flip it'}</p>
      </div>
      <div class="pane view-pane" aria-label="Instrument view">
        <InstrumentView show={isFlipped ? card.show : undefined} />
      </div>
    </section>
  );
}
