/**
 * Quiz answers (PRD 6.2): what a card expects, grading, and the note shown
 * when an answer is right but spelled differently (Q-5). Pure, no DOM.
 */
import { type Direction, type Letter, type Note, noteName, ordinal, pitchClass, sameNote } from '../theory';

/** Why an expected note has the letter it has: it is the `number`th above or below `from`. */
export interface Spelling {
  readonly number: number;
  readonly direction: Direction;
  readonly from: Letter;
  /** True for scale notes, where the rule is "each letter once". */
  readonly scale: boolean;
}

export type Quiz =
  | {
      /** Enter notes: one for a degree or interval card, seven in order for a scale (Q-1). */
      readonly kind: 'notes';
      readonly expected: readonly Note[];
      /** One per expected note. */
      readonly spelling: readonly Spelling[];
    }
  | {
      /** Pick the answer from a few options (Q-2). */
      readonly kind: 'choice';
      readonly correct: string;
      /** Every possible answer of this kind, in a natural order; distractors are drawn from near the right one. */
      readonly pool: readonly string[];
    };

/* ---------- Note answers ---------- */

/** What was entered: a spelled note from the picker, or only a pitch from the keyboard, fretboard or mic. */
export type Entry = { readonly note: Note } | { readonly pitchClass: number };

export type Mark = 'correct' | 'respelled' | 'wrong';

export interface GradedNote {
  readonly mark: Mark;
  /** What to show for the entry: its own spelling, or the expected one for a pitch-only entry that is right. */
  readonly shown: string;
  /** Q-5: why the expected spelling is what it is. Only for `respelled`. */
  readonly why?: string;
}

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const entryPitchClass = (e: Entry) => ('note' in e ? pitchClass(e.note) : e.pitchClass);

/** An entry as text before it is graded. A pitch-only entry has no spelling yet, so it shows as a sharp. */
export const entryText = (e: Entry): string => ('note' in e ? noteName(e.note) : SHARP_NAMES[e.pitchClass]!);

/** "Written E♯ here: a scale uses each letter once, and the 3rd above C is an E." */
export function spellingNote(expected: Note, spelling: Spelling): string {
  const letter = expected.letter;
  const article = /^[AEF]/.test(letter) ? 'an' : 'a';
  const step = `${ordinal(spelling.number)} ${spelling.direction === 'up' ? 'above' : 'below'} ${spelling.from}`;
  return spelling.scale
    ? `Written ${noteName(expected)} here: a scale uses each letter once, and the ${step} is ${article} ${letter}.`
    : `Written ${noteName(expected)}: ${/^8/.test(String(spelling.number)) ? 'an' : 'a'} ${step} is always some kind of ${letter}.`;
}

/**
 * Grade entered notes against the expected ones, position by position.
 * Enharmonic equivalents are correct (Q-5): a different spelling from the
 * picker is marked `respelled` with the reason; a pitch-only entry has no
 * spelling to compare, so it is simply correct and shown as expected.
 */
export function gradeNotes(quiz: Extract<Quiz, { kind: 'notes' }>, entries: readonly Entry[]): GradedNote[] {
  return quiz.expected.map((expected, i) => {
    const entry = entries[i];
    if (!entry) return { mark: 'wrong', shown: '' };
    const right = entryPitchClass(entry) === pitchClass(expected);
    if (!('note' in entry)) {
      return { mark: right ? 'correct' : 'wrong', shown: right ? noteName(expected) : SHARP_NAMES[entry.pitchClass]! };
    }
    if (!right) return { mark: 'wrong', shown: noteName(entry.note) };
    if (sameNote(entry.note, expected)) return { mark: 'correct', shown: noteName(expected) };
    return { mark: 'respelled', shown: noteName(entry.note), why: spellingNote(expected, quiz.spelling[i]!) };
  });
}

export function allCorrect(graded: readonly GradedNote[]): boolean {
  return graded.length > 0 && graded.every((g) => g.mark !== 'wrong');
}

/* ---------- Multiple choice ---------- */

/**
 * The options to show: the right answer and distractors from close by in the
 * pool (4♭ is offered beside 3♭ and 5♭, not 6♯), in a shuffled order.
 */
export function choiceOptions(
  quiz: Extract<Quiz, { kind: 'choice' }>,
  random: () => number = Math.random,
  count = 4,
): string[] {
  const pool = [...new Set(quiz.pool)];
  const at = pool.indexOf(quiz.correct);
  const others = pool
    .map((text, i) => ({ text, distance: Math.abs(i - at) + random() * 0.9 }))
    .filter((o) => o.text !== quiz.correct)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count - 1)
    .map((o) => o.text);
  const options = [quiz.correct, ...others];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return options;
}
