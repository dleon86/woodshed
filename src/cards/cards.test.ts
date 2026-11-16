import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK, V1_INTERVALS, buildDeck, cardIndex, paperDeck, selectedFifths } from './generate';
import { answer, isDone, restoreSession, retryIndex, startSession, storeSession, summarize } from './session';
import { type Card, type DeckConfig, FAMILIES } from './types';

const EVERYTHING: DeckConfig = {
  families: [...FAMILIES],
  keys: 'all',
  customKeys: [],
  scaleTypes: ['major', 'natural-minor', 'harmonic-minor', 'melodic-minor'],
  intervals: [...V1_INTERVALS],
  directions: ['up', 'down'],
  roots: 'all',
  wording: 'both',
};

const deck = (overrides: Partial<DeckConfig>) => buildDeck({ ...DEFAULT_DECK, ...overrides });
const text = (c: Card) => [c.front, c.frontNote ?? '', c.answer, ...c.details, ...(c.notes ?? []).map((n) => n.note)];

describe('the paper deck (PRD appendix, M2 acceptance)', () => {
  const cards = paperDeck();

  it('has the nine white cards with counts, scale, degrees and enharmonic twins', () => {
    const white = cards.slice(0, 9).map((c) => [c.front, c.answer, c.details.at(-1)]);
    expect(white).toEqual([
      ['B♭ major', '2♭', 'B♭ E♭'],
      ['C♯ major', '7♯', 'Enharmonic: D♭ major (5♭)'],
      ['F♯ major', '6♯', 'Enharmonic: G♭ major (6♭)'],
      ['A♭ major', '4♭', 'B♭ E♭ A♭ D♭'],
      ['G♭ major', '6♭', 'Enharmonic: F♯ major (6♯)'],
      ['C♭ major', '7♭', 'Enharmonic: B major (5♯)'],
      ['E♭ major', '3♭', 'B♭ E♭ A♭'],
      ['B major', '5♯', 'Enharmonic: C♭ major (7♭)'],
      ['D♭ major', '5♭', 'Enharmonic: C♯ major (7♯)'],
    ]);
    const cSharp = cards[1]!;
    expect(cSharp.notes?.map((n) => n.note).join(' ')).toBe('C♯ D♯ E♯ F♯ G♯ A♯ B♯ C♯');
    expect(cSharp.notes?.map((n) => n.label).join(' ')).toBe('1 2 3 4 5 6 7 8');
  });

  it('has the five green "note + V" cards', () => {
    expect(cards.slice(9).map((c) => `${c.front} → ${c.answer}`)).toEqual([
      'E♭ V → B♭',
      'A V → E',
      'G V → D',
      'E V → B',
      'C V → G',
    ]);
  });
});

