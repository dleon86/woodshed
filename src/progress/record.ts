/**
 * Progress records (G-1): what is stored for each answer and each card, and
 * how a card's record changes with an answer. Pure, so it is unit-tested;
 * `db.ts` only stores what this produces.
 */

/** How an answer was given. */
export type InputMethod = 'self' | 'tap' | 'choice' | 'mic';

/** One row per answer. */
export interface AnswerRecord {
  /** The stable card id (never reused or renamed). */
  readonly cardId: string;
  /** When it was answered, in milliseconds since 1970. */
  readonly at: number;
  readonly correct: boolean;
  /** Time from the card appearing to the answer. */
  readonly ms: number;
  readonly input: InputMethod;
}

/** One row per card. */
export interface CardState {
  readonly cardId: string;
  readonly seen: number;
  readonly correct: number;
  /** Correct answers in a row, ending with the latest. */
  readonly streak: number;
  readonly lastSeen: number;
  /*
   * Spaced-repetition fields. Written from the first answer but not used for
   * scheduling in v1, so that feature can be switched on later without
   * migrating data (PRD section 10).
   */
  /** When the card is next due. */
  readonly due: number;
  /** Days between reviews. */
  readonly intervalDays: number;
  /** How fast the interval grows; 2.5 is the usual starting point. */
  readonly ease: number;
}

const DAY = 24 * 60 * 60 * 1000;
const EASE = { start: 2.5, min: 1.3, max: 2.8, up: 0.05, down: 0.2 } as const;
/** A missed card is due again after ten minutes. */
const RETRY_MS = 10 * 60 * 1000;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A card's record after an answer. The interval follows the usual scheme:
 * one day, then three, then multiplied by the ease each time it is right; a
 * miss resets the interval and lowers the ease.
 */
export function updateCardState(previous: CardState | undefined, answer: AnswerRecord): CardState {
  const p = previous ?? {
    cardId: answer.cardId,
    seen: 0,
    correct: 0,
    streak: 0,
    lastSeen: 0,
    due: 0,
    intervalDays: 0,
    ease: EASE.start,
  };
  if (!answer.correct) {
    return {
      ...p,
      seen: p.seen + 1,
      streak: 0,
      lastSeen: answer.at,
      due: answer.at + RETRY_MS,
      intervalDays: 0,
      ease: Math.max(EASE.min, round(p.ease - EASE.down)),
    };
  }
  const intervalDays = p.intervalDays === 0 ? 1 : p.intervalDays === 1 ? 3 : Math.round(p.intervalDays * p.ease);
  return {
    ...p,
    seen: p.seen + 1,
    correct: p.correct + 1,
    streak: p.streak + 1,
    lastSeen: answer.at,
    due: answer.at + intervalDays * DAY,
    intervalDays,
    ease: Math.min(EASE.max, round(p.ease + EASE.up)),
  };
}

/** Totals for the Progress screen. */
export interface ProgressSummary {
  readonly answers: number;
  readonly correct: number;
  readonly cardsSeen: number;
  /** Answers given since the start of today, local time. */
  readonly today: number;
}
