import { computed, effect, signal } from '@preact/signals';
import {
  type Card,
  DEFAULT_DECK,
  type DeckConfig,
  FAMILIES,
  ROOT_SETS,
  type Session,
  V1_INTERVALS,
  answer,
  buildDeck,
  cardIndex,
  isDone,
  restoreSession,
  startSession,
  storeSession,
} from '../cards';
import { SCALE_TYPES } from '../theory';
import { loadJson, save } from './storage';

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

function begin(cards: readonly Card[], limit: number): void {
  session.value = startSession(cards, limit > 0 ? { limit } : {});
  flipped.value = false;
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

export function grade(got: boolean): void {
  if (!session.value || isDone(session.value)) return;
  session.value = answer(session.value, got);
  flipped.value = false;
}

export function endSession(): void {
  session.value = null;
  chosen = NO_DECK;
  save('sessionDeck', null);
}

/** True while cards are still to be answered: not the time to reload for an update. */
export const drilling = computed(() => session.value !== null && !isDone(session.value));