describe('deck building (F-4)', () => {
  it('filters keys by signature', () => {
    expect(selectedFifths({ ...DEFAULT_DECK, keys: 'flats' })).toEqual([-7, -6, -5, -4, -3, -2, -1]);
    expect(selectedFifths({ ...DEFAULT_DECK, keys: 'sharps' })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(selectedFifths({ ...DEFAULT_DECK, keys: 'custom', customKeys: [3, -4] })).toEqual([-4, 3]);
  });

  it('builds the expected number of cards per family', () => {
    expect(deck({ families: ['key-signature'] })).toHaveLength(15);
    expect(deck({ families: ['key-signature'], scaleTypes: ['major', 'harmonic-minor'] })).toHaveLength(30);
    expect(deck({ families: ['reverse-key-signature'] })).toHaveLength(15);
    expect(deck({ families: ['scale-spelling'], scaleTypes: ['major', 'natural-minor'] })).toHaveLength(30);
    expect(deck({ families: ['scale-degree'] })).toHaveLength(15 * 6);
    expect(deck({ families: ['interval'] })).toHaveLength(17 * 13);
    expect(deck({ families: ['interval'], directions: ['up', 'down'] })).toHaveLength(17 * 13 * 2);
    // Numerals exist for M2 M3 P4 P5 M6 M7 ascending: six extra cards per root with "both".
    expect(deck({ families: ['interval'], wording: 'both' })).toHaveLength(17 * (13 + 6));
  });

  it('starts interval cards from every root (PRD 5.3), not only key names', () => {
    const fronts = (roots: DeckConfig['roots'], extra: Partial<DeckConfig> = {}) =>
      deck({ families: ['interval'], intervals: ['M3'], roots, ...extra }).map((c) => `${c.front} → ${c.answer}`);
    expect(fronts('natural')).toHaveLength(7);
    expect(fronts('common')).toHaveLength(17);
    expect(fronts('all')).toHaveLength(21);
    // G♯, D♯ and A♯ are not major key names but are everyday roots (the 3rd of an E chord).
    expect(fronts('common')).toContain('Major 3rd above G♯ → B♯');
    expect(fronts('common')).toContain('Major 3rd above D♯ → F𝄪');
    expect(fronts('common')).not.toContain('Major 3rd above B♯ → D𝄪');
    expect(fronts('all')).toContain('Major 3rd above B♯ → D𝄪');
    // "From keys" follows the key filter, as before.
    expect(fronts('keys', { keys: 'flats' })).toHaveLength(7);
    expect(fronts('keys', { keys: 'flats' })).toContain('Major 3rd above A♭ → C');
  });

  it('only builds parallel keys that have a standard signature', () => {
    const fronts = deck({ families: ['relative-parallel'], scaleTypes: ['major'] }).map((c) => c.front);
    expect(fronts).toContain('Relative minor of A♭ major');
    expect(fronts).toContain('Parallel minor of A♭ major');
    expect(fronts).not.toContain('Parallel minor of G♭ major'); // G♭ minor would need 9 flats
  });

  it('gives every card a unique, stable id', () => {
    const all = buildDeck(EVERYTHING);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    expect(deck({ families: ['interval'] })[0]!.id).toBe('interval:C:m2:up');
  });

  it('writes every card with real accidental symbols, never # or b', () => {
    for (const card of buildDeck(EVERYTHING)) {
      for (const line of text(card)) expect(line, card.id).not.toMatch(/[A-G][#b](?![a-z])/);
    }
  });
});

describe('card wording', () => {
  const find = (cards: Card[], front: string) => cards.find((c) => c.front === front);

  it('matches the F-5 table', () => {
    const all = buildDeck(EVERYTHING);
    expect(find(all, 'A♭ major')?.answer).toBe('4♭');
    expect(find(all, '4 flats')?.answer).toBe('A♭ major / F minor');
    expect(find(all, 'No sharps or flats')?.answer).toBe('C major / A minor');
    expect(find(all, 'E♭ harmonic minor')?.answer).toBe('E♭ F G♭ A♭ B♭ C♭ D');
    expect(find(all, '6th of A♭ major')?.answer).toBe('F');
    expect(find(all, 'Perfect 5th above E♭')?.answer).toBe('B♭');
    expect(find(all, 'E♭ V')?.answer).toBe('B♭');
    expect(find(all, 'B♭ is the V of what?')?.answer).toBe('E♭');
    expect(find(all, 'B♭ is a perfect 5th above what?')?.answer).toBe('E♭');
    expect(find(all, 'E♭ up to B♭')?.answer).toBe('Perfect 5th');
    expect(find(all, 'Relative minor of A♭ major')?.answer).toBe('F minor');
  });

  it('tells the tritone spellings apart', () => {
    const all = buildDeck(EVERYTHING);
    expect(find(all, 'C up to F♯')?.answer).toBe('Augmented 4th');
    expect(find(all, 'C up to G♭')?.answer).toBe('Diminished 5th');
    expect(find(all, 'C up to C')?.answer).toBe('Perfect octave');
  });

  it('marks melodic minor degrees that change on the way down', () => {
    const card = find(buildDeck(EVERYTHING), '6th of D melodic minor');
    expect(card?.answer).toBe('B');
    expect(card?.frontNote).toBe('ascending form');
    expect(card?.details).toEqual(['Descending: B♭']);
  });
});

describe('sessions (F-1 to F-3)', () => {
  const cards = deck({ families: ['key-signature'], keys: 'custom', customKeys: [0, 1, 2, 3, 4, 5, 6] });
  const ids = (s: { queue: readonly Card[] }) => s.queue.map((c) => c.id);
  const fixedOrder = () => 0.99; // shuffle leaves the order unchanged

  it('limits the session length', () => {
    expect(startSession(cards, { limit: 3 }).queue).toHaveLength(3);
    expect(startSession(cards).total).toBe(7);
  });

  it('brings a missed card back a few cards later', () => {
    let s = startSession(cards, { random: fixedOrder });
    const first = s.queue[0]!.id;
    s = answer(s, false);
    expect(ids(s).indexOf(first)).toBe(retryIndex(6));
    expect(ids(s)).toHaveLength(7);
  });

  it('puts a missed card last when few remain, and repeats a lone card', () => {
    let s = startSession(cards.slice(0, 2), { random: fixedOrder });
    s = answer(s, false);
    expect(ids(s)).toEqual([cards[1]!.id, cards[0]!.id]);
    s = answer(s, true);
    s = answer(s, false);
    expect(ids(s)).toEqual([cards[0]!.id]);
    s = answer(s, true);
    expect(isDone(s)).toBe(true);
  });

  it('summarizes first-try score and missed cards', () => {
    let s = startSession(cards.slice(0, 3), { random: fixedOrder, now: 0 });
    s = answer(s, false); // card 0 missed, returns last
    s = answer(s, true);
    s = answer(s, true);
    s = answer(s, true); // card 0 again
    const sum = summarize(s, 65_000);
    expect(sum.total).toBe(3);
    expect(sum.firstTry).toBe(2);
    expect(sum.missed.map((c) => c.id)).toEqual([cards[0]!.id]);
    expect(sum.durationMs).toBe(65_000);
  });

  it('survives a round trip through storage as ids', () => {
    const index = cardIndex();
    let s = startSession(paperDeck(), { random: fixedOrder, now: 1000 });
    s = answer(s, false);
    s = answer(s, true);
    const restored = restoreSession(JSON.parse(JSON.stringify(storeSession(s))), (id) => index.get(id));
    expect(restored).toEqual(s);
  });

  it('drops unknown ids and rejects malformed data when restoring', () => {
    const index = cardIndex();
    const lookup = (id: string) => index.get(id);
    const stored = { queue: ['keysig:C-major', 'gone:card'], log: [{ id: 'gone:card', got: true }], total: 2, startedAt: 5 };
    expect(restoreSession(stored, lookup)?.queue.map((c) => c.id)).toEqual(['keysig:C-major']);
    expect(restoreSession(stored, lookup)?.log).toEqual([]);
    for (const bad of [null, 'x', {}, { queue: [], log: [], total: 0, startedAt: 0 }, { queue: 'a', log: [], total: 1, startedAt: 1 }]) {
      expect(restoreSession(bad, lookup)).toBeUndefined();
    }
  });

  it('can look up every card any deck can contain', () => {
    const index = cardIndex();
    const fromKeys = deck({ families: [...FAMILIES], keys: 'flats', roots: 'keys', wording: 'both', directions: ['up', 'down'] });
    for (const card of [...fromKeys, ...paperDeck()]) expect(index.has(card.id), card.id).toBe(true);
  });
});
