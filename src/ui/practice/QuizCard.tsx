import { useState } from 'preact/hooks';
import { type Card, type Family, entryText } from '../../cards';
import { addEntry, checkEntries, choose, entries, next, options, outcome, removeEntry } from '../../state/practice';
import { LETTERS, accidentalSymbol } from '../../theory';

/** What a quiz card is asking, where the prompt alone could mean two things ("C♯ major"). */
const QUESTION: Partial<Record<Family, string>> = {
  'key-signature': 'How many sharps or flats?',
  'reverse-key-signature': 'Which keys?',
  'scale-spelling': 'Spell the scale',
  'interval-naming': 'Which interval?',
};

const ACCIDENTALS = [-2, -1, 0, 1, 2] as const;
const ACCIDENTAL_NAME: Record<number, string> = {
  [-2]: 'Double flat',
  [-1]: 'Flat',
  0: 'Natural',
  1: 'Sharp',
  2: 'Double sharp',
};

/**
 * A quiz card (PRD 6.2): the prompt, a way to answer, then feedback.
 * Note cards are answered on the note-name picker here, or by tapping the
 * keyboard or fretboard (Q-1). Naming cards are multiple choice (Q-2).
 */
export function QuizCard({ card }: { card: Card }) {
  const result = outcome.value;
  const quiz = card.quiz;

  return (
    <div class="quiz">
      <div class="flashcard quiz-card" data-result={result ? (result.correct ? 'correct' : 'wrong') : undefined}>
        <span class={result ? 'flashcard-question' : 'flashcard-prompt'}>{card.front}</span>
        {!result && (QUESTION[card.family] || card.frontNote) && (
          <span class="flashcard-hint">{[QUESTION[card.family], card.frontNote].filter(Boolean).join(' · ')}</span>
        )}

        {quiz.kind === 'notes' && (quiz.expected.length > 1 || entries.value.length > 0) && (
          <ol class="answer-slots" aria-label="Your answer">
            {quiz.expected.map((_, i) => {
              const entry = entries.value[i];
              const graded = result?.graded?.[i];
              return (
                <li key={i} data-mark={graded?.mark} data-empty={!entry}>
                  {graded ? graded.shown || '–' : entry ? entryText(entry) : ''}
                </li>
              );
            })}
          </ol>
        )}

        {result && (
          <div class="feedback" role="status" aria-live="polite">
            <span class="verdict">{result.correct ? 'Correct' : 'Not quite'}</span>
            {/* Q-4: the right answer is always shown. */}
            <span class="flashcard-answer">{card.answer}</span>
            {result.graded?.map((g, i) => g.why && <span key={i} class="flashcard-detail why">{g.why}</span>)}
            {card.details.map((line) => (
              <span key={line} class="flashcard-detail">
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {result ? (
        <button type="button" class="primary" onClick={next}>
          Next
        </button>
      ) : quiz.kind === 'choice' ? (
        <div class="choices" role="group" aria-label="Choose the answer">
          {options.value.map((option) => (
            <button key={option} type="button" class="secondary choice" onClick={() => choose(option)}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <NotePicker many={quiz.expected.length > 1} full={entries.value.length >= quiz.expected.length} />
      )}
    </div>
  );
}

/**
 * Compact note-name picker (Q-1): choose an accidental, then tap a letter.
 * This is where spelling is chosen, so it is where a right-but-respelled
 * answer gets its note (Q-5).
 */
function NotePicker({ many, full }: { many: boolean; full: boolean }) {
  const [alter, setAlter] = useState(0);
  return (
    <div class="note-picker">
      <div class="segmented" role="radiogroup" aria-label="Accidental">
        {ACCIDENTALS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={alter === a}
            aria-label={ACCIDENTAL_NAME[a]}
            onClick={() => setAlter(a)}
          >
            {a === 0 ? '♮' : accidentalSymbol(a)}
          </button>
        ))}
      </div>
      <div class="letters" role="group" aria-label="Note">
        {LETTERS.map((letter) => (
          <button
            key={letter}
            type="button"
            class="secondary letter"
            disabled={full}
            aria-label={`${letter}${alter ? ` ${ACCIDENTAL_NAME[alter]!.toLowerCase()}` : ''}`}
            onClick={() => {
              addEntry({ note: { letter, alter } });
              setAlter(0); // each note starts from natural, like writing it down
            }}
          >
            {letter}
            {accidentalSymbol(alter)}
          </button>
        ))}
      </div>
      {many && (
        <div class="picker-actions">
          <button type="button" class="secondary" disabled={entries.value.length === 0} onClick={removeEntry}>
            ⌫ Undo
          </button>
          <button type="button" class="primary" disabled={entries.value.length === 0} onClick={checkEntries}>
            Check
          </button>
        </div>
      )}
      <p class="muted small drill-hint">Or tap the notes on the instrument below.</p>
    </div>
  );
}
