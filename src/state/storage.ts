/**
 * Small, safe wrapper around localStorage for UI preferences that must be
 * read synchronously at startup (theme, last instrument, last view).
 * Progress data goes to IndexedDB in a later milestone (PRD section 8).
 */
const PREFIX = 'woodshed.';

export function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback; // private mode or storage blocked
  }
}

export function save(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}
