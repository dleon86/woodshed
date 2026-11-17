import { computed, effect, signal } from '@preact/signals';
import {
  type Card,
  DEFAULT_DECK,
  type DeckConfig,
  type Entry,
  FAMILIES,
  type GradedNote,
  ROOT_SETS,
  type Session,
  V1_INTERVALS,
  allCorrect,
  answer,
  buildDeck,
  cardIndex,
  choiceOptions,
  gradeNotes,
  isDone,
  restoreSession,
  startSession,
  storeSession,
} from '../cards';
import { recordAnswer } from '../progress/db';
import type { InputMethod } from '../progress/record';
import { SCALE_TYPES } from '../theory';
import { autoPlayAnswer, playShow } from './sound';
import { load, loadJson, save } from './storage';

/* ---------- Deck builder (F-4) ---------- */

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined =>
  Array.isArray(value) ? value.filter((v): v is T => (allowed as readonly unknown[]).includes(v)) : undefined;

/** Accept a stored config only field by field, so an old or edited value can't break the builder. */
function parseDeck(value: unknown): DeckConfig | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const keys = (['all', 'flats', 'sharps', 'custom'] as const).find((k) => k === v.keys);
  const wording = (['names', 'numerals', 'both'] as const).find((w) => w === v.wording);
  const roots = ROOT_SETS.find((r) => r === v.roots);
  return {
    families: pick(v.families, FAMILIES) ?? DEFAULT_DECK.families,
    keys: keys ?? DEFAULT_DECK.keys,
    customKeys: Array.isArray(v.customKeys)
      ? v.customKeys.filter((n): n is number => Number.isInteger(n) && Math.abs(n as number) <= 7)
      : [],
    scaleTypes: pick(v.scaleTypes, SCALE_TYPES) ?? DEFAULT_DECK.scaleTypes,
    intervals: pick(v.intervals, V1_INTERVALS) ?? DEFAULT_DECK.intervals,
    directions: pick(v.directions, ['up', 'down'] as const) ?? DEFAULT_DECK.directions,
    roots: roots ?? DEFAULT_DECK.roots,
    wording: wording ?? DEFAULT_DECK.wording,
  };
}

export const deckConfig = signal<DeckConfig>(loadJson('deck', parseDeck, DEFAULT_DECK));
effect(() => save('deck', JSON.stringify(deckConfig.value)));

export function updateDeck(change: Partial<DeckConfig>): void {
  deckConfig.value = { ...deckConfig.value, ...change };
}

export const deckCards = computed(() => buildDeck(deckConfig.value));

export const SESSION_LENGTHS = [10, 20, 50, 0] as const; // 0 = every card
export type SessionLength = (typeof SESSION_LENGTHS)[number];
export const sessionLength = signal<SessionLength>(20);

/* ---------- Drill ---------- */

/**
 * The session and its deck are saved as card ids so a reload, an app update
 * or the browser closing a background tab does not lose a drill in progress.
 */
let index: Map<string, Card> | undefined;
const lookup = (id: string) => (index ??= cardIndex()).get(id);

interface ChosenDeck {
  readonly cards: readonly Card[];
  /** Session length it was started with; 0 = every card. */
  readonly limit: number;
}

const NO_DECK: ChosenDeck = { cards: [], limit: 0 };

function parseChosen(value: unknown): ChosenDeck | undefined {
  const v = value as { ids?: unknown; limit?: unknown } | null;
  if (!v || !Array.isArray(v.ids) || typeof v.limit !== 'number') return undefined;
  return { cards: v.ids.flatMap((id) => (typeof id === 'string' ? (lookup(id) ?? []) : [])), limit: v.limit };
}

/** The running session, or null on the deck builder. */
export const session = signal<Session | null>(loadJson('session', (v) => restoreSession(v, lookup) ?? undefined, null));
/** Whether the current card shows its back (F-1). */
export const flipped = signal(false);
/** The deck "Same deck again" restarts: the one chosen in the builder, not a missed-cards round. */
let chosen: ChosenDeck = session.value ? loadJson('sessionDeck', parseChosen, NO_DECK) : NO_DECK;

effect(() => save('session', session.value ? JSON.stringify(storeSession(session.value)) : null));

/* ---------- Modes: flash cards (self-graded) or quiz (answer entered), PRD 6.1 and 6.2 ---------- */

export const MODES = ['flash', 'quiz'] as const;
export type Mode = (typeof MODES)[number];
export const mode = signal<Mode>(load('mode', MODES, 'flash'));
effect(() => save('mode', mode.value));

