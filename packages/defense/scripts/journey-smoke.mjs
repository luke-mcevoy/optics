/** Browser verification. Run against the dev server with Playwright installed, or set PLAYWRIGHT_MODULE. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.JOURNEY_URL ?? 'http://127.0.0.1:5200/';
const output = resolve(process.env.JOURNEY_SCREENSHOTS ?? '/private/tmp/quantum-basics');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT_AUTHORITY_INVALID')) errors.push(m.text()); });
  await page.goto(`${base}#/basics/0`, { waitUntil: 'networkidle' });
  await page.locator('.journey-canvas canvas').waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/00-machine.png` });
  assert.equal(await page.locator('canvas').count(), 1, 'only the active 3D scene mounts');
  await page.getByRole('button', { name: 'Step inside' }).click();
  await page.waitForURL('**/#/basics/1');
  await page.getByLabel('Move the light traps').fill('2.1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${output}/01-traps.png` });

  async function go(index) {
    await page.locator('.journey-chapters button').nth(index).click();
    await page.waitForURL(`**/#/basics/${index}`);
    await page.waitForTimeout(300);
  }
  await go(2);
  await page.getByLabel('Turn the light pulse').fill('180');
  assert.equal(await page.locator('.journey-probability output').nth(1).innerText(), '100%');
  await page.getByLabel('Turn the light pulse').fill('90');
  await page.screenshot({ path: `${output}/02-qubit.png` });
  await go(3);
  await page.getByLabel('Shift the second wave').fill('180');
  assert.equal(await page.locator('.journey-probability output').first().innerText(), '0%');
  await page.screenshot({ path: `${output}/03-interference.png` });
  // Keyboard arrows on a range must adjust that range rather than change chapters.
  await page.getByLabel('Shift the second wave').press('ArrowLeft');
  assert.match(page.url(), /basics\/3$/);
  assert.equal(await page.getByLabel('Shift the second wave').inputValue(), '179');

  await go(4);
  assert.deepEqual(await page.locator('.journey-probability output').allInnerTexts(), ['50%', '0%', '0%', '50%']);
  await page.getByRole('button', { name: 'Gate off Independent' }).click();
  assert.deepEqual(await page.locator('.journey-probability output').allInnerTexts(), ['50%', '0%', '50%', '0%']);
  await page.getByRole('button', { name: 'Gate on Entangled' }).click();
  await page.screenshot({ path: `${output}/04-entanglement.png` });
  await go(5);
  await page.getByRole('button', { name: 'Run 20', exact: true }).click();
  assert.match(await page.locator('.journey-shot-summary').innerText(), /20 preparations.*20 matching pairs/);
  assert.ok((await page.locator('.journey-shot').allInnerTexts()).every((s) => s === '00' || s === '11'));
  await page.screenshot({ path: `${output}/05-readout.png` });
  await page.getByRole('button', { name: 'Turn gate off & reset' }).click();
  assert.match(await page.locator('.journey-shot-summary').innerText(), /^0 preparations/);
  await page.getByRole('button', { name: 'Run 20', exact: true }).click();
  assert.ok((await page.locator('.journey-shot').allInnerTexts()).every((s) => s === '00' || s === '10'));
  await go(6);
  await page.getByRole('button', { name: 'Flip B', exact: true }).click();
  assert.deepEqual(await page.locator('.journey-syndromes b').allInnerTexts(), ['Different', 'Different']);
  await page.screenshot({ path: `${output}/06-correction.png` });
  await page.getByRole('button', { name: 'Repair' }).click();
  assert.deepEqual(await page.locator('.journey-syndromes b').allInnerTexts(), ['Same', 'Same']);
  assert.match(await page.locator('.journey-control-note').innerText(), /Pattern restored/);
  await page.getByText('Show the physics', { exact: false }).click();
  assert.match(await page.locator('.journey-physics').innerText(), /phase|Z errors/);

  // The automatic tour advances, and touching an experiment pauses it.
  await go(0);
  await page.clock.install();
  await page.getByRole('button', { name: 'Play guided tour' }).click();
  await page.clock.fastForward(16100);
  await page.waitForURL('**/#/basics/1');
  await page.getByLabel('Move the light traps').fill('1.2');
  await page.clock.fastForward(16100);
  assert.match(page.url(), /basics\/1$/);
  await page.clock.resume();

  // All original chapter and foundations URLs still work.
  await page.goto(`${base}#/guide`);
  await page.getByRole('heading', { name: 'How to build a quantum computer out of atoms', exact: true }).waitFor();
  await page.goto(`${base}#/foundations/qubit`);
  await page.getByRole('heading', { name: 'A qubit, physically', exact: true }).waitFor();

  // Mobile: range controls, chapter navigation and canvas must fit the viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}#/basics/0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: `${output}/mobile-machine.png`, fullPage: true });
  await go(3);
  await page.getByLabel('Shift the second wave').fill('180');
  assert.equal(await page.locator('.journey-probability output').first().innerText(), '0%');
  await page.screenshot({ path: `${output}/mobile-interference.png`, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.ok(await page.locator('.journey-skip').evaluate((el) => el.getBoundingClientRect().bottom < 0), 'the skip link is hidden until focused');

  // Losing a graphics context must leave the teaching controls usable, with a clear recovery action.
  await page.evaluate(() => {
    const canvas = document.querySelector('.journey-canvas canvas');
    const gl = canvas.getContext('webgl2');
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await page.getByRole('button', { name: 'Reload the 3D view' }).waitFor();
  await page.getByLabel('Shift the second wave').fill('0');
  assert.equal(await page.locator('.journey-probability output').first().innerText(), '100%');
  await page.getByRole('button', { name: 'Reload the 3D view' }).click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.journey-context-message').count(), 0);
  assert.deepEqual(errors, [], 'no browser or WebGL errors');
  console.log(`PASS: seven chapters, numerical controls, joint sampling, correction, original routes and mobile layout. Screenshots: ${output}`);
} finally {
  await browser.close();
}
