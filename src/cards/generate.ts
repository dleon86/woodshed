/**
 * Card generation (F-4, F-5). Every card is built from the theory engine, so
 * every key is covered and spelling is always the engine's.
 */
import {
  type Direction,
  type Interval,
  type Key,
  type Note,
  type Scale,
  type ScaleType,
  SCALE_INFO,
  SCALE_TYPES,
  enharmonicKey,
  intervalBetween,
  intervalId,
  intervalName,
  isStandardKey,
  key,
  keyName,
  keySignature,
  majorKeyFor,
  minorKeyFor,
  noteId,
  noteName,
  ordinal,
  parallelKey,
  parseInterval,
  parseNote,
  relativeKey,
  romanNumeral,
  scale,
  scaleDegree,
  scaleTypeName,
  semitones,
  signatureCount,
  signatureName,
  transpose,
} from '../theory';
import { type Card, type DeckConfig, FAMILIES, type Family, type LabelledNote, type Show } from './types';

/** PRD 5.3 v1: minor 2nd to perfect octave, tritone as both A4 and d5. */
export const V1_INTERVALS = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] as const;

const ALL_FIFTHS = Array.from({ length: 15 }, (_, i) => i - 7);

/** The key signatures a deck covers, as fifths, flats to sharps. */
export function selectedFifths(config: DeckConfig): number[] {
  switch (config.keys) {
    case 'all':
      return ALL_FIFTHS;
    case 'flats':
      return ALL_FIFTHS.filter((f) => f < 0);
    case 'sharps':
      return ALL_FIFTHS.filter((f) => f > 0);
    case 'custom':
      return ALL_FIFTHS.filter((f) => config.customKeys.includes(f));
  }
}

const NATURAL_ROOTS = 'C D E F G A B'.split(' ').map(parseNote);
const COMMON_ROOTS = 'C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B'.split(' ').map(parseNote);
const ALL_ROOTS = 'C C# Cb D D# Db E E# Eb F F# Fb G G# Gb A A# Ab B B# Bb'.split(' ').map(parseNote);

/** The notes interval cards start from. */
export function intervalRoots(config: DeckConfig): Note[] {
  switch (config.roots) {
    case 'natural':
      return NATURAL_ROOTS;
    case 'common':
      return COMMON_ROOTS;
    case 'all':
      return ALL_ROOTS;
    case 'keys':
      return selectedFifths(config).map((f) => majorKeyFor(f).tonic);
  }
}

/* ---------- Shared text ---------- */

const keyId = (k: Key) => `${noteId(k.tonic)}-${k.mode}`;
const names = (notes: readonly Note[]) => notes.map(noteName).join(' ');
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function scaleNotes(s: Scale): LabelledNote[] {
  return s.degrees.map((d) => ({ note: noteName(d.note), label: String(d.degree) }));
}

/** "7♯ / 5♭ (D♭ major)" style twin line, as on the white paper cards. */
function twinText(k: Key): string | undefined {
  const twin = enharmonicKey(k);
  return twin && `Enharmonic: ${keyName(twin)} (${signatureCount(keySignature(twin))})`;
}

/** Numeral wording only exists for ascending perfect and major intervals below the octave ("E♭ V"). */
function hasNumeral(iv: Interval, direction: Direction): boolean {
  return direction === 'up' && iv.number <= 7 && (iv.quality === 'P' || iv.quality === 'M') && iv.number > 1;
}

/* ---------- What the views draw (F-6) ---------- */

/** A scale, degrees 1–8, with its key signature. */
function scaleShow(s: Scale, focus?: Note): Show {
  return { notes: s.degrees.map((d) => d.note), root: s.tonic, key: s.key, ...(focus ? { focus } : {}) };
}

/** Two notes, lower first. Labels count from the lower note, so a 5th reads as 1 and 5 either way. */
function intervalShow(from: Note, to: Note, direction: Direction): Show {
  const notes = direction === 'up' ? [from, to] : [to, from];
  return { notes, root: notes[0]! };
}

/* ---------- Card builders ---------- */

export function keySignatureCard(k: Key): Card {
  const sig = keySignature(k);
  // Minor keys are spelled as natural minor: the form the signature describes.
  const s = scale(k.tonic, k.mode === 'major' ? 'major' : 'natural-minor');
  const twin = twinText(k);
  return {
    id: `keysig:${keyId(k)}`,
    family: 'key-signature',
    front: keyName(k),
    answer: signatureCount(sig),
    details: [sig.accidentals.length ? names(sig.accidentals) : 'No sharps or flats', ...(twin ? [twin] : [])],
    notes: scaleNotes(s),
    show: scaleShow(s),
  };
}