/** What happened when the current quiz card was answered; null until then. */
export interface Outcome {
  readonly correct: boolean;
  /** Note cards: each entered note, marked (Q-4). */
  readonly graded?: readonly GradedNote[];
  /** Naming cards: the option picked. */
  readonly picked?: string;
}

/** Notes entered so far for the current quiz card (Q-1). */
export const entries = signal<readonly Entry[]>([]);
export const outcome = signal<Outcome | null>(null);
/** The options offered for the current naming card (Q-2), fixed while it is on screen. */
export const options = signal<readonly string[]>([]);
/** Bumped after each stored answer so the Progress screen can refresh. */
export const answersRecorded = signal(0);

let shownAt = Date.now();

const currentCard = (): Card | undefined => (session.value && !isDone(session.value) ? session.value.queue[0] : undefined);

/** Reset everything that belongs to one card being on screen. */
function showCard(): void {
  const card = currentCard();
  flipped.value = false;
  entries.value = [];
  outcome.value = null;
  options.value = card?.quiz.kind === 'choice' ? choiceOptions(card.quiz) : [];
  shownAt = Date.now();
}
showCard(); // a session restored from storage starts on its current card

/** G-1: every answer is recorded with its time and input method. */
function record(card: Card, correct: boolean, input: InputMethod): void {
  const now = Date.now();
  void recordAnswer({ cardId: card.id, at: now, correct, ms: now - shownAt, input }).then((stored) => {
    if (stored) answersRecorded.value++;
  });
}

function advance(got: boolean): void {
  if (!session.value || isDone(session.value)) return;
  session.value = answer(session.value, got);
  showCard();
}

function begin(cards: readonly Card[], limit: number): void {
  session.value = startSession(cards, limit > 0 ? { limit } : {});
  showCard();
}

/** Start a session from a deck chosen in the builder (or a preset). */
export function start(cards: readonly Card[], limit: number = sessionLength.value): void {
  if (cards.length === 0) return;
  chosen = { cards, limit };
  save('sessionDeck', JSON.stringify({ ids: cards.map((c) => c.id), limit }));
  begin(cards, limit);
}

/** Drill only the cards just missed. "Same deck again" afterwards still means the chosen deck. */
export function startMissed(cards: readonly Card[]): void {
  if (cards.length > 0) begin(cards, 0);
}

export function restart(): void {
  if (chosen.cards.length > 0) begin(chosen.cards, chosen.limit);
  else endSession();
}

/** Flash cards: the player says whether they got it (F-2). */
export function grade(got: boolean): void {
  const card = currentCard();
  if (!card) return;
  record(card, got, 'self');
  advance(got);
}

/* ---------- Quiz answers (PRD 6.2) ---------- */

/** The answer is in: show the feedback, the right answer on the view, and play it (Q-4). */
function settle(card: Card, result: Outcome, input: InputMethod): void {
  outcome.value = result;
  flipped.value = true;
  record(card, result.correct, input);
  if (autoPlayAnswer.value) playShow(card.show);
}

/** Add an entered note. A one-note card is checked at once; a scale waits for Check. */
export function addEntry(entry: Entry): void {
  const card = currentCard();
  if (!card || card.quiz.kind !== 'notes' || outcome.value) return;
  if (entries.value.length >= card.quiz.expected.length) return;
  entries.value = [...entries.value, entry];
  if (card.quiz.expected.length === 1) checkEntries();
}

export function removeEntry(): void {
  if (!outcome.value) entries.value = entries.value.slice(0, -1);
}

export function checkEntries(): void {
  const card = currentCard();
  if (!card || card.quiz.kind !== 'notes' || outcome.value || entries.value.length === 0) return;
  const graded = gradeNotes(card.quiz, entries.value);
  settle(card, { correct: allCorrect(graded), graded }, 'tap');
}

export function choose(option: string): void {
  const card = currentCard();
  if (!card || card.quiz.kind !== 'choice' || outcome.value) return;
  settle(card, { correct: option === card.quiz.correct, picked: option }, 'choice');
}

/** Move on after reading the feedback. A missed card comes back later, as with flash cards (F-3). */
export function next(): void {
  if (outcome.value) advance(outcome.value.correct);
}

/** A key or fret was tapped during a quiz: it counts as an answer while one is expected (Q-1). */
export function enterPitch(midiNumber: number): void {
  if (mode.value === 'quiz') addEntry({ pitchClass: ((midiNumber % 12) + 12) % 12 });
}

export function endSession(): void {
  session.value = null;
  chosen = NO_DECK;
  save('sessionDeck', null);
  showCard();
}

/** True while cards are still to be answered: not the time to reload for an update. */
export const drilling = computed(() => session.value !== null && !isDone(session.value));
