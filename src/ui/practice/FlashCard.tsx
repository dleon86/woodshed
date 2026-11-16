import { useRef, useState } from 'preact/hooks';
import type { Card } from '../../cards';

/** How far a swipe must travel to count as a grade (F-2). */
const SWIPE_DISTANCE = 80;

interface Props {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  /** Swipe right = got it, left = missed it. Only once the back is showing. */
  onGrade: (got: boolean) => void;
}

/** A flip card (F-1). Tap flips; once flipped, swipe right or left to grade (F-2). */
export function FlashCard({ card, flipped, onFlip, onGrade }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!start.current || !flipped) return;
    setDx(e.clientX - start.current.x);
  };

  const onPointerUp = (e: PointerEvent) => {
    const from = start.current;
    start.current = null;
    setDx(0);
    if (!from) return;
    const moveX = e.clientX - from.x;
    const moveY = e.clientY - from.y;
    if (flipped && Math.abs(moveX) >= SWIPE_DISTANCE && Math.abs(moveX) > Math.abs(moveY)) onGrade(moveX > 0);
    else if (Math.hypot(moveX, moveY) < 10) onFlip();
  };

  const swipe = dx > 20 ? 'got' : dx < -20 ? 'missed' : undefined;
  // Scale spelling: the labelled note row already is the answer, so don't print it twice.
  const answerIsNotes = card.notes?.slice(0, 7).map((n) => n.note).join(' ') === card.answer;

  return (
    <div
      class="flashcard"
      role="button"
      tabIndex={0}
      aria-label={flipped ? `${card.front}. Answer: ${card.answer}` : `${card.front}. Tap to show the answer`}
      data-flipped={flipped}
      data-swipe={swipe}
      style={dx ? { transform: `translateX(${dx}px) rotate(${dx / 30}deg)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        setDx(0);
      }}
    >
      {flipped ? (
        <>
          <span class="flashcard-question">{card.front}</span>
          {!answerIsNotes && <span class="flashcard-answer">{card.answer}</span>}
          {card.notes && (
            <ol class="degree-row card-notes">
              {card.notes.map((n, i) => (
                <li key={i}>
                  <span class="degree-note">{n.note}</span>
                  <span class="degree-label">{n.label}</span>
                </li>
              ))}
            </ol>
          )}
          {card.details.map((line) => (
            <span key={line} class="flashcard-detail">
              {line}
            </span>
          ))}
        </>
      ) : (
        <>
          <span class="flashcard-prompt">{card.front}</span>
          {card.frontNote && <span class="flashcard-hint">{card.frontNote}</span>}
        </>
      )}
    </div>
  );
}
