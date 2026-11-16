import { THEME_PREFS, themePref } from '../../state/theme';

const THEME_LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' } as const;

/** Settings (PRD 6.8). Only the theme works in M0. */
export function Settings() {
  return (
    <section class="page">
      <h1>Settings</h1>
      <div class="setting">
        <div>
          <h2 id="theme-label">Theme</h2>
          <p class="muted">Auto follows your device.</p>
        </div>
        <div class="segmented" role="radiogroup" aria-labelledby="theme-label">
          {THEME_PREFS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={themePref.value === id}
              onClick={() => (themePref.value = id)}
            >
              {THEME_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      <p class="muted small">Woodshed is open source under the MIT license.</p>
    </section>
  );
}
