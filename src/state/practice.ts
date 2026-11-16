import { computed, effect, signal } from '@preact/signals';
import {
  type Card,
  DEFAULT_DECK,
  type DeckConfig,
  FAMILIES,
  type Session,
  V1_INTERVALS,
  answer,
  buildDeck,
  isDone,
  startSession,
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
  return {
    families: pick(v.families, FAMILIES) ?? DEFAULT_DECK.families,
    keys: keys ?? DEFAULT_DECK.keys,
    customKeys: Array.isArray(v.customKeys)
      ? v.customKeys.filter((n): n is number => Number.isInteger(n) && Math.abs(n as number) <= 7)
      : [],
    scaleTypes: pick(v.scaleTypes, SCALE_TYPES) ?? DEFAULT_DECK.scaleTypes,
    intervals: pick(v.intervals, V1_INTERVALS) ?? DEFAULT_DECK.intervals,
    directions: pick(v.directions, ['up', 'down'] as const) ?? DEFAULT_DECK.directions,
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

/** The running session, or null on the deck builder. */
export const session = signal<Session | null>(null);
/** Whether the current card shows its back (F-1). */
export const flipped = signal(false);
/** The deck the current session was started from, for "go again". */
let lastDeck: readonly Card[] = [];

export function start(cards: readonly Card[], limit: number = sessionLength.value): void {
  if (cards.length === 0) return;
  lastDeck = cards;
  session.value = startSession(cards, limit > 0 ? { limit } : {});
  flipped.value = false;
}

export function restart(): void {
  start(lastDeck);
}

export function grade(got: boolean): void {
  if (!session.value || isDone(session.value)) return;
  session.value = answer(session.value, got);
  flipped.value = false;
}

export function endSession(): void {
  session.value = null;
}
