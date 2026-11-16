import { describe, expect, it } from 'vitest';
import {
  type Key,
  MAJOR_KEYS,
  MINOR_KEYS,
  enharmonicKey,
  isStandardKey,
  key,
  keyName,
  keySignature,
  parallelKey,
  relativeKey,
  sameKey,
  signatureCount,
  signatureName,
} from './key';
import { noteName, parseNote } from './note';

const major = (t: string): Key => key(parseNote(t), 'major');
const minor = (t: string): Key => key(parseNote(t), 'minor');
const accidentals = (k: Key) => keySignature(k).accidentals.map(noteName).join(' ');

describe('the 15 key signatures', () => {
  it('list the major keys flats to sharps', () => {
    expect(MAJOR_KEYS.map(keyName)).toEqual(
      'C♭ G♭ D♭ A♭ E♭ B♭ F C G D A E B F♯ C♯'.split(' ').map((t) => `${t} major`),
    );
  });

  it('list the minor keys flats to sharps', () => {
    expect(MINOR_KEYS.map(keyName)).toEqual(
      'A♭ E♭ B♭ F C G D A E B F♯ C♯ G♯ D♯ A♯'.split(' ').map((t) => `${t} minor`),
    );
  });

  it('name the right accidentals in order, for every key', () => {
    const sharps = ['', 'F♯', 'F♯ C♯', 'F♯ C♯ G♯', 'F♯ C♯ G♯ D♯', 'F♯ C♯ G♯ D♯ A♯', 'F♯ C♯ G♯ D♯ A♯ E♯', 'F♯ C♯ G♯ D♯ A♯ E♯ B♯'];
    const flats = ['', 'B♭', 'B♭ E♭', 'B♭ E♭ A♭', 'B♭ E♭ A♭ D♭', 'B♭ E♭ A♭ D♭ G♭', 'B♭ E♭ A♭ D♭ G♭ C♭', 'B♭ E♭ A♭ D♭ G♭ C♭ F♭'];
    const expected = [...flats.slice(1).reverse(), ...sharps];
    expect(MAJOR_KEYS.map(accidentals)).toEqual(expected);
    expect(MINOR_KEYS.map(accidentals)).toEqual(expected);
  });

  it('write counts as on the paper cards', () => {
    expect(signatureCount(keySignature(major('Ab')))).toBe('4♭');
    expect(signatureCount(keySignature(major('C#')))).toBe('7♯');
    expect(signatureCount(keySignature(major('C')))).toBe('0');
    expect(signatureName(keySignature(major('Ab')))).toBe('4 flats');
    expect(signatureName(keySignature(major('G')))).toBe('1 sharp');
  });

  it('refuse theoretical keys', () => {
    expect(isStandardKey(major('G#'))).toBe(false);
    expect(isStandardKey(minor('Db'))).toBe(false);
    expect(() => keySignature(major('G#'))).toThrow();
  });
});

describe('related keys', () => {
  it('relative major / minor share a signature, for every key', () => {
    for (const k of [...MAJOR_KEYS, ...MINOR_KEYS]) {
      const rel = relativeKey(k);
      expect(keySignature(rel)).toEqual(keySignature(k));
      expect(sameKey(relativeKey(rel), k)).toBe(true);
    }
    expect(keyName(relativeKey(major('Ab')))).toBe('F minor');
    expect(keyName(relativeKey(minor('D#')))).toBe('F♯ major');
  });

  it('parallel keys share a tonic', () => {
    expect(keyName(parallelKey(major('Eb')))).toBe('E♭ minor');
    expect(keyName(parallelKey(minor('C#')))).toBe('C♯ major');
  });

  it('link exactly the enharmonic pairs in PRD 5.1', () => {
    const pairs = (keys: readonly Key[]) =>
      keys.flatMap((k) => {
        const twin = enharmonicKey(k);
        return twin ? [`${keyName(k)} = ${keyName(twin)}`] : [];
      });
    expect(pairs(MAJOR_KEYS)).toEqual([
      'C♭ major = B major',
      'G♭ major = F♯ major',
      'D♭ major = C♯ major',
      'B major = C♭ major',
      'F♯ major = G♭ major',
      'C♯ major = D♭ major',
    ]);
    expect(pairs(MINOR_KEYS)).toEqual([
      'A♭ minor = G♯ minor',
      'E♭ minor = D♯ minor',
      'B♭ minor = A♯ minor',
      'G♯ minor = A♭ minor',
      'D♯ minor = E♭ minor',
      'A♯ minor = B♭ minor',
    ]);
  });
});