export function reverseKeySignatureCard(fifths: number): Card {
  const sig = keySignature(majorKeyFor(fifths));
  const name = signatureName(sig);
  return {
    id: `revkeysig:${fifths}`,
    family: 'reverse-key-signature',
    front: name.charAt(0).toUpperCase() + name.slice(1),
    answer: `${keyName(majorKeyFor(fifths))} / ${keyName(minorKeyFor(fifths))}`,
    details: sig.accidentals.length ? [names(sig.accidentals)] : [],
    show: scaleShow(scale(majorKeyFor(fifths).tonic, 'major')),
  };
}

export function relativeParallelCard(k: Key, relation: 'relative' | 'parallel'): Card | undefined {
  const other = relation === 'relative' ? relativeKey(k) : parallelKey(k);
  // G♭ minor and the like have no standard signature: skip rather than teach a theoretical key.
  if (!isStandardKey(other)) return undefined;
  return {
    id: `${relation}:${keyId(k)}`,
    family: 'relative-parallel',
    front: `${relation === 'relative' ? 'Relative' : 'Parallel'} ${other.mode} of ${keyName(k)}`,
    answer: keyName(other),
    details: [
      relation === 'relative'
        ? `Both have ${signatureName(keySignature(k))}`
        : `${signatureCount(keySignature(k))} → ${signatureCount(keySignature(other))}`,
    ],
    show: scaleShow(scale(other.tonic, other.mode === 'major' ? 'major' : 'natural-minor')),
  };
}

export function scaleSpellingCard(tonic: Note, type: ScaleType): Card {
  const s = scale(tonic, type);
  const details = [`${keyName(s.key)}: ${signatureCount(s.signature)}`];
  if (type === 'melodic-minor') details.push(`Descending: ${names(s.descending.map((d) => d.note))}`);
  return {
    id: `scale:${noteId(tonic)}:${type}`,
    family: 'scale-spelling',
    front: `${noteName(tonic)} ${scaleTypeName(type)}`,
    answer: names(s.degrees.slice(0, 7).map((d) => d.note)),
    details,
    notes: s.degrees.map((d) => ({ note: noteName(d.note), label: d.label })),
    show: scaleShow(s),
  };
}

export function scaleDegreeCard(tonic: Note, type: ScaleType, degree: number): Card {
  const s = scale(tonic, type);
  const descending = s.descending.find((d) => d.degree === degree)!;
  const ascending = scaleDegree(s, degree);
  const differs = noteName(descending.note) !== noteName(ascending);
  return {
    id: `degree:${noteId(tonic)}:${type}:${degree}`,
    family: 'scale-degree',
    front: `${ordinal(degree)} of ${noteName(tonic)} ${scaleTypeName(type)}`,
    ...(differs ? { frontNote: 'ascending form' } : {}),
    answer: noteName(ascending),
    details: differs ? [`Descending: ${noteName(descending.note)}`] : [],
    notes: s.degrees.map((d) => ({ note: noteName(d.note), label: String(d.degree) })),
    show: scaleShow(s, ascending),
  };
}

export function intervalCard(root: Note, iv: Interval, direction: Direction, numeral: boolean): Card {
  const target = transpose(root, iv, direction);
  const front = numeral
    ? `${noteName(root)} ${romanNumeral(iv.number)}`
    : `${intervalName(iv)} ${direction === 'up' ? 'above' : 'below'} ${noteName(root)}`;
  return {
    id: `interval:${noteId(root)}:${intervalId(iv)}:${direction}${numeral ? ':numeral' : ''}`,
    family: 'interval',
    front,
    answer: noteName(target),
    details: [numeral ? `${intervalName(iv)} above ${noteName(root)}` : `${noteName(root)} ${direction} to ${noteName(target)}`],
    show: intervalShow(root, target, direction),
  };
}

export function reverseIntervalCard(root: Note, iv: Interval, direction: Direction, numeral: boolean): Card {
  const given = transpose(root, iv, direction);
  const front = numeral
    ? `${noteName(given)} is the ${romanNumeral(iv.number)} of what?`
    : `${noteName(given)} is ${articleFor(iv)} ${lower(intervalName(iv))} ${direction === 'up' ? 'above' : 'below'} what?`;
  return {
    id: `revinterval:${noteId(root)}:${intervalId(iv)}:${direction}${numeral ? ':numeral' : ''}`,
    family: 'reverse-interval',
    front,
    answer: noteName(root),
    details: [`${intervalName(iv)} ${direction === 'up' ? 'above' : 'below'} ${noteName(root)} is ${noteName(given)}`],
    show: intervalShow(root, given, direction),
  };
}

