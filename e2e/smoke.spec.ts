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

async function open(page: Page, hash = '#/practice'): Promise<void> {
  await page.goto(`./${hash}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
  }
  expect(errors).toEqual([]);
});

test('the paper deck can be drilled to the summary', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page);
  await page.getByRole('button', { name: /Paper deck/ }).click();
  for (let i = 0; i < 14; i++) {
    await flip(page);
    await expectNoOverflow(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session done' })).toBeVisible();
  await expect(page.locator('.summary-stats')).toContainText('14 / 14');
  expect(errors).toEqual([]);
});

test('a missed card returns, and "Same deck again" restarts the chosen deck', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Paper deck/ }).click();
  await flip(page);
  await page.getByRole('button', { name: 'Missed it' }).click();
  // 13 other cards plus the missed one coming back.
  for (let i = 0; i < 14; i++) {
    await flip(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await expect(page.locator('.summary-stats')).toContainText('13 / 14');
  await page.getByRole('button', { name: 'Practice 1 missed card' }).click();
  await expect(page.locator('.drill-top')).toContainText('0 / 1');
  await flip(page);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Same deck again' }).click();
  await expect(page.locator('.drill-top')).toContainText('0 / 14');
});

test('a drill in progress survives a reload', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Paper deck/ }).click();
  for (let i = 0; i < 3; i++) {
    await flip(page);
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  const front = await page.locator('.flashcard-prompt').innerText();
  await page.reload();
  await expect(page.locator('.drill-top')).toContainText('3 / 14');
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
  await page.getByRole('button', { name: /Paper deck/ }).click();
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
