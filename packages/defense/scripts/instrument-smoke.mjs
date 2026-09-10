import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.JOURNEY_URL ?? 'http://127.0.0.1:5200/';
const output = process.env.INSTRUMENT_SCREENSHOTS ?? '/private/tmp/harvard-instrument';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}#/instrument`, { waitUntil: 'networkidle' });
  await page.locator('.lab-viewport canvas').waitFor();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.lab-viewport canvas').count(), 1);
  // The default view waits at six real program milestones and names the physical path.
  const phases = ['Rearrange', 'Local single-qubit', 'parallel CZ', 'Spin → position', 'Image the readout', 'Re-cool'];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(300);
    assert.match(await page.locator('.lab-event-banner').innerText(), new RegExp(`EVENT ${i + 1} OF 6`));
    assert.equal(await page.locator('.lab-guide-pin').count(), 3);
    assert.ok((await page.locator('.lab-event-result').innerText()).length > 50);
    assert.ok((await page.locator('.stage-phase').textContent()).includes(phases[i]));
    assert.equal(await page.getByLabel('Scrub experimental sequence').count(), 0);
    if (i === 0 || i === 2 || i === 4) await page.screenshot({ path: `${output}/guided-${i}.png`, fullPage: true });
    if (i < 5) await page.getByRole('button', { name: 'Next event →', exact: true }).click();
  }
  assert.ok(await page.getByRole('link', { name: 'See the paper’s error-correction result →' }).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.lab-subsystems > button').first().click();
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: `${output}/mobile-guided.png`, fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  await page.locator('.lab-subsystems > button').first().click();
  await page.screenshot({ path: `${output}/whole-table.png`, fullPage: true });
  const controls = page.getByLabel('Scrub experimental sequence');
  // One program drives all scales: moving the camera must preserve a paused event.
  await controls.fill('495');
  await page.waitForTimeout(200);
  assert.match(await page.locator('.lab-sequence output').innerText(), /parallel CZ/);
  await page.getByRole('button', { name: 'Into the atoms ↗', exact: true }).click();
  await page.waitForTimeout(700);
  assert.equal(await controls.inputValue(), '495');
  assert.match(await page.locator('.lab-scale-note').innerText(), /MAGNIFIED/);
  await page.screenshot({ path: `${output}/atoms-entangling.png`, fullPage: true });
  await page.getByRole('button', { name: 'Whole table', exact: true }).click();
  assert.equal(await controls.inputValue(), '495');
  // Real apparatus controls retain the original detailed explanation at every stop.
  for (let i = 0; i < 9; i++) {
    await page.locator('.lab-subsystems > button').nth(i).click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.lab-subsystems > button').nth(i).getAttribute('aria-pressed'), 'true');
    assert.ok((await page.locator('.lab-inspector h2').innerText()).length > 15);
    assert.equal(await page.locator('.lab-cause > div').count(), 3);
    assert.ok((await page.locator('.lab-deeper p').textContent()).length > 300);
    if (i === 1 || i === 3 || i === 5 || i === 7) {
      await controls.fill(String([0, 250, 0, 440, 0, 700, 0, 495][i]));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${output}/subsystem-${i}.png`, fullPage: true });
    }
  }
  await controls.fill('700');
  await page.waitForTimeout(200);
  assert.match(await page.locator('.lab-sequence output').innerText(), /Image the readout/);
  await page.getByRole('button', { name: 'Labels off', exact: true }).click();
  assert.ok(await page.locator('.lab-viewport .callout').count() > 0);
  await page.getByRole('button', { name: 'Labels on', exact: true }).click();
  assert.equal(await page.locator('.lab-viewport .callout').count(), 0);
  await page.getByRole('button', { name: 'Control signals +', exact: true }).click();
  await page.locator('.rack-timeline').waitFor();
  await page.getByRole('button', { name: '▷ Play sequence', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('[aria-label="Scrub experimental sequence"]').value) > 700, null, { timeout: 15000 });
  await page.getByRole('button', { name: 'Ⅱ Pause sequence', exact: true }).click();
  const paused = await controls.inputValue();
  await page.waitForTimeout(250);
  assert.equal(await controls.inputValue(), paused);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: `${output}/mobile-inspection.png`, fullPage: true });
  // The original guide is once again the default entrance.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'How to build a quantum computer out of atoms', exact: true }).waitFor();
  await page.locator('.hero .instrument-open').click();
  await page.getByRole('heading', { name: 'Inside the instrument', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`PASS: six guided events, numbered paths, program milestones, original guide, nine free views, sequence across scales, physics, labels, playback, control signals, mobile. Screenshots: ${output}`);
} finally { await browser.close(); }