export function intervalNamingCard(root: Note, iv: Interval, direction: Direction): Card {
  const other = transpose(root, iv, direction);
  // Measured from the lower note; a same-letter octave reads as a unison, so name it from the card.
  const measured = direction === 'up' ? intervalBetween(root, other) : intervalBetween(other, root);
  const named = iv.number === 8 ? iv : measured;
  return {
    id: `naming:${noteId(root)}:${intervalId(iv)}:${direction}`,
    family: 'interval-naming',
    front: `${noteName(root)} ${direction} to ${noteName(other)}`,
    answer: intervalName(named),
    details: [semitoneText(iv)],
    show: intervalShow(root, other, direction),
  };
}

function articleFor(iv: Interval): string {
  return /^[AEIOU]/.test(intervalName(iv)) ? 'an' : 'a';
}

function semitoneText(iv: Interval): string {
  const n = semitones(iv);
  return `${n} semitone${n === 1 ? '' : 's'}`;
}

/* ---------- Decks ---------- */

function keysFor(fifths: readonly number[], scaleTypes: readonly ScaleType[]): Key[] {
  const modes = new Set(scaleTypes.map((t) => SCALE_INFO[t].mode));
  return [
    ...(modes.has('major') ? fifths.map(majorKeyFor) : []),
    ...(modes.has('minor') ? fifths.map(minorKeyFor) : []),
  ];
}

const has = (config: DeckConfig, f: Family) => config.families.includes(f);

/** Build every card the filters select, in a stable order (shuffle per session). */
export function buildDeck(config: DeckConfig): Card[] {
  const fifths = selectedFifths(config);
  const scaleTypes = SCALE_TYPES.filter((t) => config.scaleTypes.includes(t));
  const keys = keysFor(fifths, scaleTypes);
  const cards: Card[] = [];

  if (has(config, 'key-signature')) cards.push(...keys.map(keySignatureCard));
  if (has(config, 'reverse-key-signature')) cards.push(...fifths.map(reverseKeySignatureCard));
  if (has(config, 'relative-parallel')) {
    for (const k of keys) {
      for (const relation of ['relative', 'parallel'] as const) {
        const card = relativeParallelCard(k, relation);
        if (card) cards.push(card);
      }
    }
  }

  for (const type of scaleTypes) {
    const tonics = fifths.map((f) => (SCALE_INFO[type].mode === 'major' ? majorKeyFor(f) : minorKeyFor(f)).tonic);
    for (const tonic of tonics) {
      if (has(config, 'scale-spelling')) cards.push(scaleSpellingCard(tonic, type));
      if (has(config, 'scale-degree')) for (let d = 2; d <= 7; d++) cards.push(scaleDegreeCard(tonic, type, d));
    }
  }

  const roots = intervalRoots(config);
  const intervals = V1_INTERVALS.filter((id) => config.intervals.includes(id)).map(parseInterval);
  for (const root of roots) {
    for (const iv of intervals) {
      for (const direction of config.directions) {
        const wordings: boolean[] =
          config.wording === 'names' || !hasNumeral(iv, direction)
            ? [false]
            : config.wording === 'numerals'
              ? [true]
              : [false, true];
        for (const numeral of wordings) {
          if (has(config, 'interval')) cards.push(intervalCard(root, iv, direction, numeral));
          if (has(config, 'reverse-interval')) cards.push(reverseIntervalCard(root, iv, direction, numeral));
        }
        if (has(config, 'interval-naming')) cards.push(intervalNamingCard(root, iv, direction));
      }
    }
  }
  return cards;
}

/**
 * The original paper deck (PRD appendix): nine white key signature cards and
 * five green "note + V" cards. The M2 acceptance check.
 */
export function paperDeck(): Card[] {
  const white = ['Bb', 'C#', 'F#', 'Ab', 'Gb', 'Cb', 'Eb', 'B', 'Db'].map((t) => keySignatureCard(key(parseNote(t), 'major')));
  const fifth = parseInterval('P5');
  const green = ['Eb', 'A', 'G', 'E', 'C'].map((t) => intervalCard(parseNote(t), fifth, 'up', true));
  return [...white, ...green];
}

/** Every card the app can build, by id: used to restore a saved session from ids alone. */
export function cardIndex(): Map<string, Card> {
  const everything = buildDeck({
    families: FAMILIES,
    keys: 'all',
    customKeys: [],
    scaleTypes: SCALE_TYPES,
    intervals: V1_INTERVALS,
    directions: ['up', 'down'],
    roots: 'all',
    wording: 'both',
  });
  // "keys" roots are a subset of "all", so this covers every deck the builder can make.
  return new Map([...everything, ...paperDeck()].map((c) => [c.id, c]));
}

export const DEFAULT_DECK: DeckConfig = {
  families: ['key-signature'],
  keys: 'all',
  customKeys: [],
  scaleTypes: ['major'],
  intervals: [...V1_INTERVALS],
  directions: ['up'],
  roots: 'common',
  wording: 'names',
};
