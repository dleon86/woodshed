/**
 * Small, safe wrapper around localStorage for UI preferences that must be
 * read synchronously at startup (theme, last instrument).
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

/** Load a JSON preference. `parse` returns undefined for anything unexpected, which falls back. */
export function loadJson<T>(key: string, parse: (value: unknown) => T | undefined, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return (raw === null ? undefined : parse(JSON.parse(raw))) ?? fallback;
  } catch {
    return fallback; // blocked storage or malformed JSON
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
