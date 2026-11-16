import { type Page, expect, test } from '@playwright/test';

/** Fail on any uncaught error or console error during the test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Nothing may spill past the right edge: wide views must scroll inside their own box. */
async function expectNoOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('.main')!;
    return {
      page: document.documentElement.scrollWidth - window.innerWidth,
      main: main.scrollWidth - main.clientWidth,
    };
  });
  expect(overflow, 'horizontal overflow in px').toEqual({ page: 0, main: 0 });
}

/** The section tabs must stay fully on screen and on top (the sticky Start bar once hid them on a phone). */
async function expectTabsOnScreen(page: Page): Promise<void> {
  const state = await page.evaluate(() => {
    const nav = document.querySelector('.nav')!;
    const r = nav.getBoundingClientRect();
    const link = nav.querySelector('a:last-child')!.getBoundingClientRect();
    const top = document.elementFromPoint(link.left + link.width / 2, link.top + link.height / 2);
    return { inside: r.top >= 0 && r.bottom <= window.innerHeight + 0.5 && r.right <= window.innerWidth + 0.5, onTop: !!top && nav.contains(top) };
  });
  expect(state, 'section tabs on screen and not covered').toEqual({ inside: true, onTop: true });
}

async function open(page: Page, hash = '#/practice'): Promise<void> {
  await page.goto(`./${hash}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** The builder's default deck: the 15 major key signature cards. */
const DECK_SIZE = 15;

async function startDefaultDeck(page: Page): Promise<void> {
  await page.getByRole('button', { name: `Start · ${DECK_SIZE} of ${DECK_SIZE} cards` }).click();
}

async function flip(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Show answer' }).click();
}

test('every section loads without errors or overflow', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page);
  for (const section of ['Practice', 'Explore', 'Progress', 'Settings']) {
    await page.getByRole('link', { name: section }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoOverflow(page);
    await expectTabsOnScreen(page);
  }
  expect(errors).toEqual([]);
});

test('a deck can be drilled to the summary', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page);
  await startDefaultDeck(page);
  for (let i = 0; i < DECK_SIZE; i++) {
    await flip(page);
    await expectNoOverflow(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session done' })).toBeVisible();
  await expect(page.locator('.summary-stats')).toContainText(`${DECK_SIZE} / ${DECK_SIZE}`);
  expect(errors).toEqual([]);
});

test('a missed card returns, and "Same deck again" restarts the chosen deck', async ({ page }) => {
  await open(page);
  await startDefaultDeck(page);
  await flip(page);
  await page.getByRole('button', { name: 'Missed it' }).click();
  // The other cards plus the missed one coming back.
  for (let i = 0; i < DECK_SIZE; i++) {
    await flip(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await expect(page.locator('.summary-stats')).toContainText(`${DECK_SIZE - 1} / ${DECK_SIZE}`);
  await page.getByRole('button', { name: 'Practice 1 missed card' }).click();
  await expect(page.locator('.drill-top')).toContainText('0 / 1');
  await flip(page);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Same deck again' }).click();
  await expect(page.locator('.drill-top')).toContainText(`0 / ${DECK_SIZE}`);
});

test('a drill in progress survives a reload', async ({ page }) => {
  await open(page);
  await startDefaultDeck(page);
  for (let i = 0; i < 3; i++) {
    await flip(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  const front = await page.locator('.flashcard-prompt').innerText();
  await page.reload();
  await expect(page.locator('.drill-top')).toContainText(`3 / ${DECK_SIZE}`);
  await expect(page.locator('.flashcard-prompt')).toHaveText(front);
});

test('the instrument picks the view, and the staff can be pinned', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '#/explore');
  await expect(page.locator('svg.keyboard')).toBeVisible();
  await expect(page.locator('svg.fretboard')).toHaveCount(0);

  for (const instrument of ['guitar', 'bass']) {
    await page.getByLabel('Instrument').selectOption(instrument);
    await expect(page.locator('svg.fretboard')).toBeVisible();
    await expect(page.locator('svg.keyboard')).toHaveCount(0);
    await expectNoOverflow(page);
  }

  await expect(page.locator('svg.staff')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pin staff' }).click();
  await expect(page.locator('svg.staff')).toBeVisible();
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test('card and view sit side by side only in wide landscape', async ({ page }) => {
  await open(page);
  await startDefaultDeck(page);
  await flip(page);
  const card = (await page.locator('.card-pane').boundingBox())!;
  const view = (await page.locator('.view-pane').boundingBox())!;
  const size = page.viewportSize()!;
  if (size.width >= 900 && size.width > size.height) {
    expect(view.x, 'view to the right of the card').toBeGreaterThanOrEqual(card.x + card.width);
  } else {
    expect(view.y, 'view below the card').toBeGreaterThanOrEqual(card.y + card.height);
  }
  await expectNoOverflow(page);
});

test('interval decks can start from G♯ (not only major key names)', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^Key signature/ }).click(); // off
  await page.getByRole('button', { name: /^Interval\b/ }).first().click(); // on
  await expect(page.getByRole('radiogroup', { name: 'Starting notes' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Start/ })).toContainText('of 221 cards'); // 17 roots × 13 intervals
  await expectNoOverflow(page);
});

test('layout holds with wider text (other system fonts, large text settings)', async ({ page }) => {
  await open(page);
  // Stand-in for a wider font: Linux and some Android fonts run wider than the ones we develop on.
  const widen = () => page.addStyleTag({ content: ':root { letter-spacing: 0.06em; }' });
  await widen();
  for (const section of ['Practice', 'Explore', 'Progress', 'Settings']) {
    await page.getByRole('link', { name: section }).click();
    await expectNoOverflow(page);
  }
  // The busiest screens: the builder with every option showing, a flipped card, and a fretboard.
  await page.getByRole('link', { name: 'Practice' }).click();
  for (const family of [/^Scale spelling/, /^Interval naming/]) await page.getByRole('button', { name: family }).click();
  await page.getByRole('radio', { name: 'Pick' }).click();
  await expectNoOverflow(page);
  await expectTabsOnScreen(page);
  // Scrolled to the very bottom, where the sticky Start bar sits against the tabs.
  await page.locator('.main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expectTabsOnScreen(page);
  await page.getByLabel('Instrument').selectOption('guitar');
  await page.getByRole('radio', { name: 'All', exact: true }).first().click(); // keys back to all
  await page.getByRole('button', { name: /^Start · / }).click();
  await flip(page);
  await expectNoOverflow(page);
  await page.getByRole('button', { name: 'Pin staff' }).click();
  await expectNoOverflow(page);
});

/* ---------- Sound (M4) ---------- */

/** Record the frequency of every oscillator the page starts, so tests can check what would sound. */
async function recordOscillators(page: Page): Promise<() => Promise<number[]>> {
  await page.addInitScript(() => {
    const started: number[] = [];
    (window as unknown as { __started: number[] }).__started = started;
    if (typeof OscillatorNode === 'undefined') return;
    // Keep every audio context the page makes, so a test can interrupt one as iOS does.
    const contexts: AudioContext[] = [];
    (window as unknown as { __contexts: AudioContext[] }).__contexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when?: number) {
      // Each note is several partials; only the lowest one of a group is the pitch that is heard.
      started.push(this.frequency.value);
      return start.call(this, when);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __started: number[] }).__started);
}

/** Playwright's WebKit for Windows is built without Web Audio; real Safari has it. */
async function skipWithoutAudio(page: Page): Promise<void> {
  const hasAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  test.skip(!hasAudio, 'this browser build has no Web Audio');
}

/** The notes heard: the first oscillator of every group of four partials a voice starts. */
const fundamentals = (started: number[], partialsPerNote = 4) => started.filter((_, i) => i % partialsPerNote === 0);

const near = (list: number[], hz: number) => list.some((f) => Math.abs(f - hz) < 0.5);

test('Play sounds the answer at the right pitches, and Stop ends it', async ({ page }) => {
  const errors = watchErrors(page);
  const started = await recordOscillators(page);
  await open(page, '#/explore'); // C major on the keyboard: C4 to C5
  await skipWithoutAudio(page);

  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  const keyboard = fundamentals(await started());
  expect(keyboard).toHaveLength(8);
  for (const hz of [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]) {
    expect(near(keyboard, hz), `keyboard plays ${hz} Hz`).toBe(true);
  }
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.getByRole('button', { name: '▶ Play' })).toBeVisible();

  // A-2: guitar sounds an octave lower than the keyboard placement (C3 to C4).
  await page.getByLabel('Instrument').selectOption('guitar');
  const before = (await started()).length;
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  const guitar = fundamentals((await started()).slice(before));
  expect(near(guitar, 130.81), 'guitar starts on C3').toBe(true);
  expect(near(guitar, 523.25), 'guitar does not reach C5').toBe(false);
  expect(errors).toEqual([]);
});

test('the drone holds the root, and the reference pitch retunes playback', async ({ page }) => {
  const started = await recordOscillators(page);
  await open(page, '#/settings');
  await skipWithoutAudio(page);
  await page.getByLabel('Reference pitch').fill('442');
  await page.getByLabel('Reference pitch').blur();
  await page.getByRole('link', { name: 'Explore' }).click();
  await page.getByRole('radio', { name: /^A\s*3♯/ }).click(); // A major: its A4 is the reference pitch

  await page.getByRole('button', { name: 'Drone' }).click();
  await expect.poll(async () => near(await started(), 110.5), { message: 'drone on A2 at A=442' }).toBe(true);

  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(async () => near(await started(), 442), { message: 'A4 plays at 442 Hz' }).toBe(true);
  expect(near(await started(), 440)).toBe(false);
});

test('Play is off until a card is flipped, and sound settings fit the screen', async ({ page }) => {
  await open(page);
  await startDefaultDeck(page);
  await expect(page.getByRole('button', { name: '▶ Play' })).toBeDisabled();
  await flip(page);
  const hasAudio = await page.evaluate(() => typeof AudioContext !== 'undefined');
  if (hasAudio) await expect(page.getByRole('button', { name: '▶ Play' })).toBeEnabled();
  await expectNoOverflow(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByLabel('Tempo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mic check' })).toBeVisible();
  await expectNoOverflow(page);
});

test('the mic check shows a note heard through the microphone', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium has a fake microphone to test with');
  await open(page, '#/settings');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('meter', { name: 'Input level' })).toBeVisible();
  // Chromium's fake microphone beeps only now and then, so allow time for one to be caught.
  await expect(page.locator('.mic-note')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('.mic-readout')).toContainText('Hz');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.mic-readout')).toContainText('Tap Start');
});

test('Play recovers after the audio is interrupted (iPad: leaving the tab or sleeping)', async ({ page }) => {
  const started = await recordOscillators(page);
  await open(page, '#/explore');
  await skipWithoutAudio(page);
  const contexts = () => page.evaluate(() => (window as unknown as { __contexts: AudioContext[] }).__contexts.length);

  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  await page.getByRole('button', { name: '■ Stop' }).click();
  expect(await contexts()).toBe(1);
  const before = (await started()).length;

  // What iOS does behind the page's back: the context stops running.
  await page.evaluate(() => (window as unknown as { __contexts: AudioContext[] }).__contexts[0]!.suspend());

  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  expect(await contexts(), 'a fresh audio context replaced the interrupted one').toBe(2);
  expect((await started()).length, 'notes were scheduled again').toBeGreaterThan(before);
  const running = await page.evaluate(() => (window as unknown as { __contexts: AudioContext[] }).__contexts[1]!.state);
  expect(running).toBe('running');
});
