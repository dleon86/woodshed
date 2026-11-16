import { computed, effect, signal } from '@preact/signals';
import { load, save } from './storage';

export const THEME_PREFS = ['auto', 'light', 'dark'] as const;
export type ThemePref = (typeof THEME_PREFS)[number];

/** 'auto' follows the device setting; 'light' / 'dark' override it. */
export const themePref = signal<ThemePref>(load('theme', THEME_PREFS, 'auto'));

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const deviceDark = signal(darkQuery.matches);
darkQuery.addEventListener('change', (e) => (deviceDark.value = e.matches));

export const resolvedTheme = computed<'light' | 'dark'>(() =>
  themePref.value === 'auto' ? (deviceDark.value ? 'dark' : 'light') : themePref.value,
);

const THEME_COLOR = { light: '#6b4226', dark: '#1c1714' } as const;

effect(() => {
  const pref = themePref.value;
  const root = document.documentElement;
  // index.html applies the same attribute before first paint.
  if (pref === 'auto') delete root.dataset.theme;
  else root.dataset.theme = pref;
  save('theme', pref === 'auto' ? null : pref);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolvedTheme.value]);
});
