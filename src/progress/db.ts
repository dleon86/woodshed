/**
 * Progress storage in IndexedDB (PRD section 8, G-1): an answer log and one
 * record per card. Everything here fails soft: if the browser has no
 * IndexedDB or blocks it (private mode), practice still works and simply is
 * not recorded.
 */
import { type AnswerRecord, type CardState, type ProgressSummary, updateCardState } from './record';

const NAME = 'woodshed';
const VERSION = 1;
const ANSWERS = 'answers';
const CARDS = 'cards';

let opening: Promise<IDBDatabase | undefined> | undefined;

function open(): Promise<IDBDatabase | undefined> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined);
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(NAME, VERSION);
    } catch {
      return resolve(undefined);
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ANSWERS)) {
        const answers = db.createObjectStore(ANSWERS, { autoIncrement: true });
        answers.createIndex('cardId', 'cardId');
        answers.createIndex('at', 'at');
      }
      if (!db.objectStoreNames.contains(CARDS)) db.createObjectStore(CARDS, { keyPath: 'cardId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
  return opening;
}

/**
 * Store an answer and update its card's record, in one transaction, so the
 * log and the per-card totals can never disagree. Resolves false if nothing
 * was stored.
 */
export async function recordAnswer(answer: AnswerRecord): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([ANSWERS, CARDS], 'readwrite');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      tx.objectStore(ANSWERS).add(answer);
      const cards = tx.objectStore(CARDS);
      // Read and write inside the same transaction: awaiting between them would let it close.
      const get = cards.get(answer.cardId);
      get.onsuccess = () => cards.put(updateCardState(get.result as CardState | undefined, answer));
    } catch {
      resolve(false);
    }
  });
}

/** Totals for the Progress screen. Zeros if storage is unavailable. */
export async function progressSummary(now: number = Date.now()): Promise<ProgressSummary> {
  const empty: ProgressSummary = { answers: 0, correct: 0, cardsSeen: 0, today: 0 };
  const db = await open();
  if (!db) return empty;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([ANSWERS, CARDS], 'readonly');
      const midnight = new Date(now).setHours(0, 0, 0, 0);
      const answers = tx.objectStore(ANSWERS).count();
      const today = tx.objectStore(ANSWERS).index('at').count(IDBKeyRange.lowerBound(midnight));
      const cards = tx.objectStore(CARDS).getAll();
      tx.oncomplete = () => {
        const states = cards.result as CardState[];
        resolve({
          answers: answers.result,
          correct: states.reduce((sum, c) => sum + c.correct, 0),
          cardsSeen: states.length,
          today: today.result,
        });
      };
      tx.onerror = () => resolve(empty);
      tx.onabort = () => resolve(empty);
    } catch {
      resolve(empty);
    }
  });
}
