import { describe, expect, it } from 'vitest';
import { type AnswerRecord, type CardState, updateCardState } from './record';

const DAY = 24 * 60 * 60 * 1000;
const answer = (correct: boolean, at: number): AnswerRecord => ({
  cardId: 'keysig:Ab-major',
  at,
  correct,
  ms: 2400,
  input: 'choice',
});

describe('card state (G-1)', () => {
  it('starts a record on the first answer', () => {
    expect(updateCardState(undefined, answer(true, 1000))).toEqual({
      cardId: 'keysig:Ab-major',
      seen: 1,
      correct: 1,
      streak: 1,
      lastSeen: 1000,
      due: 1000 + DAY,
      intervalDays: 1,
      ease: 2.55,
    });
  });

  it('grows the interval while answers are right: 1, 3, then times the ease', () => {
    let state: CardState | undefined;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      state = updateCardState(state, answer(true, i * DAY));
      intervals.push(state.intervalDays);
    }
    expect(intervals).toEqual([1, 3, 8, 21, 57]);
    expect(state).toMatchObject({ seen: 5, correct: 5, streak: 5 });
  });

  it('resets on a miss: due again in ten minutes, streak gone, ease lower but never below 1.3', () => {
    let state = updateCardState(updateCardState(undefined, answer(true, 0)), answer(true, DAY));
    state = updateCardState(state, answer(false, 2 * DAY));
    expect(state).toMatchObject({ seen: 3, correct: 2, streak: 0, intervalDays: 0, due: 2 * DAY + 600_000, ease: 2.4 });
    for (let i = 0; i < 20; i++) state = updateCardState(state, answer(false, 3 * DAY));
    expect(state.ease).toBe(1.3);
    // …and the next right answer starts again from one day.
    expect(updateCardState(state, answer(true, 4 * DAY)).intervalDays).toBe(1);
  });

  it('caps the ease', () => {
    let state: CardState | undefined;
    for (let i = 0; i < 30; i++) state = updateCardState(state, answer(true, i));
    expect(state!.ease).toBe(2.8);
  });
});
