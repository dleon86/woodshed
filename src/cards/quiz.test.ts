import { describe, expect, it } from 'vitest';
import { parseNote, pitchClass } from '../theory';
import { DEFAULT_DECK, V1_INTERVALS, buildDeck } from './generate';
import { type Entry, type Quiz, allCorrect, choiceOptions, gradeNotes } from './quiz';
import { type Card, type DeckConfig, FAMILIES } from './types';

const ALL = buildDeck({
  ...DEFAULT_DECK,
  families: [...FAMILIES],
  scaleTypes: ['major', 'natural-minor', 'harmonic-minor', 'melodic-minor'],
  intervals: [...V1_INTERVALS],
  directions: ['up', 'down'],
  roots: 'all',
  wording: 'both',
} satisfies DeckConfig);

/** Several families share a front ("D major" is a key signature card and a scale card), so name the family when it matters. */
const card = (front: string, family?: Card['family']): Card => {
  const found = ALL.find((c) => c.front === front && (!family || c.family === family));
  if (!found) throw new Error(`No card "${front}"`);
  return found;
};
const notesQuiz = (front: string, family?: Card['family']) => card(front, family).quiz as Extract<Quiz, { kind: 'notes' }>;
const choiceQuiz = (front: string) => card(front).quiz as Extract<Quiz, { kind: 'choice' }>;
const picked = (...names: string[]): Entry[] => names.map((n) => ({ note: parseNote(n) }));
const played = (...names: string[]): Entry[] => names.map((n) => ({ pitchClass: pitchClass(parseNote(n)) }));

describe('every card has a quiz answer that matches its back', () => {
  it('note cards expect the notes on the back', () => {
    expect(notesQuiz('6th of A♭ major').expected).toEqual([parseNote('F')]);
    expect(notesQuiz('Perfect 5th above E♭').expected).toEqual([parseNote('Bb')]);
    expect(notesQuiz('B♭ is the V of what?').expected).toEqual([parseNote('Eb')]);
    expect(notesQuiz('E♭ harmonic minor', 'scale-spelling').expected.map((n) => n.letter).join('')).toBe('EFGABCD');
  });

  it('naming cards have the right answer in their pool', () => {
    for (const c of ALL) {
      if (c.quiz.kind === 'choice') {
        expect(c.quiz.pool, c.id).toContain(c.quiz.correct);
        expect(c.quiz.pool.length, c.id).toBeGreaterThanOrEqual(4);
      } else {
        expect(c.quiz.expected.length, c.id).toBe(c.quiz.spelling.length);
        expect(c.quiz.expected.length, c.id).toBeGreaterThan(0);
      }
    }
    expect(choiceQuiz('A♭ major').correct).toBe('4♭');
    expect(choiceQuiz('4 flats').correct).toBe('A♭ major / F minor');
    expect(choiceQuiz('E♭ up to B♭').correct).toBe('Perfect 5th');
    expect(choiceQuiz('Relative minor of A♭ major').correct).toBe('F minor');
  });
});

describe('grading notes (Q-4, Q-5)', () => {
  it('marks right and wrong notes', () => {
    const quiz = notesQuiz('6th of A♭ major');
    expect(gradeNotes(quiz, picked('F'))).toEqual([{ mark: 'correct', shown: 'F' }]);
    expect(gradeNotes(quiz, picked('G'))).toEqual([{ mark: 'wrong', shown: 'G' }]);
    expect(allCorrect(gradeNotes(quiz, picked('F')))).toBe(true);
    expect(allCorrect(gradeNotes(quiz, picked('G')))).toBe(false);
    expect(allCorrect(gradeNotes(quiz, []))).toBe(false);
  });

  it('grades a scale note by note, in order', () => {
    const quiz = notesQuiz('D major', 'scale-spelling');
    const marks = gradeNotes(quiz, picked('D', 'E', 'F', 'G', 'A', 'B', 'C#')).map((g) => g.mark);
    expect(marks).toEqual(['correct', 'correct', 'wrong', 'correct', 'correct', 'correct', 'correct']);
    // A missing note is wrong, not skipped.
    expect(gradeNotes(quiz, picked('D', 'E')).map((g) => g.mark).slice(2)).toEqual(['wrong', 'wrong', 'wrong', 'wrong', 'wrong']);
  });

  it('accepts enharmonic spellings with the reason (the PRD examples)', () => {
    const scale = gradeNotes(notesQuiz('3rd of C♯ major'), picked('F'))[0]!;
    expect(scale.mark).toBe('respelled');
    expect(scale.why).toBe('Written E♯ here: a scale uses each letter once, and the 3rd above C is an E.');

    const interval = gradeNotes(notesQuiz('Major 3rd above G♯'), picked('C'))[0]!;
    expect(interval.mark).toBe('respelled');
    expect(interval.why).toBe('Written B♯: a 3rd above G is always some kind of B.');

    const raised = gradeNotes(notesQuiz('7th of G♯ harmonic minor'), picked('G'))[0]!;
    expect(raised.why).toBe('Written F𝄪 here: a scale uses each letter once, and the 7th above G is an F.');

    const below = gradeNotes(notesQuiz('Perfect 5th below E♭'), picked('G#'))[0]!;
    expect(below.why).toBe('Written A♭: a 5th below E is always some kind of A.');
    expect(allCorrect([scale, interval, raised, below])).toBe(true);
  });

  it('explains reverse interval answers from the note given', () => {
    // "B♯ is a major 3rd above what?" → G♯; answering A♭ is the same key.
    const graded = gradeNotes(notesQuiz('B♯ is a major 3rd above what?'), picked('Ab'))[0]!;
    expect(graded.why).toBe('Written G♯: a 3rd below B is always some kind of G.');
  });

  it('treats a pitch-only answer (keyboard, mic) as the expected spelling, with no note', () => {
    const graded = gradeNotes(notesQuiz('3rd of C♯ major'), played('F'));
    expect(graded).toEqual([{ mark: 'correct', shown: 'E♯' }]);
    expect(gradeNotes(notesQuiz('3rd of C♯ major'), played('F#'))).toEqual([{ mark: 'wrong', shown: 'F♯' }]);
  });
});

describe('multiple choice (Q-2)', () => {
  /** Small repeatable generator; the seed is scrambled first so nearby seeds give unrelated sequences. */
  const random = (seed: number) => {
    let state = (seed * 2654435761) % 2147483647 || 1;
    return () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  };

  it('offers the right answer among four distinct options, for every naming card', () => {
    for (const c of ALL) {
      if (c.quiz.kind !== 'choice') continue;
      const options = choiceOptions(c.quiz, random(c.id.length + 7));
      expect(options, c.id).toHaveLength(4);
      expect(new Set(options).size, c.id).toBe(4);
      expect(options, c.id).toContain(c.quiz.correct);
    }
  });

  it('draws distractors from nearby answers', () => {
    for (let seed = 1; seed < 40; seed++) {
      const options = choiceOptions(choiceQuiz('A♭ major'), random(seed));
      for (const o of options) expect(['6♭', '5♭', '4♭', '3♭', '2♭', '1♭', '7♭']).toContain(o);
    }
  });

  it('does not always put the right answer in the same place', () => {
    const places = new Set<number>();
    for (let seed = 1; seed < 60; seed++) places.add(choiceOptions(choiceQuiz('A♭ major'), random(seed)).indexOf('4♭'));
    expect(places.size).toBe(4);
  });
});
