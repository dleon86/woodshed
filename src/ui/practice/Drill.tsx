import { useEffect } from 'preact/hooks';
import type { Session } from '../../cards';
import {
  addEntry,
  checkEntries,
  endSession,
  enterPitch,
  flipped,
  grade,
  mode,
  next,
  outcome,
  removeEntry,
} from '../../state/practice';
import { LETTERS, type Letter } from '../../theory';
import { InstrumentView } from '../views/InstrumentView';
import { FlashCard } from './FlashCard';
import { QuizCard } from './QuizCard';

/** The drill: one card at a time. Flash cards are flipped and self-graded (F-1 to F-3); quiz cards are answered (PRD 6.2). */
export function Drill({ session }: { session: Session }) {
  const card = session.queue[0]!;
  const done = new Set(session.log.filter((l) => l.got).map((l) => l.card.id)).size;
  const isFlipped = flipped.value;
  const quiz = mode.value === 'quiz';

  // Desktop and iPad keyboards. Flash cards: space flips, arrows grade.
  // Quiz: letters enter naturals, Backspace undoes, Enter checks or moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button handles its own Space/Enter (Got it, End…).
      if (e.target instanceof HTMLButtonElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (mode.value === 'quiz') {
        const letter = e.key.toUpperCase();
        if (e.key === 'Enter') outcome.value ? next() : checkEntries();
        else if (e.key === 'Backspace') removeEntry();
        else if ((LETTERS as readonly string[]).includes(letter)) addEntry({ note: { letter: letter as Letter, alter: 0 } });
        else return;
        e.preventDefault();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipped.value = !flipped.value;
      } else if (flipped.value && e.key === 'ArrowRight') grade(true);
      else if (flipped.value && e.key === 'ArrowLeft') grade(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section class="split" aria-label={quiz ? 'Quiz' : 'Flash cards'}>
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

        {quiz ? (
          <QuizCard key={`${card.id}:${session.log.length}`} card={card} />
        ) : (
          <>
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
            <p class="muted small drill-hint">
              {isFlipped ? 'Swipe right if you got it, left if you missed it' : 'Tap the card to flip it'}
            </p>
          </>
        )}
      </div>
      <div class="pane view-pane" aria-label="Instrument view">
        {/* Before the answer the instrument is empty; in a quiz, tapping it enters notes (Q-1). */}
        <InstrumentView show={isFlipped ? card.show : undefined} onTap={quiz ? enterPitch : undefined} />
      </div>
    </section>
  );
}
