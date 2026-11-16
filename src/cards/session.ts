/**
 * A flash card session (F-1 to F-3). Pure state transitions: the UI keeps the
 * current Session in a signal and replaces it with the result of answer().
 */
import type { Card } from './types';

export interface Session {
  /** Cards still to show; the first is the current card. */
  readonly queue: readonly Card[];
  /** Cards answered, in order, with the result. A missed card appears once per miss. */
  readonly log: readonly { readonly card: Card; readonly got: boolean }[];
  /** Distinct cards in the session. */
  readonly total: number;
  readonly startedAt: number;
}

/** How many cards later a missed card comes back (F-3). */
export const RETRY_GAP = 4;

/** Fisher–Yates with an injectable random source so tests can be deterministic. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function startSession(
  cards: readonly Card[],
  options: { limit?: number; random?: () => number; now?: number } = {},
): Session {
  const picked = shuffle(cards, options.random).slice(0, options.limit ?? cards.length);
  return { queue: picked, log: [], total: picked.length, startedAt: options.now ?? Date.now() };
}

/**
 * Where a missed card goes back into the remaining queue (F-3): a few cards
 * later, so it is fresh enough to reinforce but not an immediate repeat.
 * With fewer cards left it goes last; on its own it comes straight back.
 */
export function retryIndex(remaining: number): number {
  return Math.min(RETRY_GAP, remaining);
}

export function answer(session: Session, got: boolean): Session {
  const [card, ...rest] = session.queue;
  if (!card) return session;
  const queue = got ? rest : [...rest.slice(0, retryIndex(rest.length)), card, ...rest.slice(retryIndex(rest.length))];
  return { ...session, queue, log: [...session.log, { card, got }] };
}

export function isDone(session: Session): boolean {
  return session.queue.length === 0;
}

export interface Summary {
  readonly total: number;
  /** Cards answered right the first time they came up. */
  readonly firstTry: number;
  /** Cards missed at least once, in the order first missed. */
  readonly missed: readonly Card[];
  readonly durationMs: number;
}

export function summarize(session: Session, now: number = Date.now()): Summary {
  const seen = new Set<string>();
  const missed: Card[] = [];
  let firstTry = 0;
  for (const { card, got } of session.log) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      if (got) firstTry++;
      else missed.push(card);
    }
  }
  return { total: session.total, firstTry, missed, durationMs: now - session.startedAt };
}
