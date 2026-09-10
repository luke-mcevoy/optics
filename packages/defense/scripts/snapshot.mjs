/** Refresh the monorepo's embedded build; remove only obsolete Vite-generated assets. */
import { cp, readdir, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../dist/', import.meta.url);
const target = new URL('../../site/public/defense/', import.meta.url);
const index = await readFile(new URL('index.html', source), 'utf8');
if (!index.includes('./assets/')) throw new Error('Build with --base=./ before refreshing the portable snapshot');
const current = new Set(await readdir(new URL('assets/', source)));
const previous = await readdir(new URL('assets/', target)).catch((e) => {
  if (e.code === 'ENOENT') return [];
  throw e;
});
await cp(source, target, { recursive: true });
for (const filename of previous) {
  if (/^[\w.-]+-[\w-]{8}\.(?:js|css)$/.test(filename) && !current.has(filename)) {
    await unlink(new URL(`assets/${filename}`, target));
  }
}
console.log(`Updated embedded visualization: ${fileURLToPath(target)}`);
